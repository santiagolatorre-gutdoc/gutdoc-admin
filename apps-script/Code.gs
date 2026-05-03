/**
 * Code.gs — Entrada principal del Web App
 *
 * Sirve dos cosas:
 * 1. doGet(): muestra la app HTML (si decides servirla desde Apps Script en lugar de GitHub Pages)
 * 2. doPost(): recibe llamadas REST del frontend → enruta a API.gs
 *
 * El frontend en GitHub Pages llama a doPost vía fetch() con el endpoint deseado.
 */

function doGet(e) {
  // Si sirves la app desde Apps Script en lugar de GitHub Pages, descomenta:
  // return HtmlService.createTemplateFromFile('index').evaluate()
  //   .setTitle('GutDoc Admin')
  //   .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', service: 'gutdoc-admin', version: '1.0' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const params = payload.params || {};

    if (!action) {
      return jsonResponse({ error: 'Missing action parameter' }, 400);
    }

    // Validar autenticación (excepto para 'auth.checkSession')
    if (action !== 'auth.checkSession') {
      const user = Auth.getCurrentUser();
      if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
      params._user = user;
    }

    // Enrutar al handler correspondiente
    const handler = API[action];
    if (!handler || typeof handler !== 'function') {
      return jsonResponse({ error: `Unknown action: ${action}` }, 404);
    }

    const result = handler(params);
    return jsonResponse({ data: result });

  } catch (err) {
    Logger.log('doPost error: ' + err.toString() + '\n' + err.stack);
    return jsonResponse({ error: err.message }, 500);
  }
}

function jsonResponse(data, statusCode) {
  // Apps Script no permite setear statusCode en ContentService directamente,
  // pero el frontend puede leer data.error para detectar errores
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helper para incluir HTMLs si sirves desde Apps Script
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
