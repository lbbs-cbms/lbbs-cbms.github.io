# Guía Operativa: Headless CMS en Google Sheets para LBBS

Esta guía documenta la configuración y uso del sistema de gestión de contenidos (**Headless CMS Modelo B**) para el portal del **Laboratorio de Bioquímica y Biofísica de Sistemas (LBBS - UNQ / CBMS)**.

---

## 1. Estructura de la Hoja de Cálculo Institucional

La hoja de cálculo de Google Sheets debe contener tres pestañas: **`Equipo`**, **`Publicaciones`** y **`Novedades`**.

### Pestaña A: `Equipo`

| Columna | Tipo | Requerido | Descripción / Opciones |
|---|---|:---:|---|
| `id` | Entero | Sí | Identificador correlativo (1, 2, 3...) |
| `nombre` | Texto | Sí | Nombre completo y título académico (ej: `Dra. Mariana L. Fernández`) |
| `rol_es` | Texto | Sí | Cargo o rol en español (ej: `Directora del Laboratorio - Investigadora Principal`) |
| `rol_en` | Texto | No | Cargo en inglés (ej: `Laboratory Director - Principal Investigator`) |
| `categoria` | Desplegable | Sí | `direccion`, `investigador`, `becario`, `apoyo` |
| `foto` | Texto | Sí | Ruta al archivo de imagen (ej: `imgs/equipo/miembro-1.jpg`) |
| `email` | Correo | No | Casilla institucional (ej: `mfernandez@unq.edu.ar`) |
| `perfil_url` | URL | No | Enlace a CV, CONICET, ResearchGate u ORCID |
| `orden` | Entero | Sí | Prioridad de visualización en la grilla (menor número aparece primero) |

---

### Pestaña B: `Publicaciones`

| Columna | Tipo | Requerido | Descripción / Opciones |
|---|---|:---:|---|
| `id` | Entero | Sí | Identificador correlativo |
| `titulo_es` | Texto | Sí | Título del artículo o paper científico |
| `titulo_en` | Texto | No | Título en inglés |
| `autores` | Texto | Sí | Nómina de autores (ej: `Fernández M. L., Benítez L. E., Rossi G. M.`) |
| `revista` | Texto | Sí | Revista indexada, volumen y páginas (ej: `Soil Biology and Biochemistry, 189: 109240`) |
| `anio` | Entero | Sí | Año de publicación (ej: `2026`) |
| `resumen_es` | Texto | Sí | Resumen o abstract del trabajo en español |
| `resumen_en` | Texto | No | Resumen en inglés |
| `doi_url` | URL | No | Enlace permanente DOI (ej: `https://doi.org/10.1016/...`) |
| `color_destacado`| Desplegable | Sí | `verde-salvia`, `verde-bosque`, `ocre-tierra` |
| `orden` | Entero | Sí | Orden de presentación (1 para el más reciente) |

---

### Pestaña C: `Novedades`

| Columna | Tipo | Requerido | Descripción / Opciones |
|---|---|:---:|---|
| `id` | Entero | Sí | Identificador correlativo |
| `tipo` | Desplegable | Sí | `noticia`, `evento`, `convocatoria`, `publicacion` |
| `titulo_es` | Texto | Sí | Titular de la novedad en español (hasta 160 caracteres) |
| `titulo_en` | Texto | No | Titular en inglés |
| `fecha` | Fecha | Sí | Formato `AAAA-MM-DD` |
| `resumen_es` | Texto | Sí | Bajada informativa o descripción del evento en español |
| `resumen_en` | Texto | No | Descripción en inglés |
| `imagen` | Texto | Sí | Ruta a la fotografía (ej: `imgs/novedades/novedad-1.jpg`) |
| `enlace_url` | URL | No | Enlace externo opcional a formulario, publicación o nota UNQ |
| `estado` | Desplegable | Sí | `publicado`, `borrador`, `archivado` (sólo lo `publicado` impacta en la web) |
| `orden` | Entero | Sí | Prioridad de visualización |

---

## 2. Configuración en Google Apps Script

1. Abra la hoja de cálculo institucional del LBBS en Google Sheets.
2. Vaya a **Extensiones > Apps Script**.
3. Copie y pegue el código íntegro de [`SyncEngine.gs`](./SyncEngine.gs) en el editor.
4. En el panel izquierdo, haga clic en **Configuración del proyecto** (icono de engranaje) > **Propiedades de la secuencia de comandos** y configure las siguientes variables:
   - `GITHUB_PAT`: Token personal de GitHub (Fine-Grained) con permisos de escritura limitados (`Contents: Read and write`) sobre el repositorio `lbbs-cbms.github.io`.
   - `GITHUB_OWNER`: `lbbs-cbms`
   - `GITHUB_REPO`: `lbbs-cbms.github.io`
   - `GITHUB_BRANCH`: `main`
   - `WHITELIST_EMAILS`: Lista separada por comas de correos autorizados (ej: `director.lbbs@unq.edu.ar, secretaria.lbbs@unq.edu.ar`).
5. Guarde y recargue la hoja de cálculo. En la barra superior aparecerá el menú **🌱 LBBS - Gestión Web**.

---

## 3. Flujo Editorial Autónomo

1. **Redacción**: El investigador o redactor autorizado completa las filas en la hoja correspondiente.
2. **Publicación Desatendida**: Hace clic en el menú **🌱 LBBS - Gestión Web > 🔄 Sincronizar Todo** (o en la opción específica).
3. **Validación y Push**: El script valida los campos, genera el JSON y realiza un commit directo a la rama `main` en GitHub.
4. **Despliegue Inmediato**: GitHub Pages regenera el sitio estático automáticamente en menos de 60 segundos, sin necesidad de intervención técnica por parte del desarrollador del repositorio.
