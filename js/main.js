/**
 * LBBS - Laboratorio de Bioquímica y Biofísica de Sistemas (UNQ / CBMS)
 * Main Application Logic: Navigation Drawer, Smooth Scrolling & Scroll-Spy
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', initMain);

  function initMain() {
    initNavDrawer();
    initScrollSpy();
  }

  // =========================================================================
  // 1. Mobile Navigation Drawer
  // =========================================================================
  function initNavDrawer() {
    const toggleBtn = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    if (!toggleBtn || !navMenu) return;

    toggleBtn.addEventListener('click', () => {
      const isOpen = navMenu.classList.contains('open');
      if (isOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    // Close when clicking any nav link
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          closeDrawer();
        }
      });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (navMenu.classList.contains('open')) {
        if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
          closeDrawer();
        }
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('open')) {
        closeDrawer();
        toggleBtn.focus();
      }
    });

    function openDrawer() {
      navMenu.classList.add('open');
      toggleBtn.setAttribute('aria-expanded', 'true');
    }

    function closeDrawer() {
      navMenu.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  }

  // =========================================================================
  // 2. Active Section Scroll-Spy
  // =========================================================================
  function initScrollSpy() {
    const sections = document.querySelectorAll('main > section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    if (sections.length === 0 || navLinks.length === 0) return;

    window.addEventListener('scroll', throttle(onScroll, 100), { passive: true });

    function onScroll() {
      const scrollPos = window.scrollY + 120; // Header offset buffer

      let currentSectionId = '';
      sections.forEach((section) => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          currentSectionId = section.getAttribute('id');
        }
      });

      // Special case: bottom of the page highlights #contacto
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 50) {
        currentSectionId = 'contacto';
      }

      navLinks.forEach((link) => {
        const href = link.getAttribute('href');
        if (href === `#${currentSectionId}`) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }

    function throttle(fn, wait) {
      let time = Date.now();
      return function () {
        if ((time + wait - Date.now()) < 0) {
          fn();
          time = Date.now();
        }
      };
    }
  }
})();
