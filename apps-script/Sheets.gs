/**
 * Sheets.gs — Capa de acceso al Google Sheet
 *
 * Wrapper sobre SpreadsheetApp para hacer operaciones tipo SQL:
 * - findOne, findMany, findAll
 * - insert, update, delete
 *
 * Cachea la apertura del Sheet por ejecución para reducir tiempo.
 */

const Sheets = (function() {
  let cachedSpreadsheet = null;
  const cachedSheets = {};

  function getSpreadsheet() {
    if (!cachedSpreadsheet) {
      const id = getConfig('SHEET_ID', SHEET_ID);
      cachedSpreadsheet = SpreadsheetApp.openById(id);
    }
    return cachedSpreadsheet;
  }

  function getSheet(tabName) {
    if (!cachedSheets[tabName]) {
      const sheet = getSpreadsheet().getSheetByName(tabName);
      if (!sheet) throw new Error(`Pestaña no encontrada: ${tabName}`);
      cachedSheets[tabName] = sheet;
    }
    return cachedSheets[tabName];
  }

  function getHeaders(sheet) {
    return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map(h => String(h).trim());
  }

  function rowToObject(row, headers) {
    const obj = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = row[i];
    });
    return obj;
  }

  function objectToRow(obj, headers) {
    return headers.map(h => obj[h] !== undefined ? obj[h] : '');
  }

  function matches(record, filter) {
    return Object.keys(filter).every(key => {
      const expected = filter[key];
      const actual = record[key];
      if (Array.isArray(expected)) return expected.includes(actual);
      return actual === expected;
    });
  }

  return {
    /**
     * Devuelve todos los registros de una pestaña como array de objetos.
     */
    getAll(tabName) {
      const sheet = getSheet(tabName);
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return [];

      const headers = getHeaders(sheet);
      const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
      return data.map(row => rowToObject(row, headers));
    },

    /**
     * Busca un solo registro que cumpla con el filtro.
     */
    findOne(tabName, filter) {
      return this.getAll(tabName).find(r => matches(r, filter)) || null;
    },

    /**
     * Devuelve todos los registros que cumplan el filtro.
     */
    findMany(tabName, filter) {
      return this.getAll(tabName).filter(r => matches(r, filter));
    },

    /**
     * Inserta un registro nuevo. Auto-genera ID si no lo tiene.
     */
    insert(tabName, record) {
      const sheet = getSheet(tabName);
      const headers = getHeaders(sheet);

      // Auto-generar ID si la primera columna empieza con "id_"
      const idColumn = headers[0];
      if (idColumn.startsWith('id_') && !record[idColumn]) {
        record[idColumn] = generateId(tabName);
      }

      // Auto-rellenar created_at si existe la columna
      if (headers.includes('created_at') && !record.created_at) {
        record.created_at = new Date();
      }

      const row = objectToRow(record, headers);
      sheet.appendRow(row);

      Logs.audit('insert', tabName, record[idColumn]);
      return record;
    },

    /**
     * Actualiza un registro que coincida con el filtro.
     */
    update(tabName, filter, updates) {
      const sheet = getSheet(tabName);
      const headers = getHeaders(sheet);
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return null;

      const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

      for (let i = 0; i < data.length; i++) {
        const record = rowToObject(data[i], headers);
        if (matches(record, filter)) {
          // Actualizar campos
          Object.keys(updates).forEach(key => {
            const colIndex = headers.indexOf(key);
            if (colIndex >= 0) {
              sheet.getRange(i + 2, colIndex + 1).setValue(updates[key]);
            }
          });

          // Auto-actualizar updated_at si existe
          const updatedAtIdx = headers.indexOf('updated_at');
          if (updatedAtIdx >= 0) {
            sheet.getRange(i + 2, updatedAtIdx + 1).setValue(new Date());
          }

          Logs.audit('update', tabName, record[headers[0]]);
          return Object.assign(record, updates);
        }
      }
      return null;
    },

    /**
     * Marca un registro como eliminado (soft delete) o lo borra realmente.
     */
    softDelete(tabName, filter) {
      return this.update(tabName, filter, { estado: 'eliminado', deleted_at: new Date() });
    }
  };
})();

/**
 * Genera un ID único para un nuevo registro de una pestaña.
 * Formato: PREFIJO-NNNNN (ej: PAC-00042, SOL-00084)
 */
function generateId(tabName) {
  const prefixes = {
    [TABS.PACIENTES]:      'PAC',
    [TABS.SOL_MEDICAS]:    'SOL',
    [TABS.SOL_PROGRAMA]:   'SPG',
    [TABS.PAGOS]:          'PAG',
    [TABS.CICLOS]:         'CIC',
    [TABS.TAREAS]:         'TAR',
    [TABS.INCIDENCIAS]:    'INC',
    [TABS.SEG_LP]:         'LP',
    [TABS.MICRODOSIF]:     'MIC',
    [TABS.REPROG]:         'RPR',
    [TABS.MENSAJES]:       'MSG',
    [TABS.COLA_MENSAJES]:  'CMS',
    [TABS.HIST_ENVIOS]:    'HEN',
    [TABS.RESPUESTAS]:     'RES',
    [TABS.RECORDATORIOS]:  'REC',
    [TABS.CAMPANAS]:       'CMP'
  };

  const prefix = prefixes[tabName] || 'GEN';
  const all = Sheets.getAll(tabName);
  const next = (all.length + 1).toString().padStart(5, '0');
  return `${prefix}-${next}`;
}

/**
 * Logs de auditoría — toda escritura queda registrada en _AUDIT_LOG
 */
const Logs = {
  audit(action, tab, recordId, details) {
    try {
      const sheet = SpreadsheetApp.openById(getConfig('SHEET_ID', SHEET_ID))
        .getSheetByName(TABS.AUDIT_LOG);
      if (!sheet) return;

      sheet.appendRow([
        new Date(),
        Session.getActiveUser().getEmail(),
        action,
        tab,
        recordId || '',
        JSON.stringify(details || {})
      ]);
    } catch (e) {
      Logger.log('Audit log failed: ' + e.message);
    }
  }
};
