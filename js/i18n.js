/**
 * LBBS - Laboratorio de Bioquímica y Biofísica de Sistemas (UNQ / CBMS)
 * Client-Side Bilingual Internationalization (ES / EN)
 */

(function () {
  'use strict';

  let translations = null;
  let currentLang = localStorage.getItem('lbbs_lang') || 'es';

  document.addEventListener('DOMContentLoaded', initI18n);

  async function initI18n() {
    try {
      const response = await fetch('data/translations.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      translations = await response.json();
    } catch (err) {
      console.warn('Could not load translations.json, falling back to static markup:', err);
      return;
    }

    const btnEs = document.getElementById('btnLangEs');
    const btnEn = document.getElementById('btnLangEn');

    if (btnEs) {
      btnEs.addEventListener('click', () => setLanguage('es'));
    }
    if (btnEn) {
      btnEn.addEventListener('click', () => setLanguage('en'));
    }

    // Apply initial language
    setLanguage(currentLang, false);
  }

  function setLanguage(lang, persist = true) {
    if (!translations || !translations[lang]) return;

    currentLang = lang;
    if (persist) {
      try {
        localStorage.setItem('lbbs_lang', lang);
      } catch (e) {
        // LocalStorage disabled or quota exceeded
      }
    }

    // Update HTML lang attribute
    document.documentElement.setAttribute('lang', lang);

    // Update active class on toggle buttons
    const btnEs = document.getElementById('btnLangEs');
    const btnEn = document.getElementById('btnLangEn');
    if (btnEs && btnEn) {
      if (lang === 'es') {
        btnEs.classList.add('active');
        btnEn.classList.remove('active');
      } else {
        btnEn.classList.add('active');
        btnEs.classList.remove('active');
      }
    }

    // Update static DOM elements with [data-i18n]
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const text = getNestedTranslation(translations[lang], key);
      if (text !== undefined && text !== null) {
        el.innerHTML = text;
      }
    });

    // Dispatch event for dynamic loaders (content-loader.js)
    window.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { language: lang }
    }));
  }

  function getNestedTranslation(obj, path) {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((prev, curr) => (prev ? prev[curr] : undefined), obj);
  }

  // Export for external callers if needed
  window.setLBBSLanguage = setLanguage;
})();
