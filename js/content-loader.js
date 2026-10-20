/**
 * LBBS - Laboratorio de Bioquímica y Biofísica de Sistemas (UNQ / CBMS)
 * Asynchronous Content Loader & Dynamic DOM Hydration
 */

(function () {
  'use strict';

  let currentLang = localStorage.getItem('lbbs_lang') || 'es';
  let cachedTeam = null;
  let cachedPubs = null;
  let cachedNews = null;

  document.addEventListener('DOMContentLoaded', initContentLoader);
  window.addEventListener('languageChanged', handleLanguageChanged);

  function initContentLoader() {
    loadTeam();
    loadPublications();
    loadNews();
  }

  function handleLanguageChanged(e) {
    currentLang = e.detail.language || 'es';
    renderTeam(cachedTeam);
    renderPublications(cachedPubs);
    renderNews(cachedNews);
  }

  // =========================================================================
  // 1. Team Hydration
  // =========================================================================
  async function loadTeam() {
    const container = document.getElementById('teamContainer');
    if (!container) return;

    try {
      const response = await fetch('data/equipo.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      cachedTeam = data.sort((a, b) => (a.orden || 99) - (b.orden || 99));
      renderTeam(cachedTeam);
    } catch (err) {
      console.warn('Could not load team data:', err);
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--color-text-muted);">
          <p data-i18n="team.empty">${currentLang === 'en' ? 'Team roster is currently being updated.' : 'Información del equipo en proceso de actualización institucional.'}</p>
        </div>`;
    }
  }

  function renderTeam(team) {
    const container = document.getElementById('teamContainer');
    if (!container || !team || team.length === 0) return;

    container.innerHTML = team.map(member => {
      const role = currentLang === 'en' && member.rol_en ? member.rol_en : member.rol_es;
      const photoSrc = member.foto || 'imgs/equipo/avatar-default.svg';

      return `
        <article class="team-card" data-category="${member.categoria || 'investigador'}">
          <div class="team-avatar-wrapper">
            <img src="${photoSrc}" 
                 alt="${member.nombre}" 
                 class="team-avatar" 
                 loading="lazy" 
                 onerror="this.onerror=null; this.src='imgs/equipo/avatar-default.svg';">
          </div>
          <h3 class="team-name">${member.nombre}</h3>
          <p class="team-role">${role}</p>
        </article>
      `;
    }).join('');
  }

  // =========================================================================
  // 2. Publications Hydration
  // =========================================================================
  async function loadPublications() {
    const container = document.getElementById('publicationsContainer');
    if (!container) return;

    try {
      const response = await fetch('data/publicaciones.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      cachedPubs = data.sort((a, b) => (a.orden || 99) - (b.orden || 99));
      renderPublications(cachedPubs);
    } catch (err) {
      console.warn('Could not load publications data:', err);
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--color-text-muted);">
          <p data-i18n="publications.empty">${currentLang === 'en' ? 'Scientific publications catalog in preparation.' : 'Publicaciones científicas en proceso de catalogación.'}</p>
        </div>`;
    }
  }

  function renderPublications(pubs) {
    const container = document.getElementById('publicationsContainer');
    if (!container || !pubs || pubs.length === 0) return;

    const doiBtnText = currentLang === 'en' ? 'View Article ↗' : 'Ver Publicación ↗';

    container.innerHTML = pubs.map(pub => {
      const title = currentLang === 'en' && pub.titulo_en ? pub.titulo_en : pub.titulo_es;
      const summary = currentLang === 'en' && pub.resumen_en ? pub.resumen_en : pub.resumen_es;
      const bannerTheme = getBannerClass(pub.color_destacado);

      const linkHtml = pub.doi_url ? `
        <div class="pub-action-row">
          <a href="${pub.doi_url}" target="_blank" rel="noopener noreferrer" class="pub-doi-btn">
            <span>${doiBtnText}</span>
          </a>
        </div>
      ` : '';

      return `
        <article class="publication-card">
          <div class="pub-header-banner ${bannerTheme}">
            <span class="pub-year-badge">${pub.anio || 2026}</span>
          </div>
          <div class="pub-body">
            <h3 class="pub-title">${title}</h3>
            <p class="pub-authors">${pub.autores || ''}</p>
            <p class="pub-journal">${pub.revista || ''}</p>
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

  // =========================================================================
  // 3. News Hydration
  // =========================================================================
  async function loadNews() {
    const container = document.getElementById('newsContainer');
    if (!container) return;

    try {
      const response = await fetch('data/novedades.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      cachedNews = data
        .filter(item => !item.estado || item.estado === 'publicado')
        .sort((a, b) => (a.orden || 99) - (b.orden || 99));
      renderNews(cachedNews);
    } catch (err) {
      console.warn('Could not load news data:', err);
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--color-text-muted);">
          <p data-i18n="news.empty">${currentLang === 'en' ? 'News and institutional announcements updating.' : 'Novedades y convocatorias en proceso de actualización.'}</p>
        </div>`;
    }
  }

  function renderNews(news) {
    const container = document.getElementById('newsContainer');
    if (!container || !news || news.length === 0) return;

    const readMoreText = currentLang === 'en' ? 'Read more ↗' : 'Leer más ↗';

    container.innerHTML = news.map(item => {
      const title = currentLang === 'en' && item.titulo_en ? item.titulo_en : item.titulo_es;
      const summary = currentLang === 'en' && item.resumen_en ? item.resumen_en : item.resumen_es;
      const imgSrc = item.imagen || 'imgs/hero/hero-lab.jpg';

      const linkHtml = item.enlace_url ? `
        <a href="${item.enlace_url}" target="_blank" rel="noopener noreferrer" class="news-link">
          <span>${readMoreText}</span>
        </a>
      ` : '';

      return `
        <article class="news-card">
          <div class="news-img-wrapper">
            <img src="${imgSrc}" alt="${title}" class="news-img" loading="lazy">
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
})();
