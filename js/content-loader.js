/**
 * LBBS - Laboratorio de Bioquímica y Biofísica de Sistemas (UNQ / CBMS)
 * Asynchronous Content Loader & Dynamic DOM Hydration
 */

(function () {
  'use strict';

  let currentLang = localStorage.getItem('lbbs_lang') || 'es';
  let cachedTeam = null;
  let cachedColab = null;
  let cachedAlumni = null;
  let cachedResearch = null;
  let cachedServices = null;
  let cachedPubs = null;
  let cachedNews = null;
  let activeMemberId = null;
  let activeTriggerCard = null;
  let activeColabTrigger = null;
  let activeAlumniTrigger = null;

  document.addEventListener('DOMContentLoaded', initContentLoader);
  window.addEventListener('languageChanged', handleLanguageChanged);

  function initContentLoader() {
    initTeamModal();
    initColaboradoresModal();
    initExIntegrantesModal();
    loadTeam();
    loadColaboradores();
    loadExIntegrantes();
    loadResearch();
    loadServices();
    loadPublications();
    loadNews();
  }

  function handleLanguageChanged(e) {
    currentLang = e.detail.language || 'es';
    renderTeam(cachedTeam);
    renderColaboradores(cachedColab);
    renderExIntegrantes(cachedAlumni);
    renderResearch(cachedResearch);
    renderServices(cachedServices);
    renderPublications(cachedPubs);
    renderNews(cachedNews);

    // If team modal is open, re-populate in current language
    if (activeMemberId && cachedTeam) {
      const activeMember = cachedTeam.find(m => m.id === activeMemberId);
      if (activeMember) {
        populateModalData(activeMember);
      }
    }
  }

  // =========================================================================
  // 1. Team Hydration & Modal Dialog
  // =========================================================================
  function initTeamModal() {
    const modal = document.getElementById('teamModal');
    const closeBtn = document.getElementById('modalCloseBtn');
    if (!modal) return;

    if (closeBtn) {
      closeBtn.addEventListener('click', () => closeTeamModal());
    }

    // Close when clicking dialog backdrop outside content
    modal.addEventListener('click', (e) => {
      const rect = modal.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.bottom &&
        rect.left <= e.clientX &&
        e.clientX <= rect.right
      );
      if (!isInDialog) {
        closeTeamModal();
      }
    });

    // Native cancel event (Escape key)
    modal.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeTeamModal();
    });
  }

  function openTeamModal(memberId, triggerEl) {
    const modal = document.getElementById('teamModal');
    if (!modal || !cachedTeam) return;

    const member = cachedTeam.find(m => m.id === memberId);
    if (!member) return;

    activeMemberId = memberId;
    activeTriggerCard = triggerEl;

    populateModalData(member);

    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }
    document.body.style.overflow = 'hidden';
  }

  function closeTeamModal() {
    const modal = document.getElementById('teamModal');
    if (!modal) return;

    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.removeAttribute('open');
    }
    document.body.style.overflow = '';

    if (activeTriggerCard) {
      activeTriggerCard.focus();
    }
    activeMemberId = null;
  }

  function populateModalData(member) {
    const photo = document.getElementById('modalMemberPhoto');
    const name = document.getElementById('modalMemberName');
    const title = document.getElementById('modalMemberTitle');
    const category = document.getElementById('modalMemberCategory');
    const bio = document.getElementById('modalMemberBio');
    const emailLink = document.getElementById('modalMemberEmail');
    const profileLink = document.getElementById('modalMemberProfile');

    if (photo) {
      photo.src = member.foto || 'imgs/equipo/avatar-default.svg';
      photo.alt = member.nombre;
    }

    if (name) {
      name.textContent = member.nombre;
    }

    if (title) {
      const academicTitle = (currentLang === 'en' && member.titulo_en)
        ? member.titulo_en
        : (member.titulo_es || (currentLang === 'en' && member.rol_en ? member.rol_en : member.rol_es));
      title.textContent = academicTitle;
    }

    if (category) {
      const catKey = member.categoria || 'investigador';
      const catLabels = {
        es: {
          direccion: 'Dirección',
          investigador: 'Investigación',
          becario: 'Formación Doctoral',
          apoyo: 'Apoyo Técnico'
        },
        en: {
          direccion: 'Leadership',
          investigador: 'Research Staff',
          becario: 'Doctoral Fellow',
          apoyo: 'Technical Support'
        }
      };
      category.textContent = catLabels[currentLang]?.[catKey] || catLabels['es'][catKey] || catKey;
    }

    if (bio) {
      const description = (currentLang === 'en' && member.descripcion_en)
        ? member.descripcion_en
        : (member.descripcion_es || (currentLang === 'en' && member.rol_en ? member.rol_en : member.rol_es));
      bio.textContent = description;
    }

    if (emailLink) {
      if (member.email) {
        emailLink.href = `mailto:${member.email}`;
        emailLink.style.display = 'inline-flex';
      } else {
        emailLink.style.display = 'none';
      }
    }

    if (profileLink) {
      if (member.perfil_url) {
        profileLink.href = member.perfil_url;
        profileLink.style.display = 'inline-flex';
      } else {
        profileLink.style.display = 'none';
      }
    }
  }

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

    const viewProfileText = currentLang === 'en' ? 'View profile' : 'Ver perfil';

    container.innerHTML = team.map(member => {
      const role = currentLang === 'en' && member.rol_en ? member.rol_en : member.rol_es;
      const photoSrc = member.foto || 'imgs/equipo/avatar-default.svg';

      return `
        <article class="team-card" 
                 role="button" 
                 tabindex="0" 
                 aria-haspopup="dialog" 
                 aria-label="${member.nombre} - ${viewProfileText}" 
                 data-member-id="${member.id}" 
                 data-category="${member.categoria || 'investigador'}">
          <div class="team-avatar-wrapper">
            <img src="${photoSrc}" 
                 alt="${member.nombre}" 
                 class="team-avatar" 
                 loading="lazy" 
                 onerror="this.onerror=null; this.src='imgs/equipo/avatar-default.svg';">
          </div>
          <h3 class="team-name">${member.nombre}</h3>
          <p class="team-role">${role}</p>
          <span class="team-card-hint" aria-hidden="true">${viewProfileText}</span>
        </article>
      `;
    }).join('');

    // Attach click and keyboard events
    const cards = container.querySelectorAll('.team-card');
    cards.forEach(card => {
      const memberId = parseInt(card.getAttribute('data-member-id'), 10);
      card.addEventListener('click', () => openTeamModal(memberId, card));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openTeamModal(memberId, card);
        }
      });
    });
  }

  // =========================================================================
  // 1b. Colaboradores Modal & Hydration
  // =========================================================================
  function initColaboradoresModal() {
    const modal = document.getElementById('colaboradoresModal');
    const openBtn = document.getElementById('btnOpenColaboradores');
    const closeBtn = document.getElementById('modalColabCloseBtn');
    if (!modal || !openBtn) return;

    openBtn.addEventListener('click', () => {
      activeColabTrigger = openBtn;
      if (typeof modal.showModal === 'function') {
        modal.showModal();
      } else {
        modal.setAttribute('open', '');
      }
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => closeColabModal());
    }

    modal.addEventListener('click', (e) => {
      const rect = modal.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.bottom &&
        rect.left <= e.clientX &&
        e.clientX <= rect.right
      );
      if (!isInDialog) {
        closeColabModal();
      }
    });

    modal.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeColabModal();
    });

    function closeColabModal() {
      if (typeof modal.close === 'function') {
        modal.close();
      } else {
        modal.removeAttribute('open');
      }
      document.body.style.overflow = '';
      if (activeColabTrigger) {
        activeColabTrigger.focus();
        activeColabTrigger = null;
      }
    }
  }

  async function loadColaboradores() {
    const container = document.getElementById('colaboradoresContainer');
    if (!container) return;

    try {
      const response = await fetch('data/colaboradores.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      cachedColab = await response.json();
      renderColaboradores(cachedColab);
    } catch (err) {
      console.warn('Could not load collaborators data:', err);
    }
  }

  function renderColaboradores(colabs) {
    const container = document.getElementById('colaboradoresContainer');
    if (!container || !colabs || colabs.length === 0) return;

    container.innerHTML = colabs.map(colab => {
      const affiliation = currentLang === 'en' && colab.afiliacion_en
        ? colab.afiliacion_en
        : colab.afiliacion_es;

      return `
        <article class="colab-card">
          <div class="colab-icon-wrapper" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="colab-info">
            <h4 class="colab-name">${colab.titulo}</h4>
            <p class="colab-affiliation">${affiliation}</p>
          </div>
        </article>
      `;
    }).join('');
  }

  // =========================================================================
  // 1c. Ex-integrantes Modal & Hydration
  // =========================================================================
  function initExIntegrantesModal() {
    const modal = document.getElementById('exIntegrantesModal');
    const openBtn = document.getElementById('btnOpenExIntegrantes');
    const closeBtn = document.getElementById('modalAlumniCloseBtn');
    if (!modal || !openBtn) return;

    openBtn.addEventListener('click', () => {
      activeAlumniTrigger = openBtn;
      if (typeof modal.showModal === 'function') {
        modal.showModal();
      } else {
        modal.setAttribute('open', '');
      }
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => closeAlumniModal());
    }

    modal.addEventListener('click', (e) => {
      const rect = modal.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.bottom &&
        rect.left <= e.clientX &&
        e.clientX <= rect.right
      );
      if (!isInDialog) {
        closeAlumniModal();
      }
    });

    modal.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeAlumniModal();
    });

    function closeAlumniModal() {
      if (typeof modal.close === 'function') {
        modal.close();
      } else {
        modal.removeAttribute('open');
      }
      document.body.style.overflow = '';
      if (activeAlumniTrigger) {
        activeAlumniTrigger.focus();
        activeAlumniTrigger = null;
      }
    }
  }

  async function loadExIntegrantes() {
    const container = document.getElementById('exIntegrantesContainer');
    if (!container) return;

    try {
      const response = await fetch('data/ex-integrantes.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      cachedAlumni = await response.json();
      renderExIntegrantes(cachedAlumni);
    } catch (err) {
      console.warn('Could not load alumni data:', err);
    }
  }

  function renderExIntegrantes(categories) {
    const container = document.getElementById('exIntegrantesContainer');
    if (!container || !categories || categories.length === 0) return;

    container.innerHTML = categories.map(cat => {
      const catTitle = currentLang === 'en' && cat.categoria_en ? cat.categoria_en : cat.categoria_es;
      const membersHtml = (cat.integrantes || []).map(member => {
        const desc = currentLang === 'en' && member.descripcion_en ? member.descripcion_en : member.descripcion_es;
        return `
          <article class="alumni-member-card">
            <h5 class="alumni-member-name">${member.nombre}</h5>
            <p class="alumni-member-desc">${desc}</p>
          </article>
        `;
      }).join('');

      return `
        <section class="alumni-category-block">
          <div class="alumni-category-header">
            <span class="alumni-category-badge">${catTitle}</span>
          </div>
          <div class="alumni-members-grid">
            ${membersHtml}
          </div>
        </section>
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

    // In home page, strictly show only the latest 3 publications
    const homePubs = pubs.slice(0, 3);

    container.innerHTML = homePubs.map(pub => {
      const title = currentLang === 'en' && pub.titulo_en ? pub.titulo_en : (pub.titulo_es || pub.titulo || '');
      const summary = currentLang === 'en' && pub.resumen_en ? pub.resumen_en : (pub.resumen_es || pub.resumen || '');
      const journal = pub.revista || pub.publicadoEn || '';
      const year = pub.anio || pub.fechaPublicacion || 2025;
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
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
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

    // On home page, limit to latest 3 news by date
    const homeNews = news.slice(0, 3);

    container.innerHTML = homeNews.map(item => {
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

  // =========================================================================
  // 3b. Research Lines Hydration
  // =========================================================================
  async function loadResearch() {
    const container = document.getElementById('researchContainer');
    if (!container) return;

    try {
      const response = await fetch('data/lineas-investigacion.json');
      if (!response.ok) return;
      const data = await response.json();
      cachedResearch = data.sort((a, b) => (a.orden || 99) - (b.orden || 99));
      renderResearch(cachedResearch);
    } catch (err) {
      // Keep static fallback
    }
  }

  function renderResearch(lines) {
    const container = document.getElementById('researchContainer');
    if (!container || !lines || lines.length === 0) return;

    container.innerHTML = lines.map(line => {
      const title = currentLang === 'en' && line.titulo_en ? line.titulo_en : (line.titulo_es || '');
      const desc = currentLang === 'en' && line.descripcion_en ? line.descripcion_en : (line.descripcion_es || '');
      const icon = line.icono || 'imgs/icons/sprout.svg';

      return `
        <article class="research-card">
          <div class="research-icon-wrapper">
            <img src="${icon}" alt="" class="research-icon" />
          </div>
          <h3>${title}</h3>
          <p>${desc}</p>
        </article>
      `;
    }).join('');
  }

  // =========================================================================
  // 3c. Services Hydration
  // =========================================================================
  async function loadServices() {
    const container = document.getElementById('servicesContainer');
    if (!container) return;

    try {
      const response = await fetch('data/servicios.json');
      if (!response.ok) return;
      const data = await response.json();
      cachedServices = data.sort((a, b) => (a.orden || 99) - (b.orden || 99));
      renderServices(cachedServices);
    } catch (err) {
      // Keep static fallback
    }
  }

  function renderServices(services) {
    const container = document.getElementById('servicesContainer');
    if (!container || !services || services.length === 0) return;

    container.innerHTML = services.map(s => {
      const title = currentLang === 'en' && s.titulo_en ? s.titulo_en : (s.titulo_es || '');
      const desc = currentLang === 'en' && s.descripcion_en ? s.descripcion_en : (s.descripcion_es || '');
      const icon = s.icono || 'imgs/icons/gear.svg';

      return `
        <div class="service-card">
          <div class="service-icon-wrapper">
            <img src="${icon}" alt="" class="service-icon" />
          </div>
          <h3 class="service-title">${title}</h3>
          <p class="service-desc">${desc}</p>
        </div>
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
