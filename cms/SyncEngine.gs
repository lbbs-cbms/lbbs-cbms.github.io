/**
 * ============================================================================
 * LBBS - Google Sheets Headless CMS Synchronization Engine (Model B)
 * ============================================================================
 * Script para vincular la hoja de cálculo institucional de Google Sheets
 * con el repositorio GitHub Pages del LBBS (https://lbbs-cbms.github.io).
 *
 * Permite a los investigadores y editores autorizados actualizar:
 * 1. Nuestro Equipo (data/equipo.json)
 * 2. Últimas Publicaciones (data/publicaciones.json)
 * 3. Novedades y Convocatorias (data/novedades.json)
 *
 * Modelo de Seguridad en 5 Capas:
 * 1. Acceso a Google Drive restringido a cuentas institucionales autorizadas.
 * 2. Moderación por celdas protegidas (Estados: publicado, borrador, archivado).
 * 3. Lista blanca de correos autorizados para ejecutar la sincronización.
 * 4. Aislamiento del GitHub PAT en ScriptProperties (nunca en celdas ni cliente).
 * 5. Token Fine-Grained de mínimo privilegio acotado estrictamente a este repositorio.
 */

/**
 * Hook de inicio: Agrega el menú personalizado al abrir la hoja de cálculo
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🌱 LBBS - Gestión Web')
    .addItem('👥 Publicar Nuestro Equipo', 'publicarEquipo')
    .addItem('📚 Publicar Últimas Publicaciones', 'publicarPublicaciones')
    .addItem('📢 Publicar Novedades', 'publicarNovedades')
    .addSeparator()
    .addItem('🔄 Sincronizar Todo (Equipo, Papers y Novedades)', 'sincronizarTodo')
    .addToUi();
}

/**
 * Obtiene la configuración segura desde ScriptProperties
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GITHUB_PAT');
  const owner = props.getProperty('GITHUB_OWNER') || 'lbbs-cbms';
  const repo = props.getProperty('GITHUB_REPO') || 'lbbs-cbms.github.io';
  const branch = props.getProperty('GITHUB_BRANCH') || 'main';

  if (!token) {
    throw new Error('Configure GITHUB_PAT en Extensiones > Apps Script > Configuración del proyecto > Propiedades de la secuencia de comandos.');
  }

  return { token, owner, repo, branch };
}

/**
 * Valida si el usuario activo pertenece a la lista blanca de publicadores
 */
function validarUsuarioAutorizado() {
  const emailUsuario = Session.getActiveUser().getEmail().toLowerCase();
  const props = PropertiesService.getScriptProperties();
  const whitelistRaw = props.getProperty('WHITELIST_EMAILS') || '';
  const whitelist = whitelistRaw.split(',').map(e => e.trim().toLowerCase()).filter(e => e.length > 0);

  if (whitelist.length > 0 && !whitelist.includes(emailUsuario)) {
    throw new Error(`El usuario ${emailUsuario} no tiene permisos para publicar en la web oficial del LBBS.`);
  }
  return emailUsuario;
}

/**
 * Consulta el archivo en GitHub (GET) para obtener el SHA actual (control de concurrencia)
 */
function getGitHubFile(filePath) {
  const cfg = getConfig();
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}?ref=${cfg.branch}`;

  const options = {
    method: 'get',
    headers: {
      'Authorization': `Bearer ${cfg.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'LBBS-Sheets-CMS/1.0'
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const status = response.getResponseCode();

  if (status === 200) {
    const data = JSON.parse(response.getContentText());
    return {
      exists: true,
      sha: data.sha
    };
  } else if (status === 404) {
    return { exists: false, sha: null };
  } else {
    throw new Error(`Error al consultar GitHub (${status}): ${response.getContentText()}`);
  }
}

/**
 * Commitea y actualiza un archivo en GitHub vía REST API (PUT)
 */
function commitGitHubFile(filePath, jsonContent, commitMessage, currentSha) {
  const cfg = getConfig();
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}`;

  const encodedContent = Utilities.base64Encode(jsonContent, Utilities.Charset.UTF_8);

  const payload = {
    message: commitMessage,
    content: encodedContent,
    branch: cfg.branch
  };

  if (currentSha) {
    payload.sha = currentSha;
  }

  const options = {
    method: 'put',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${cfg.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'LBBS-Sheets-CMS/1.0'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const status = response.getResponseCode();

  if (status !== 200 && status !== 201) {
    throw new Error(`Error al commitear en GitHub (${status}): ${response.getContentText()}`);
  }

  return JSON.parse(response.getContentText());
}

// ============================================================================
// Funciones de Transformación de Contenido
// ============================================================================

/**
 * Lee la pestaña "Equipo" y retorna el JSON estructurado
 */
function extractEquipoFromSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Equipo');
  if (!sheet) throw new Error('No se encontró la pestaña "Equipo" en la hoja.');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const rows = data.slice(1);
  const items = [];

  rows.forEach((row, idx) => {
    const rowObj = {};
    headers.forEach((h, colIdx) => {
      rowObj[h] = row[colIdx];
    });

    if (rowObj.nombre && String(rowObj.nombre).trim().length > 0) {
      items.push({
        id: parseInt(rowObj.id, 10) || (idx + 1),
        nombre: String(rowObj.nombre).trim(),
        rol_es: String(rowObj.rol_es || rowObj.rol || '').trim(),
        rol_en: String(rowObj.rol_en || rowObj.rol_es || '').trim(),
        categoria: String(rowObj.categoria || 'investigador').trim().toLowerCase(),
        foto: String(rowObj.foto || 'imgs/equipo/avatar-default.svg').trim(),
        email: String(rowObj.email || '').trim(),
        perfil_url: String(rowObj.perfil_url || '').trim(),
        orden: parseInt(rowObj.orden, 10) || (idx + 1)
      });
    }
  });

  return items;
}

/**
 * Lee la pestaña "Publicaciones" y retorna el JSON estructurado
 */
function extractPublicacionesFromSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Publicaciones');
  if (!sheet) throw new Error('No se encontró la pestaña "Publicaciones" en la hoja.');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const rows = data.slice(1);
  const items = [];

  rows.forEach((row, idx) => {
    const rowObj = {};
    headers.forEach((h, colIdx) => {
      rowObj[h] = row[colIdx];
    });

    if (rowObj.titulo_es && String(rowObj.titulo_es).trim().length > 0) {
      items.push({
        id: parseInt(rowObj.id, 10) || (idx + 1),
        titulo_es: String(rowObj.titulo_es).trim(),
        titulo_en: String(rowObj.titulo_en || rowObj.titulo_es).trim(),
        autores: String(rowObj.autores || '').trim(),
        revista: String(rowObj.revista || '').trim(),
        anio: parseInt(rowObj.anio, 10) || new Date().getFullYear(),
        resumen_es: String(rowObj.resumen_es || '').trim(),
        resumen_en: String(rowObj.resumen_en || rowObj.resumen_es).trim(),
        doi_url: String(rowObj.doi_url || '').trim(),
        color_destacado: String(rowObj.color_destacado || 'verde-salvia').trim().toLowerCase(),
        orden: parseInt(rowObj.orden, 10) || (idx + 1)
      });
    }
  });

  return items;
}

/**
 * Lee la pestaña "Novedades" y retorna el JSON estructurado
 */
function extractNovedadesFromSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Novedades');
  if (!sheet) throw new Error('No se encontró la pestaña "Novedades" en la hoja.');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const rows = data.slice(1);
  const items = [];

  rows.forEach((row, idx) => {
    const rowObj = {};
    headers.forEach((h, colIdx) => {
      rowObj[h] = row[colIdx];
    });

    const estado = String(rowObj.estado || 'publicado').trim().toLowerCase();
    if (rowObj.titulo_es && String(rowObj.titulo_es).trim().length > 0 && estado === 'publicado') {
      let fechaFormatted = rowObj.fecha;
      if (fechaFormatted instanceof Date) {
        fechaFormatted = Utilities.formatDate(fechaFormatted, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      } else {
        fechaFormatted = String(fechaFormatted).trim();
      }

      items.push({
        id: parseInt(rowObj.id, 10) || (idx + 1),
        tipo: String(rowObj.tipo || 'noticia').trim().toLowerCase(),
        titulo_es: String(rowObj.titulo_es).trim(),
        titulo_en: String(rowObj.titulo_en || rowObj.titulo_es).trim(),
        fecha: fechaFormatted,
        resumen_es: String(rowObj.resumen_es || '').trim(),
        resumen_en: String(rowObj.resumen_en || rowObj.resumen_es).trim(),
        imagen: String(rowObj.imagen || 'imgs/hero/hero-lab.jpg').trim(),
        enlace_url: String(rowObj.enlace_url || '').trim(),
        estado: 'publicado',
        orden: parseInt(rowObj.orden, 10) || (idx + 1)
      });
    }
  });

  return items;
}

// ============================================================================
// Funciones de Disparo de Publicación
// ============================================================================

function publicarEquipo() {
  const ui = SpreadsheetApp.getUi();
  try {
    const user = validarUsuarioAutorizado();
    const items = extractEquipoFromSheet();
    const jsonContent = JSON.stringify(items, null, 2);
    const gitInfo = getGitHubFile('data/equipo.json');
    const msg = `content(equipo): update team roster from Google Sheets by ${user}`;

    commitGitHubFile('data/equipo.json', jsonContent, msg, gitInfo.sha);
    ui.alert('✅ Éxito', `Se publicaron ${items.length} integrantes del equipo en la web del LBBS.`, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('❌ Error', e.message, ui.ButtonSet.OK);
  }
}

function publicarPublicaciones() {
  const ui = SpreadsheetApp.getUi();
  try {
    const user = validarUsuarioAutorizado();
    const items = extractPublicacionesFromSheet();
    const jsonContent = JSON.stringify(items, null, 2);
    const gitInfo = getGitHubFile('data/publicaciones.json');
    const msg = `content(pubs): update scientific publications from Google Sheets by ${user}`;

    commitGitHubFile('data/publicaciones.json', jsonContent, msg, gitInfo.sha);
    ui.alert('✅ Éxito', `Se publicaron ${items.length} publicaciones científicas en la web del LBBS.`, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('❌ Error', e.message, ui.ButtonSet.OK);
  }
}

function publicarNovedades() {
  const ui = SpreadsheetApp.getUi();
  try {
    const user = validarUsuarioAutorizado();
    const items = extractNovedadesFromSheet();
    const jsonContent = JSON.stringify(items, null, 2);
    const gitInfo = getGitHubFile('data/novedades.json');
    const msg = `content(news): update news and activities from Google Sheets by ${user}`;

    commitGitHubFile('data/novedades.json', jsonContent, msg, gitInfo.sha);
    ui.alert('✅ Éxito', `Se publicaron ${items.length} novedades activas en la web del LBBS.`, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('❌ Error', e.message, ui.ButtonSet.OK);
  }
}

function sincronizarTodo() {
  const ui = SpreadsheetApp.getUi();
  try {
    const user = validarUsuarioAutorizado();
    
    // 1. Equipo
    const equipo = extractEquipoFromSheet();
    const infoEquipo = getGitHubFile('data/equipo.json');
    commitGitHubFile('data/equipo.json', JSON.stringify(equipo, null, 2), `content(equipo): sync team roster by ${user}`, infoEquipo.sha);

    // 2. Publicaciones
    const pubs = extractPublicacionesFromSheet();
    const infoPubs = getGitHubFile('data/publicaciones.json');
    commitGitHubFile('data/publicaciones.json', JSON.stringify(pubs, null, 2), `content(pubs): sync publications by ${user}`, infoPubs.sha);

    // 3. Novedades
    const news = extractNovedadesFromSheet();
    const infoNews = getGitHubFile('data/novedades.json');
    commitGitHubFile('data/novedades.json', JSON.stringify(news, null, 2), `content(news): sync news by ${user}`, infoNews.sha);

    ui.alert('🎉 Sincronización Completa', `Se sincronizaron con éxito:\n• ${equipo.length} miembros del equipo\n• ${pubs.length} publicaciones\n• ${news.length} novedades\n\nEl sitio web se actualizará automáticamente en GitHub Pages en los próximos segundos.`, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('❌ Error en Sincronización', e.message, ui.ButtonSet.OK);
  }
}
