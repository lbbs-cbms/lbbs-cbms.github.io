/**
 * ============================================================================
 * LBBS - Google Sheets Headless CMS Synchronization Engine (Model B)
 * ============================================================================
 * Script para vincular la hoja de cálculo institucional de Google Sheets
 * con el repositorio GitHub Pages del LBBS (https://lbbs-cbms.github.io).
 *
 * Módulos administrables por investigadores y editores autorizados:
 * 1. Nuestro Equipo (data/equipo.json)
 * 2. Colaboradores Científicos (data/colaboradores.json)
 * 3. Ex-integrantes por Categoría (data/ex-integrantes.json)
 * 4. Líneas de Investigación (data/lineas-investigacion.json y translations.json)
 * 5. Servicios Institucionales (data/servicios.json y translations.json)
 * 6. Publicaciones Científicas (data/publicaciones.json)
 * 7. Novedades y Convocatorias (data/novedades.json)
 *
 * Manejo Bilingüe (Español / Inglés):
 * Todas las tablas poseen celdas paralelas (ej. titulo_es / titulo_en,
 * rol_es / rol_en, descripcion_es / descripcion_en, afiliacion_es / afiliacion_en)
 * garantizando la sincronización con los selectores de idioma del frontend.
 *
 * Modelo de Seguridad en 5 Capas:
 * 1. Acceso a Google Drive restringido a cuentas institucionales autorizadas.
 * 2. Moderación por celdas protegidas (Estados: publicado, borrador, archivado).
 * 3. Lista blanca de correos autorizados para ejecutar la sincronización.
 * 4. Aislamiento del GitHub PAT en ScriptProperties (nunca en celdas ni cliente).
 * 5. Token Fine-Grained de mínimo privilegio acotado estrictamente a este repositorio.
 */

// ============================================================================
// 1. Menú de Inicio y Configuración de Conexión
// ============================================================================

/**
 * Hook de inicio: Agrega el menú personalizado al abrir la hoja de cálculo
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🌱 LBBS - Gestión Web')
    .addItem('👥 Publicar Nuestro Equipo', 'publicarEquipo')
    .addItem('🤝 Publicar Colaboradores', 'publicarColaboradores')
    .addItem('🎓 Publicar Ex-integrantes', 'publicarExIntegrantes')
    .addItem('🔬 Publicar Líneas de Investigación', 'publicarLineasInvestigacion')
    .addItem('⚙️ Publicar Servicios', 'publicarServicios')
    .addItem('📚 Publicar Publicaciones Científicas', 'publicarPublicaciones')
    .addItem('📢 Publicar Novedades', 'publicarNovedades')
    .addSeparator()
    .addItem('🔄 Sincronizar Todo (Equipo, Colab, Ex, Líneas, Serv, Papers, News)', 'sincronizarTodo')
    .addSeparator()
    .addItem('📋 Generar / Formatear Plantillas de Hojas', 'generarPlantillasHojas')
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
 * Consulta un archivo en GitHub (GET) para obtener su contenido y SHA actual
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
      'User-Agent': 'LBBS-Sheets-CMS/2.0'
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const status = response.getResponseCode();

  if (status === 200) {
    const data = JSON.parse(response.getContentText());
    let decodedContent = null;
    if (data.content) {
      decodedContent = Utilities.newBlob(Utilities.base64Decode(data.content, Utilities.Charset.UTF_8)).getDataAsString('utf-8');
    }
    return {
      exists: true,
      sha: data.sha,
      content: decodedContent
    };
  } else if (status === 404) {
    return { exists: false, sha: null, content: null };
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
      'User-Agent': 'LBBS-Sheets-CMS/2.0'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const status = response.getResponseCode();

  if (status !== 200 && status !== 201) {
    throw new Error(`Error al commitear en GitHub (${status}) en ${filePath}: ${response.getContentText()}`);
  }

  return JSON.parse(response.getContentText());
}

// ============================================================================
// 2. Funciones de Extracción y Transformación de Contenidos Bilingües
// ============================================================================

/**
 * Lee la pestaña "Equipo" y retorna el JSON estructurado con campos bilingües
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
        rol_en: String(rowObj.rol_en || rowObj.rol_es || rowObj.rol || '').trim(),
        titulo_es: String(rowObj.titulo_es || rowObj.titulo || '').trim(),
        titulo_en: String(rowObj.titulo_en || rowObj.titulo_es || rowObj.titulo || '').trim(),
        categoria: String(rowObj.categoria || 'investigador').trim().toLowerCase(),
        foto: String(rowObj.foto || 'imgs/equipo/avatar-default.svg').trim(),
        email: String(rowObj.email || '').trim(),
        perfil_url: String(rowObj.perfil_url || '').trim(),
        descripcion_es: String(rowObj.descripcion_es || rowObj.bio_es || '').trim(),
        descripcion_en: String(rowObj.descripcion_en || rowObj.descripcion_es || rowObj.bio_en || '').trim(),
        orden: parseInt(rowObj.orden, 10) || (idx + 1)
      });
    }
  });

  return items;
}

/**
 * Lee la pestaña "Colaboradores" y retorna el JSON estructurado
 */
function extractColaboradoresFromSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Colaboradores');
  if (!sheet) throw new Error('No se encontró la pestaña "Colaboradores" en la hoja.');

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

    if (rowObj.titulo && String(rowObj.titulo).trim().length > 0) {
      items.push({
        id: parseInt(rowObj.id, 10) || (idx + 1),
        titulo: String(rowObj.titulo).trim(),
        afiliacion_es: String(rowObj.afiliacion_es || rowObj.afiliacion || '').trim(),
        afiliacion_en: String(rowObj.afiliacion_en || rowObj.afiliacion_es || rowObj.afiliacion || '').trim(),
        orden: parseInt(rowObj.orden, 10) || (idx + 1)
      });
    }
  });

  return items;
}

/**
 * Lee la pestaña "ExIntegrantes" y genera la estructura agrupada por categorías
 */
function extractExIntegrantesFromSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ExIntegrantes') ||
                SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Ex_Integrantes');
  if (!sheet) throw new Error('No se encontró la pestaña "ExIntegrantes" en la hoja.');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const rows = data.slice(1);
  const categoriesMap = new Map();

  rows.forEach((row, idx) => {
    const rowObj = {};
    headers.forEach((h, colIdx) => {
      rowObj[h] = row[colIdx];
    });

    const catId = String(rowObj.categoria_id || 'otros').trim().toLowerCase();
    const catEs = String(rowObj.categoria_es || 'Otras Contribuciones').trim();
    const catEn = String(rowObj.categoria_en || catEs).trim();
    const nombre = String(rowObj.nombre || '').trim();

    if (nombre.length > 0) {
      if (!categoriesMap.has(catId)) {
        categoriesMap.set(catId, {
          id: catId,
          categoria_es: catEs,
          categoria_en: catEn,
          integrantes: []
        });
      }

      categoriesMap.get(catId).integrantes.push({
        id: parseInt(rowObj.id, 10) || (idx + 1),
        nombre: nombre,
        descripcion_es: String(rowObj.descripcion_es || '').trim(),
        descripcion_en: String(rowObj.descripcion_en || rowObj.descripcion_es || '').trim()
      });
    }
  });

  return Array.from(categoriesMap.values());
}

/**
 * Lee la pestaña "LineasInvestigacion" y retorna el JSON estructurado
 */
function extractLineasInvestigacionFromSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('LineasInvestigacion') ||
                SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Investigacion');
  if (!sheet) throw new Error('No se encontró la pestaña "LineasInvestigacion" en la hoja.');

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
        descripcion_es: String(rowObj.descripcion_es || '').trim(),
        descripcion_en: String(rowObj.descripcion_en || rowObj.descripcion_es || '').trim(),
        icono: String(rowObj.icono || 'imgs/icons/sprout.svg').trim(),
        orden: parseInt(rowObj.orden, 10) || (idx + 1)
      });
    }
  });

  return items;
}

/**
 * Lee la pestaña "Servicios" y retorna el JSON estructurado
 */
function extractServiciosFromSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Servicios');
  if (!sheet) throw new Error('No se encontró la pestaña "Servicios" en la hoja.');

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
        descripcion_es: String(rowObj.descripcion_es || '').trim(),
        descripcion_en: String(rowObj.descripcion_en || rowObj.descripcion_es || '').trim(),
        icono: String(rowObj.icono || 'imgs/icons/microscope.svg').trim(),
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
 * Lee la pestaña "Novedades" y retorna el JSON estructurado (sólo filas en estado 'publicado')
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

/**
 * Actualiza opcionalmente las claves dinámicas en data/translations.json
 */
function syncTranslationsDictionary(lines, services, user) {
  try {
    const fileInfo = getGitHubFile('data/translations.json');
    if (!fileInfo.exists || !fileInfo.content) return;

    const tr = JSON.parse(fileInfo.content);

    if (lines && lines.length > 0) {
      tr.es = tr.es || {};
      tr.en = tr.en || {};
      tr.es.research = tr.es.research || { title: "Líneas de Investigación" };
      tr.en.research = tr.en.research || { title: "Research Lines" };

      lines.forEach((l, idx) => {
        const num = idx + 1;
        tr.es.research[`line${num}_title`] = l.titulo_es;
        tr.es.research[`line${num}_desc`] = l.descripcion_es;
        tr.en.research[`line${num}_title`] = l.titulo_en || l.titulo_es;
        tr.en.research[`line${num}_desc`] = l.descripcion_en || l.descripcion_es;
      });
    }

    if (services && services.length > 0) {
      tr.es.services = tr.es.services || { title: "Servicios" };
      tr.en.services = tr.en.services || { title: "Services" };

      services.forEach((s, idx) => {
        const num = idx + 1;
        tr.es.services[`s${num}_title`] = s.titulo_es;
        tr.es.services[`s${num}_desc`] = s.descripcion_es;
        tr.en.services[`s${num}_title`] = s.titulo_en || s.titulo_es;
        tr.en.services[`s${num}_desc`] = s.descripcion_en || s.descripcion_es;
      });
    }

    commitGitHubFile('data/translations.json', JSON.stringify(tr, null, 2), `content(i18n): update research & services translations by ${user}`, fileInfo.sha);
  } catch (err) {
    Logger.log('Aviso al sincronizar translations.json: ' + err.message);
  }
}

// ============================================================================
// 3. Funciones de Disparo de Publicación Individual
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

function publicarColaboradores() {
  const ui = SpreadsheetApp.getUi();
  try {
    const user = validarUsuarioAutorizado();
    const items = extractColaboradoresFromSheet();
    const jsonContent = JSON.stringify(items, null, 2);
    const gitInfo = getGitHubFile('data/colaboradores.json');
    const msg = `content(colaboradores): update scientific collaborators by ${user}`;

    commitGitHubFile('data/colaboradores.json', jsonContent, msg, gitInfo.sha);
    ui.alert('✅ Éxito', `Se publicaron ${items.length} colaboradores científicos en la web del LBBS.`, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('❌ Error', e.message, ui.ButtonSet.OK);
  }
}

function publicarExIntegrantes() {
  const ui = SpreadsheetApp.getUi();
  try {
    const user = validarUsuarioAutorizado();
    const items = extractExIntegrantesFromSheet();
    const totalPersonas = items.reduce((acc, cat) => acc + (cat.integrantes ? cat.integrantes.length : 0), 0);
    const jsonContent = JSON.stringify(items, null, 2);
    const gitInfo = getGitHubFile('data/ex-integrantes.json');
    const msg = `content(ex-integrantes): update categorized alumni by ${user}`;

    commitGitHubFile('data/ex-integrantes.json', jsonContent, msg, gitInfo.sha);
    ui.alert('✅ Éxito', `Se publicaron ${totalPersonas} ex-integrantes en ${items.length} categorías en la web del LBBS.`, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('❌ Error', e.message, ui.ButtonSet.OK);
  }
}

function publicarLineasInvestigacion() {
  const ui = SpreadsheetApp.getUi();
  try {
    const user = validarUsuarioAutorizado();
    const items = extractLineasInvestigacionFromSheet();
    const jsonContent = JSON.stringify(items, null, 2);
    const gitInfo = getGitHubFile('data/lineas-investigacion.json');
    const msg = `content(research): update research lines by ${user}`;

    commitGitHubFile('data/lineas-investigacion.json', jsonContent, msg, gitInfo.sha);
    syncTranslationsDictionary(items, null, user);
    ui.alert('✅ Éxito', `Se publicaron ${items.length} líneas de investigación bilingües en la web del LBBS.`, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('❌ Error', e.message, ui.ButtonSet.OK);
  }
}

function publicarServicios() {
  const ui = SpreadsheetApp.getUi();
  try {
    const user = validarUsuarioAutorizado();
    const items = extractServiciosFromSheet();
    const jsonContent = JSON.stringify(items, null, 2);
    const gitInfo = getGitHubFile('data/servicios.json');
    const msg = `content(services): update institutional services by ${user}`;

    commitGitHubFile('data/servicios.json', jsonContent, msg, gitInfo.sha);
    syncTranslationsDictionary(null, items, user);
    ui.alert('✅ Éxito', `Se publicaron ${items.length} servicios institucionales bilingües en la web del LBBS.`, ui.ButtonSet.OK);
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

// ============================================================================
// 4. Sincronización Integral (Todo en una operación)
// ============================================================================

function sincronizarTodo() {
  const ui = SpreadsheetApp.getUi();
  try {
    const user = validarUsuarioAutorizado();
    const summary = [];

    // 1. Equipo
    try {
      const equipo = extractEquipoFromSheet();
      const infoEquipo = getGitHubFile('data/equipo.json');
      commitGitHubFile('data/equipo.json', JSON.stringify(equipo, null, 2), `content(equipo): sync team roster by ${user}`, infoEquipo.sha);
      summary.push(`• ${equipo.length} miembros del equipo`);
    } catch (err) {
      summary.push(`• Equipo: omitido o con advertencia (${err.message})`);
    }

    // 2. Colaboradores
    try {
      const colab = extractColaboradoresFromSheet();
      const infoColab = getGitHubFile('data/colaboradores.json');
      commitGitHubFile('data/colaboradores.json', JSON.stringify(colab, null, 2), `content(colaboradores): sync collaborators by ${user}`, infoColab.sha);
      summary.push(`• ${colab.length} colaboradores científicos`);
    } catch (err) {
      summary.push(`• Colaboradores: omitido (${err.message})`);
    }

    // 3. Ex-integrantes
    try {
      const alumni = extractExIntegrantesFromSheet();
      const totalAlumni = alumni.reduce((acc, cat) => acc + (cat.integrantes ? cat.integrantes.length : 0), 0);
      const infoAlumni = getGitHubFile('data/ex-integrantes.json');
      commitGitHubFile('data/ex-integrantes.json', JSON.stringify(alumni, null, 2), `content(alumni): sync alumni by ${user}`, infoAlumni.sha);
      summary.push(`• ${totalAlumni} ex-integrantes en ${alumni.length} categorías`);
    } catch (err) {
      summary.push(`• Ex-integrantes: omitido (${err.message})`);
    }

    // 4. Líneas de Investigación
    let lines = null;
    try {
      lines = extractLineasInvestigacionFromSheet();
      const infoLines = getGitHubFile('data/lineas-investigacion.json');
      commitGitHubFile('data/lineas-investigacion.json', JSON.stringify(lines, null, 2), `content(research): sync research lines by ${user}`, infoLines.sha);
      summary.push(`• ${lines.length} líneas de investigación`);
    } catch (err) {
      summary.push(`• Líneas de investigación: omitido (${err.message})`);
    }

    // 5. Servicios
    let services = null;
    try {
      services = extractServiciosFromSheet();
      const infoServices = getGitHubFile('data/servicios.json');
      commitGitHubFile('data/servicios.json', JSON.stringify(services, null, 2), `content(services): sync services by ${user}`, infoServices.sha);
      summary.push(`• ${services.length} servicios institucionales`);
    } catch (err) {
      summary.push(`• Servicios: omitido (${err.message})`);
    }

    // Actualizar diccionario de traducciones
    if (lines || services) {
      syncTranslationsDictionary(lines, services, user);
    }

    // 6. Publicaciones
    try {
      const pubs = extractPublicacionesFromSheet();
      const infoPubs = getGitHubFile('data/publicaciones.json');
      commitGitHubFile('data/publicaciones.json', JSON.stringify(pubs, null, 2), `content(pubs): sync publications by ${user}`, infoPubs.sha);
      summary.push(`• ${pubs.length} publicaciones científicas`);
    } catch (err) {
      summary.push(`• Publicaciones: omitido (${err.message})`);
    }

    // 7. Novedades
    try {
      const news = extractNovedadesFromSheet();
      const infoNews = getGitHubFile('data/novedades.json');
      commitGitHubFile('data/novedades.json', JSON.stringify(news, null, 2), `content(news): sync news by ${user}`, infoNews.sha);
      summary.push(`• ${news.length} novedades y convocatorias activas`);
    } catch (err) {
      summary.push(`• Novedades: omitido (${err.message})`);
    }

    ui.alert(
      '🎉 Sincronización Completa',
      `Sincronización procesada con éxito:\n\n${summary.join('\n')}\n\nLos cambios impactarán en GitHub Pages en los próximos segundos.`,
      ui.ButtonSet.OK
    );
  } catch (e) {
    ui.alert('❌ Error en Sincronización', e.message, ui.ButtonSet.OK);
  }
}

// ============================================================================
// 5. Generador Automático de Plantillas y Validación de Hojas
// ============================================================================

/**
 * Crea o formatea las 7 pestañas con columnas bilingües paralelas,
 * estilos de encabezado (Verde Salvia para ES, Verde Menta para EN) y validaciones.
 */
function generarPlantillasHojas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const confirmation = ui.alert(
    'Configurar Hojas Institucionales',
    'Este proceso creará o formateará las 7 pestañas necesarias para administrar la web con columnas bilingües paralelas (Español / Inglés).\n\n¿Desea continuar?',
    ui.ButtonSet.YES_NO
  );
  if (confirmation !== ui.Button.YES) return;

  const colorVerdeES = '#2d3b2a'; // Verde salvia oscuro
  const colorVerdeEN = '#223326'; // Verde menta oscuro
  const colorNeutral = '#1b201a'; // Fondo base

  // Definición de las 7 pestañas
  const sheetsDef = [
    {
      name: 'Equipo',
      headers: [
        'id', 'nombre', 'rol_es', 'rol_en', 'titulo_es', 'titulo_en',
        'categoria', 'foto', 'email', 'perfil_url',
        'descripcion_es', 'descripcion_en', 'orden'
      ],
      sample: [
        1, 'Dr. Nombre Ejemplo', 'Investigador Principal', 'Principal Investigator',
        'Doctor/a en Bioquímica', 'Ph.D. in Biochemistry',
        'investigador', 'imgs/equipo/miembro-1.jpg', 'contacto@ejemplo.com', 'https://example.com',
        'Descripción de trayectoria en español.', 'Career background in English.', 1
      ],
      dropdowns: {
        col: 7, // categoria
        values: ['direccion', 'investigador', 'becario', 'apoyo']
      }
    },
    {
      name: 'Colaboradores',
      headers: ['id', 'titulo', 'afiliacion_es', 'afiliacion_en', 'orden'],
      sample: [
        1, 'Dr. Nombre Apellido', 'Universidad Nacional de Ejemplo — Facultad de Ciencias',
        'Example National University — Faculty of Sciences', 1
      ]
    },
    {
      name: 'ExIntegrantes',
      headers: [
        'categoria_id', 'categoria_es', 'categoria_en',
        'nombre', 'descripcion_es', 'descripcion_en', 'orden'
      ],
      sample: [
        'doctorado', 'Doctorado y Formación Doctoral', 'PhD & Doctoral Theses',
        'Nombre Apellido', 'Doctor/a — Cargo actual en Institución Ejemplo',
        'PhD — Current position at Example Institution', 1
      ],
      dropdowns: {
        col: 1, // categoria_id
        values: ['doctorado', 'posdoctorado', 'semanario', 'pasantias', 'otros']
      }
    },
    {
      name: 'LineasInvestigacion',
      headers: [
        'id', 'titulo_es', 'titulo_en',
        'descripcion_es', 'descripcion_en', 'icono', 'orden'
      ],
      sample: [
        1, 'Línea de Investigación Ejemplo', 'Example Research Line',
        'Descripción detallada de la línea en español.', 'Detailed line description in English.',
        'imgs/icons/sprout.svg', 1
      ]
    },
    {
      name: 'Servicios',
      headers: [
        'id', 'titulo_es', 'titulo_en',
        'descripcion_es', 'descripcion_en', 'icono', 'orden'
      ],
      sample: [
        1, 'Servicio Institucional Ejemplo', 'Example Institutional Service',
        'Descripción de las capacidades analíticas.', 'Description of technical capabilities.',
        'imgs/icons/microscope.svg', 1
      ]
    },
    {
      name: 'Publicaciones',
      headers: [
        'id', 'titulo_es', 'titulo_en', 'autores', 'revista', 'anio',
        'resumen_es', 'resumen_en', 'doi_url', 'color_destacado', 'orden'
      ],
      sample: [
        1, 'Título del paper en español', 'Scientific Paper Title in English',
        'Apellido A., Apellido B.', 'Journal of Environmental Sciences, 45: 110-120', 2026,
        'Resumen en español.', 'Abstract in English.',
        'https://doi.org/10.1016/ejemplo', 'verde-salvia', 1
      ],
      dropdowns: {
        col: 10, // color_destacado
        values: ['verde-salvia', 'verde-bosque', 'ocre-tierra']
      }
    },
    {
      name: 'Novedades',
      headers: [
        'id', 'tipo', 'titulo_es', 'titulo_en', 'fecha',
        'resumen_es', 'resumen_en', 'imagen', 'enlace_url', 'estado', 'orden'
      ],
      sample: [
        1, 'noticia', 'Titular de la novedad', 'Headline in English', '2026-10-20',
        'Bajada informativa en español.', 'English summary.',
        'imgs/novedades/novedad-1.jpg', 'https://example.com/nota', 'publicado', 1
      ],
      dropdownsMultiple: [
        { col: 2, values: ['noticia', 'evento', 'convocatoria', 'publicacion'] }, // tipo
        { col: 10, values: ['publicado', 'borrador', 'archivado'] } // estado
      ]
    }
  ];

  sheetsDef.forEach(def => {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
    }

    // Set headers
    const headerRange = sheet.getRange(1, 1, 1, def.headers.length);
    headerRange.setValues([def.headers]);
    headerRange.setFontWeight('bold');
    headerRange.setFontColor('#ffffff');
    headerRange.setBackground(colorNeutral);
    headerRange.setHorizontalAlignment('center');

    // Color code bilingual parallel headers
    def.headers.forEach((h, idx) => {
      const colCell = sheet.getRange(1, idx + 1);
      if (h.endsWith('_es')) {
        colCell.setBackground(colorVerdeES);
      } else if (h.endsWith('_en')) {
        colCell.setBackground(colorVerdeEN);
      }
    });

    // Sample row if empty
    if (sheet.getLastRow() === 1 && def.sample) {
      const sampleRange = sheet.getRange(2, 1, 1, def.sample.length);
      sampleRange.setValues([def.sample]);
      sampleRange.setFontColor('#333333');
    }

    // Dropdowns validation
    if (def.dropdowns) {
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(def.dropdowns.values, true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(2, def.dropdowns.col, 500, 1).setDataValidation(rule);
    }
    if (def.dropdownsMultiple) {
      def.dropdownsMultiple.forEach(dm => {
        const rule = SpreadsheetApp.newDataValidation()
          .requireValueInList(dm.values, true)
          .setAllowInvalid(false)
          .build();
        sheet.getRange(2, dm.col, 500, 1).setDataValidation(rule);
      });
    }

    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, def.headers.length);
  });

  ui.alert('✅ Plantillas Configuradas', 'Se crearon y estilizaron con éxito las 7 pestañas con columnas bilingües paralelas y validaciones.', ui.ButtonSet.OK);
}
