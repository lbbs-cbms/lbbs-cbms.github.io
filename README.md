# Laboratorio de Bioquímica y Biofísica de Sistemas (LBBS - UNQ / CBMS)

Sitio web oficial del **Laboratorio de Bioquímica y Biofísica de Sistemas (LBBS)**, perteneciente al **Centro de Bioquímica y Microbiología del Suelo (CBMS)** de la **Universidad Nacional de Quilmes (UNQ)**.

Desplegado en producción en: [https://lbbs-cbms.github.io/](https://lbbs-cbms.github.io/)

---

## 1. Arquitectura del Proyecto

El sitio web está desarrollado bajo una arquitectura web estática desacoplada (**JAMstack puro**):

- **Presentación**: HTML5 semántico estructurado, CSS3 Custom Properties (Design Tokens Bio-Orgánicos) y Vanilla JavaScript modular (ES6+). Cero dependencias externas y cero frameworks pesados.
- **Fuentes de Datos**: Archivos JSON versionados localmente en `data/` (`equipo.json`, `publicaciones.json`, `novedades.json`, `translations.json`).
- **Gestión Editorial (Headless CMS)**: Los investigadores y editores autorizados actualizan las novedades, integrantes y publicaciones directamente a través de una hoja de cálculo en Google Sheets vinculada a un script de Google Apps Script (`cms/SyncEngine.gs`), el cual sincroniza los cambios de forma automática hacia la rama `main` del repositorio mediante la GitHub REST API v3.
- **Alojamiento**: GitHub Pages con distribución global vía CDN y soporte HTTPS automático.

---

## 2. Estructura del Repositorio

```text
lbbs-cbms.github.io/
├── index.html              # Estructura semántica principal y metadatos SEO
├── README.md               # Documentación institucional y técnica
├── robots.txt              # Directivas para motores de búsqueda
├── sitemap.xml             # Mapa del sitio multilingüe
├── cms/
│   ├── README.md           # Guía operativa del Headless CMS en Google Sheets
│   └── SyncEngine.gs       # Motor de sincronización Google Apps Script
├── css/
│   ├── tokens.css          # Variables de diseño Bio-Orgánicas y escala fluida
│   └── styles.css          # Hojas de estilo responsive y componentes visuales
├── js/
│   ├── main.js             # Punto de entrada, scroll suave y menú móvil
│   ├── carousel.js         # Carrusel accesible de imágenes institucionales
│   ├── content-loader.js   # Carga asíncrona de datos e hidratación del DOM
│   └── i18n.js             # Motor de internacionalización bilingüe (ES/EN)
├── data/
│   ├── equipo.json         # Plantel de integrantes del laboratorio
│   ├── publicaciones.json  # Publicaciones científicas destacadas
│   ├── novedades.json      # Noticias, actividades y convocatorias
│   └── translations.json   # Diccionario de cadenas bilingües
└── imgs/
    ├── logo/               # Imagotipo, isotipo y favicons
    ├── hero/               # Fotografías de alta resolución del carrusel
    ├── equipo/             # Retratos de integrantes y avatares por defecto
    ├── novedades/          # Imágenes de noticias y actividades
    ├── icons/              # Íconos vectoriales SVG locales
    └── seo/                # Previsualizaciones para Open Graph y Twitter Cards
```

---

## 3. Ejecución y Validación Local

Para probar el sitio localmente sin restricciones de CORS al consumir los archivos JSON locales:

```bash
# Opción 1: Python 3
python -m http.server 8080

# Opción 2: Node.js
npx serve . -p 8080
```

Abra su navegador en `http://localhost:8080`.

---

## 4. Licencia y Créditos

© 2026 Laboratorio de Bioquímica y Biofísica de Sistemas (LBBS) — Centro de Bioquímica y Microbiología del Suelo (CBMS) — Universidad Nacional de Quilmes (UNQ).
