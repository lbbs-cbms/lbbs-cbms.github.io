# Guía Operativa: Headless CMS en Google Sheets para LBBS (v2.0)

Esta guía documenta la configuración y uso del sistema de gestión de contenidos (**Headless CMS Modelo B**) para el portal del **Laboratorio de Bioquímica y Biofísica de Sistemas (LBBS - UNQ / CBMS)**.

Permite a los investigadores y editores autorizados actualizar de forma autónoma:
1. **Nuestro Equipo Activo** (`data/equipo.json`)
2. **Colaboradores Científicos** (`data/colaboradores.json`)
3. **Ex-integrantes por Categoría** (`data/ex-integrantes.json`)
4. **Líneas de Investigación** (`data/lineas-investigacion.json` y `data/translations.json`)
5. **Servicios Institucionales** (`data/servicios.json` y `data/translations.json`)
6. **Publicaciones Científicas** (`data/publicaciones.json`)
7. **Novedades y Convocatorias** (`data/novedades.json`)

---

## 1. Estructura de Pestañas con Columnas Bilingües Paralelas

La hoja de cálculo institucional de Google Sheets cuenta con **7 pestañas**. Cada campo de texto dispone de su celda paralela en español (`_es`) y en inglés (`_en`), permitiendo que el selector de idioma del sitio web muestre la traducción exacta cargada por los investigadores.

> [!TIP]
> Puede generar y formatear automáticamente todas las pestañas y sus validaciones ejecutando desde la hoja de cálculo el menú:  
> **`🌱 LBBS - Gestión Web > 📋 Generar / Formatear Plantillas de Hojas`**.

---

### Pestaña 1: `Equipo` (Investigadores Activos)

| Columna | Tipo | Requerido | Descripción / Opciones |
|---|---|:---:|---|
| `id` | Entero | Sí | Identificador correlativo (1, 2, 3...) |
| `nombre` | Texto | Sí | Nombre completo del investigador/a |
| `rol_es` | Texto | Sí | Rol o cargo en español (ej: `Dirección / Investigador Principal`) |
| `rol_en` | Texto | No | Rol o cargo en inglés (ej: `Director / Principal Investigator`) |
| `titulo_es` | Texto | Sí | Título académico en español (ej: `Doctorado / Especialidad Académica`) |
| `titulo_en` | Texto | No | Título en inglés (ej: `Ph.D. / Academic Specialty`) |
| `categoria` | Desplegable | Sí | `direccion`, `investigador`, `becario`, `apoyo` |
| `foto` | Texto | Sí | Ruta al archivo de imagen (ej: `imgs/equipo/miembro-1.jpg`) |
| `email` | Correo | No | Casilla de correo institucional (ej: `contacto@ejemplo.com`) |
| `perfil_url` | URL | No | Enlace a CV, CONICET, ResearchGate u ORCID |
| `descripcion_es`| Texto | Sí | Trayectoria y líneas de investigación en español |
| `descripcion_en`| Texto | No | Trayectoria y líneas en inglés |
| `orden` | Entero | Sí | Orden de presentación (1 aparece primero) |

---

### Pestaña 2: `Colaboradores`

| Columna | Tipo | Requerido | Descripción / Opciones |
|---|---|:---:|---|
| `id` | Entero | Sí | Identificador correlativo |
| `titulo` | Texto | Sí | Título y nombre (ej: `Dr. Nombre Apellido 1`) |
| `afiliacion_es` | Texto | Sí | Institución de procedencia en español |
| `afiliacion_en` | Texto | No | Institución en inglés |
| `orden` | Entero | Sí | Orden de presentación |

---

### Pestaña 3: `ExIntegrantes`

Los ex-integrantes se clasifican por categorías formativas o de vinculación. El script agrupa automáticamente las filas por categoría.

| Columna | Tipo | Requerido | Descripción / Opciones |
|---|---|:---:|---|
| `categoria_id` | Desplegable | Sí | `doctorado`, `posdoctorado`, `semanario`, `pasantias`, `otros` |
| `categoria_es` | Texto | Sí | Título de categoría en español (ej: `Doctorado y Formación Doctoral`) |
| `categoria_en` | Texto | No | Título de categoría en inglés (ej: `PhD & Doctoral Theses`) |
| `nombre` | Texto | Sí | Nombre completo del ex-integrante |
| `descripcion_es`| Texto | Sí | Cargo actual, destino o titulación (ej: `Doctor/a — Investigador/a en Centro Ejemplo`) |
| `descripcion_en`| Texto | No | Descripción paralela en inglés |
| `orden` | Entero | Sí | Orden numérico |

---

### Pestaña 4: `LineasInvestigacion`

| Columna | Tipo | Requerido | Descripción / Opciones |
|---|---|:---:|---|
| `id` | Entero | Sí | Identificador correlativo |
| `titulo_es` | Texto | Sí | Título de la línea en español |
| `titulo_en` | Texto | No | Título de la línea en inglés |
| `descripcion_es`| Texto | Sí | Resumen temático en español |
| `descripcion_en`| Texto | No | Resumen temático en inglés |
| `icono` | Texto | Sí | Ruta al icono SVG (ej: `imgs/icons/sprout.svg`, `soil-pin.svg`, `dna.svg`) |
| `orden` | Entero | Sí | Orden de aparición |

---

### Pestaña 5: `Servicios`

| Columna | Tipo | Requerido | Descripción / Opciones |
|---|---|:---:|---|
| `id` | Entero | Sí | Identificador correlativo |
| `titulo_es` | Texto | Sí | Denominación del servicio en español |
| `titulo_en` | Texto | No | Denominación del servicio en inglés |
| `descripcion_es`| Texto | Sí | Alcance analítico o técnico en español |
| `descripcion_en`| Texto | No | Alcance en inglés |
| `icono` | Texto | Sí | Ruta al icono SVG (ej: `imgs/icons/microscope.svg`, `gear.svg`, `building.svg`) |
| `orden` | Entero | Sí | Orden de aparición |

---

### Pestaña 6: `Publicaciones`

| Columna | Tipo | Requerido | Descripción / Opciones |
|---|---|:---:|---|
| `id` | Entero | Sí | Identificador correlativo |
| `titulo_es` | Texto | Sí | Título de la publicación |
| `titulo_en` | Texto | No | Título en inglés |
| `autores` | Texto | Sí | Cita de autores (ej: `Apellido A., Apellido B.`) |
| `revista` | Texto | Sí | Revista indexada, volumen y páginas |
| `anio` | Entero | Sí | Año de publicación (ej: `2026`) |
| `resumen_es` | Texto | Sí | Abstract o resumen en español |
| `resumen_en` | Texto | No | Abstract en inglés |
| `doi_url` | URL | No | Enlace oficial DOI (ej: `https://doi.org/10.1016/...`) |
| `color_destacado`| Desplegable | Sí | `verde-salvia`, `verde-bosque`, `ocre-tierra` |
| `orden` | Entero | Sí | Orden (1 para el más reciente) |

---

### Pestaña 7: `Novedades`

| Columna | Tipo | Requerido | Descripción / Opciones |
|---|---|:---:|---|
| `id` | Entero | Sí | Identificador correlativo |
| `tipo` | Desplegable | Sí | `noticia`, `evento`, `convocatoria`, `publicacion` |
| `titulo_es` | Texto | Sí | Titular en español |
| `titulo_en` | Texto | No | Titular en inglés |
| `fecha` | Fecha | Sí | Formato `AAAA-MM-DD` |
| `resumen_es` | Texto | Sí | Bajada informativa en español |
| `resumen_en` | Texto | No | Bajada informativa en inglés |
| `imagen` | Texto | Sí | Ruta a la imagen (ej: `imgs/novedades/novedad-1.jpg`) |
| `enlace_url` | URL | No | Enlace externo opcional a circular o nota |
| `estado` | Desplegable | Sí | `publicado`, `borrador`, `archivado` (sólo lo `publicado` va a la web) |
| `orden` | Entero | Sí | Prioridad de visualización |

---

## 2. Configuración en Google Apps Script

1. Abra la hoja de cálculo institucional del LBBS en Google Sheets.
2. Vaya a **Extensiones > Apps Script**.
3. Copie y pegue el código íntegro de [`SyncEngine.gs`](./SyncEngine.gs) en el editor.
4. En el panel izquierdo, haga clic en **Configuración del proyecto** (icono de engranaje) > **Propiedades de la secuencia de comandos** y configure las siguientes variables:
   - `GITHUB_PAT`: Token personal de GitHub (Fine-Grained) con permisos de escritura (`Contents: Read and write`) sobre el repositorio `lbbs-cbms.github.io`.
   - `GITHUB_OWNER`: `lbbs-cbms`
   - `GITHUB_REPO`: `lbbs-cbms.github.io`
   - `GITHUB_BRANCH`: `main`
   - `WHITELIST_EMAILS`: Lista separada por comas de correos autorizados (ej: `investigador1@unq.edu.ar, secretaria@unq.edu.ar`).
5. Guarde y recargue la hoja de cálculo. En la barra superior aparecerá el menú **🌱 LBBS - Gestión Web**.

---

## 3. Flujo Operativo Post-Deploy

1. **Carga y Edición**: Los investigadores agregan nuevos miembros, actualizan bajas, añaden colaboradores, publicaciones, noticias, o nuevas líneas/servicios completando las celdas en español y sus correspondientes paralelas en inglés.
2. **Publicación Selectiva o Total**:
   - Para actualizar sólo una sección: clic en **🌱 LBBS - Gestión Web > Publicar [Sección]**.
   - Para actualizar todo el sitio: clic en **🌱 LBBS - Gestión Web > 🔄 Sincronizar Todo**.
3. **Commit y Despliegue**:
   - El script realiza una llamada a la API REST de GitHub con codificación Base64 UTF-8.
   - Realiza un commit directo en la rama `main` de `lbbs-cbms.github.io`.
   - GitHub Pages detecta el commit y recompila el sitio estático automáticamente en menos de 60 segundos.
