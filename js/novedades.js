/**
 * LBBS - Laboratorio de Bioquímica y Biofísica de Sistemas (UNQ / CBMS)
 * Secondary Page Logic: News & Activities Catalog with Reactive Filtering and Sorting
 */

(function () {
  'use strict';

  let allNews = [];
  let currentLang = localStorage.getItem('lbbs_lang') || 'es';
  let activeYear = 'all';
  let activeType = 'all';
  let activeSearch = '';
  let activeSort = 'recent';

  document.addEventListener('DOMContentLoaded', initNewsPage);
  window.addEventListener('languageChanged', handleLanguageChanged);

  async function initNewsPage() {
    setupEventListeners();
    await loadNews();
  }

  function handleLanguageChanged(e) {
    currentLang = e.detail.language || 'es';
    updateTranslationsUI();
    renderFilteredNews();
  }

  function setupEventListeners() {
    const searchInput = document.getElementById('newsSearchInput');
    const yearSelect = document.getElementById('newsYearSelect');
    const typeSelect = document.getElementById('newsTypeSelect');
    const sortSelect = document.getElementById('newsSortSelect');
    const resetBtn = document.getElementById('newsResetBtn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        activeSearch = e.target.value.trim();
        renderFilteredNews();
      });
    }

    if (yearSelect) {
      yearSelect.addEventListener('change', (e) => {
        activeYear = e.target.value;
        renderFilteredNews();
      });
    }

    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        activeType = e.target.value;
        renderFilteredNews();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        activeSort = e.target.value;
        renderFilteredNews();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        resetFilters();
      });
    }
  }

  function resetFilters() {
    activeSearch = '';
    activeYear = 'all';
    activeType = 'all';
    activeSort = 'recent';

    const searchInput = document.getElementById('newsSearchInput');
    const yearSelect = document.getElementById('newsYearSelect');
    const typeSelect = document.getElementById('newsTypeSelect');
    const sortSelect = document.getElementById('newsSortSelect');

    if (searchInput) searchInput.value = '';
    if (yearSelect) yearSelect.value = 'all';
    if (typeSelect) typeSelect.value = 'all';
    if (sortSelect) sortSelect.value = 'recent';

    renderFilteredNews();
  }

  async function loadNews() {
    const container = document.getElementById('allNewsContainer');
    if (!container) return;

    try {
      const isSubdir = window.location.pathname.includes('/pages/') || window.location.pathname.includes('\\pages\\');
      const basePath = isSubdir ? '../' : '';
      const response = await fetch(`${basePath}data/novedades.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      allNews = data.filter(item => !item.estado || item.estado === 'publicado');

      populateYearFilter(allNews);
      renderFilteredNews();
    } catch (err) {
      console.warn('Could not load news catalog:', err);
      container.innerHTML = `
        <div class="pub-empty-state">
          <p>${currentLang === 'en' ? 'News and institutional announcements updating.' : 'Novedades y convocatorias en proceso de actualización.'}</p>
        </div>`;
    }
  }

  function populateYearFilter(news) {
    const yearSelect = document.getElementById('newsYearSelect');
    if (!yearSelect) return;

    // Extract unique sorted years descending
    const years = Array.from(new Set(
      news.map(n => {
        if (!n.fecha) return null;
        return n.fecha.substring(0, 4);
      }).filter(Boolean)
    )).sort((a, b) => b - a);

    const allYearsText = currentLang === 'en' ? 'All years' : 'Todos los años';
    yearSelect.innerHTML = `<option value="all">${allYearsText}</option>` +
      years.map(y => `<option value="${y}">${y}</option>`).join('');
  }

  function updateTranslationsUI() {
    const searchInput = document.getElementById('newsSearchInput');
    if (searchInput) {
      searchInput.placeholder = currentLang === 'en'
        ? 'Search by title, topic, or keyword...'
        : 'Buscar por título, temática o palabra clave...';
    }

    const yearSelect = document.getElementById('newsYearSelect');
    if (yearSelect && yearSelect.options && yearSelect.options.length > 0) {
      yearSelect.options[0].text = currentLang === 'en' ? 'All years' : 'Todos los años';
    }

    const typeSelect = document.getElementById('newsTypeSelect');
    if (typeSelect && typeSelect.options) {
      const typeLabels = {
        es: { all: 'Todos los tipos', noticia: 'Noticia', evento: 'Evento', convocatoria: 'Convocatoria', publicacion: 'Publicación' },
        en: { all: 'All types', noticia: 'News', evento: 'Event', convocatoria: 'Open Call', publicacion: 'Publication' }
      };
      const dict = typeLabels[currentLang] || typeLabels.es;
      for (let i = 0; i < typeSelect.options.length; i++) {
        const val = typeSelect.options[i].value;
        if (dict[val]) {
          typeSelect.options[i].text = dict[val];
        }
      }
    }
  }

  function normalizeText(text) {
    if (!text) return '';
    return text.toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      if (currentLang === 'en') {
        const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthsEn[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
      } else {
        const monthsEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return `${parseInt(day, 10)} ${monthsEs[parseInt(month, 10) - 1]} ${year}`;
      }
    } catch {
      return dateStr;
    }
  }

  function renderFilteredNews() {
    const container = document.getElementById('allNewsContainer');
    const countBadge = document.getElementById('newsResultsCount');
    if (!container) return;

    const normalizedQuery = normalizeText(activeSearch);

    // 1. Filter
    let filtered = allNews.filter((item) => {
      // Year Filter
      if (activeYear !== 'all') {
        const itemYear = item.fecha ? item.fecha.substring(0, 4) : '';
        if (itemYear !== activeYear) return false;
      }

      // Type Filter
      if (activeType !== 'all') {
        if ((item.tipo || 'noticia') !== activeType) return false;
      }

      // Search Filter (searches title, summary, type)
      if (normalizedQuery) {
        const titleEs = normalizeText(item.titulo_es);
        const titleEn = normalizeText(item.titulo_en);
        const summaryEs = normalizeText(item.resumen_es);
        const summaryEn = normalizeText(item.resumen_en);
        const type = normalizeText(item.tipo);

        const match = titleEs.includes(normalizedQuery) ||
                      titleEn.includes(normalizedQuery) ||
                      summaryEs.includes(normalizedQuery) ||
                      summaryEn.includes(normalizedQuery) ||
                      type.includes(normalizedQuery);

        if (!match) return false;
      }

      return true;
    });

    // 2. Sort
    filtered.sort((a, b) => {
      if (activeSort === 'oldest') {
        return new Date(a.fecha) - new Date(b.fecha);
      } else if (activeSort === 'title') {
        const titleA = (currentLang === 'en' && a.titulo_en ? a.titulo_en : a.titulo_es || '').toLowerCase();
        const titleB = (currentLang === 'en' && b.titulo_en ? b.titulo_en : b.titulo_es || '').toLowerCase();
        return titleA.localeCompare(titleB);
      } else {
        // 'recent' default
        return new Date(b.fecha) - new Date(a.fecha);
      }
    });

    // 3. Update counter
    if (countBadge) {
      if (currentLang === 'en') {
        countBadge.innerHTML = `Showing <span class="filter-count-highlight">${filtered.length}</span> of <span class="filter-count-highlight">${allNews.length}</span> news items`;
      } else {
        countBadge.innerHTML = `Mostrando <span class="filter-count-highlight">${filtered.length}</span> de <span class="filter-count-highlight">${allNews.length}</span> novedades`;
      }
    }

    // 4. Empty State
    if (filtered.length === 0) {
      const emptyTitle = currentLang === 'en' ? 'No news found' : 'No se encontraron novedades';
      const emptyDesc = currentLang === 'en'
        ? 'No articles match the current filter or search criteria.'
        : 'Ninguna novedad coincide con los criterios de búsqueda o filtros seleccionados.';
      const resetText = currentLang === 'en' ? 'Reset filters' : 'Restablecer filtros';

      container.innerHTML = `
        <div class="pub-empty-state">
          <svg class="pub-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
          <h3 class="pub-empty-title">${emptyTitle}</h3>
          <p class="pub-empty-text">${emptyDesc}</p>
          <button type="button" class="filter-reset-btn" onclick="document.getElementById('newsResetBtn').click()">
            ${resetText}
          </button>
        </div>
      `;
      return;
    }

    // 5. Render Cards
    const readMoreText = currentLang === 'en' ? 'Read more ↗' : 'Leer más ↗';
    const isSubdir = window.location.pathname.includes('/pages/') || window.location.pathname.includes('\\pages\\');
    const imgPrefix = isSubdir ? '../' : '';

    container.innerHTML = filtered.map(item => {
      const title = currentLang === 'en' && item.titulo_en ? item.titulo_en : item.titulo_es;
      const summary = currentLang === 'en' && item.resumen_en ? item.resumen_en : item.resumen_es;
      const rawImg = item.imagen || 'imgs/hero/hero-lab.jpg';
      const imgSrc = rawImg.startsWith('http') ? rawImg : `${imgPrefix}${rawImg}`;

      const linkHtml = item.enlace_url ? `
        <a href="${item.enlace_url}" target="_blank" rel="noopener noreferrer" class="news-link">
          <span>${readMoreText}</span>
        </a>
      ` : '';

      return `
        <article class="news-card">
          <div class="news-img-wrapper">
            <img src="${imgSrc}" alt="${title}" class="news-img" loading="lazy" onerror="this.onerror=null; this.src='${imgPrefix}imgs/hero/hero-lab.jpg';">
          </div>
          <div class="news-body">
            <span class="news-date">${formatDate(item.fecha)}</span>
            <h3 class="news-title">${title}</h3>
            <p class="news-summary">${summary}</p>
            ${linkHtml}
          </div>
        </article>
      `;
    }).join('');
  }
})();
