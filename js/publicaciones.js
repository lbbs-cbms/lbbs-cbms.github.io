/**
 * LBBS - Laboratorio de Bioquímica y Biofísica de Sistemas (UNQ / CBMS)
 * Secondary Page Logic: Publications Catalog with Reactive Filtering and Sorting
 */

(function () {
  'use strict';

  let allPublications = [];
  let currentLang = localStorage.getItem('lbbs_lang') || 'es';
  let activeYear = 'all';
  let activeSearch = '';
  let activeSort = 'recent';

  document.addEventListener('DOMContentLoaded', initPublicationsPage);
  window.addEventListener('languageChanged', handleLanguageChanged);

  async function initPublicationsPage() {
    setupEventListeners();
    await loadPublications();
  }

  function handleLanguageChanged(e) {
    currentLang = e.detail.language || 'es';
    updateTranslationsUI();
    renderFilteredPublications();
  }

  function setupEventListeners() {
    const searchInput = document.getElementById('pubSearchInput');
    const yearSelect = document.getElementById('pubYearSelect');
    const sortSelect = document.getElementById('pubSortSelect');
    const resetBtn = document.getElementById('pubResetBtn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        activeSearch = e.target.value.trim();
        renderFilteredPublications();
      });
    }

    if (yearSelect) {
      yearSelect.addEventListener('change', (e) => {
        activeYear = e.target.value;
        renderFilteredPublications();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        activeSort = e.target.value;
        renderFilteredPublications();
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
    activeSort = 'recent';

    const searchInput = document.getElementById('pubSearchInput');
    const yearSelect = document.getElementById('pubYearSelect');
    const sortSelect = document.getElementById('pubSortSelect');

    if (searchInput) searchInput.value = '';
    if (yearSelect) yearSelect.value = 'all';
    if (sortSelect) sortSelect.value = 'recent';

    renderFilteredPublications();
  }

  async function loadPublications() {
    const container = document.getElementById('allPublicationsContainer');
    if (!container) return;

    try {
      const response = await fetch('data/publicaciones.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      allPublications = await response.json();

      populateYearFilter(allPublications);
      renderFilteredPublications();
    } catch (err) {
      console.warn('Could not load publications catalog:', err);
      container.innerHTML = `
        <div class="pub-empty-state">
          <p>${currentLang === 'en' ? 'Scientific publications catalog in preparation.' : 'Publicaciones científicas en proceso de catalogación.'}</p>
        </div>`;
    }
  }

  function populateYearFilter(pubs) {
    const yearSelect = document.getElementById('pubYearSelect');
    if (!yearSelect) return;

    // Extract unique sorted years descending
    const years = Array.from(new Set(
      pubs.map(p => p.anio || parseInt(p.fechaPublicacion, 10)).filter(Boolean)
    )).sort((a, b) => b - a);

    const allYearsText = currentLang === 'en' ? 'All years' : 'Todos los años';
    yearSelect.innerHTML = `<option value="all">${allYearsText}</option>` +
      years.map(y => `<option value="${y}">${y}</option>`).join('');
  }

  function updateTranslationsUI() {
    const searchInput = document.getElementById('pubSearchInput');
    if (searchInput) {
      searchInput.placeholder = currentLang === 'en'
        ? 'Search by title, author, or journal...'
        : 'Buscar por título, autor o revista...';
    }

    // Refresh year filter dropdown 'all' label
    const yearSelect = document.getElementById('pubYearSelect');
    if (yearSelect && yearSelect.options && yearSelect.options.length > 0) {
      yearSelect.options[0].text = currentLang === 'en' ? 'All years' : 'Todos los años';
    }
  }

  function normalizeText(text) {
    if (!text) return '';
    return text.toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function renderFilteredPublications() {
    const container = document.getElementById('allPublicationsContainer');
    const countBadge = document.getElementById('pubResultsCount');
    if (!container) return;

    const normalizedQuery = normalizeText(activeSearch);

    // 1. Filter
    let filtered = allPublications.filter((pub) => {
      // Date / Year Filter
      const pubYear = (pub.anio || parseInt(pub.fechaPublicacion, 10) || '').toString();
      if (activeYear !== 'all' && pubYear !== activeYear) {
        return false;
      }

      // Name / Keyword Search Filter (searches titles, authors, journal, summary)
      if (normalizedQuery) {
        const titleEs = normalizeText(pub.titulo_es || pub.titulo);
        const titleEn = normalizeText(pub.titulo_en);
        const authors = normalizeText(pub.autores);
        const journal = normalizeText(pub.revista || pub.publicadoEn);
        const summaryEs = normalizeText(pub.resumen_es || pub.resumen);
        const summaryEn = normalizeText(pub.resumen_en);

        const match = titleEs.includes(normalizedQuery) ||
                      titleEn.includes(normalizedQuery) ||
                      authors.includes(normalizedQuery) ||
                      journal.includes(normalizedQuery) ||
                      summaryEs.includes(normalizedQuery) ||
                      summaryEn.includes(normalizedQuery);

        if (!match) return false;
      }

      return true;
    });

    // 2. Sort
    filtered.sort((a, b) => {
      const yearA = a.anio || parseInt(a.fechaPublicacion, 10) || 0;
      const yearB = b.anio || parseInt(b.fechaPublicacion, 10) || 0;
      const orderA = a.orden || 99;
      const orderB = b.orden || 99;

      if (activeSort === 'oldest') {
        if (yearA !== yearB) return yearA - yearB;
        return orderB - orderA;
      } else if (activeSort === 'title') {
        const titleA = (currentLang === 'en' && a.titulo_en ? a.titulo_en : (a.titulo_es || a.titulo || '')).toLowerCase();
        const titleB = (currentLang === 'en' && b.titulo_en ? b.titulo_en : (b.titulo_es || b.titulo || '')).toLowerCase();
        return titleA.localeCompare(titleB);
      } else {
        // 'recent' default
        if (yearA !== yearB) return yearB - yearA;
        return orderA - orderB;
      }
    });

    // 3. Update counter
    if (countBadge) {
      if (currentLang === 'en') {
        countBadge.innerHTML = `Showing <span class="filter-count-highlight">${filtered.length}</span> of <span class="filter-count-highlight">${allPublications.length}</span> publications`;
      } else {
        countBadge.innerHTML = `Mostrando <span class="filter-count-highlight">${filtered.length}</span> de <span class="filter-count-highlight">${allPublications.length}</span> publicaciones`;
      }
    }

    // 4. Empty State
    if (filtered.length === 0) {
      const emptyTitle = currentLang === 'en' ? 'No publications found' : 'No se encontraron publicaciones';
      const emptyDesc = currentLang === 'en'
        ? 'No articles match the current filter or search criteria.'
        : 'Ningún artículo coincide con los criterios de búsqueda o filtros seleccionados.';
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
          <button type="button" class="filter-reset-btn" onclick="document.getElementById('pubResetBtn').click()">
            ${resetText}
          </button>
        </div>
      `;
      return;
    }

    // 5. Render Cards
    const doiBtnText = currentLang === 'en' ? 'View Article ↗' : 'Ver Publicación ↗';

    container.innerHTML = filtered.map(pub => {
      const title = currentLang === 'en' && pub.titulo_en ? pub.titulo_en : (pub.titulo_es || pub.titulo || '');
      const summary = currentLang === 'en' && pub.resumen_en ? pub.resumen_en : (pub.resumen_es || pub.resumen || '');
      const journal = pub.revista || pub.publicadoEn || '';
      const year = pub.anio || pub.fechaPublicacion || '';
      const link = pub.doi_url || pub.enlace || '';
      const authors = pub.autores || '';
      const bannerTheme = getBannerClass(pub.color_destacado);

      const linkHtml = link ? `
        <div class="pub-action-row">
          <a href="${link}" target="_blank" rel="noopener noreferrer" class="pub-doi-btn">
            <span>${doiBtnText}</span>
          </a>
        </div>
      ` : '';

      return `
        <article class="publication-card">
          <div class="pub-header-banner ${bannerTheme}">
            <span class="pub-year-badge">${year}</span>
          </div>
          <div class="pub-body">
            <h3 class="pub-title">${title}</h3>
            <p class="pub-authors">${authors}</p>
            <p class="pub-journal">${journal}</p>
            <p class="pub-summary">${summary}</p>
            ${linkHtml}
          </div>
        </article>
      `;
    }).join('');
  }

  function getBannerClass(colorName) {
    switch (colorName) {
      case 'verde-bosque':
        return 'pub-banner-bosque';
      case 'ocre-tierra':
        return 'pub-banner-tierra';
      case 'verde-salvia':
      default:
        return 'pub-banner-salvia';
    }
  }
})();
