/**
 * LBBS - Laboratorio de Bioquímica y Biofísica de Sistemas (UNQ / CBMS)
 * Accessible Zero-Dependency Hero Carousel
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', initCarousel);

  function initCarousel() {
    const carouselEl = document.getElementById('heroCarousel');
    if (!carouselEl) return;

    const slides = carouselEl.querySelectorAll('.carousel-slide');
    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');
    const dots = carouselEl.querySelectorAll('.carousel-dot');

    if (slides.length <= 1) return;

    let currentIndex = 0;
    let timer = null;
    const intervalTime = 5000;
    let touchStartX = 0;
    let touchEndX = 0;

    function showSlide(index) {
      if (index < 0) {
        currentIndex = slides.length - 1;
      } else if (index >= slides.length) {
        currentIndex = 0;
      } else {
        currentIndex = index;
      }

      slides.forEach((slide, idx) => {
        if (idx === currentIndex) {
          slide.classList.add('active');
          slide.setAttribute('aria-hidden', 'false');
        } else {
          slide.classList.remove('active');
          slide.setAttribute('aria-hidden', 'true');
        }
      });

      dots.forEach((dot, idx) => {
        if (idx === currentIndex) {
          dot.classList.add('active');
          dot.setAttribute('aria-selected', 'true');
        } else {
          dot.classList.remove('active');
          dot.setAttribute('aria-selected', 'false');
        }
      });
    }

    function nextSlide() {
      showSlide(currentIndex + 1);
    }

    function prevSlide() {
      showSlide(currentIndex - 1);
    }

    function startAutoPlay() {
      stopAutoPlay();
      timer = setInterval(nextSlide, intervalTime);
    }

    function stopAutoPlay() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    // Button controls
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        nextSlide();
        startAutoPlay();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        prevSlide();
        startAutoPlay();
      });
    }

    // Dots controls
    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const slideIdx = parseInt(dot.getAttribute('data-slide'), 10);
        showSlide(slideIdx);
        startAutoPlay();
      });
    });

    // Pause on Hover & Focus (WCAG AA requirement)
    carouselEl.addEventListener('mouseenter', stopAutoPlay);
    carouselEl.addEventListener('mouseleave', startAutoPlay);
    carouselEl.addEventListener('focusin', stopAutoPlay);
    carouselEl.addEventListener('focusout', startAutoPlay);

    // Keyboard navigation
    carouselEl.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        prevSlide();
        startAutoPlay();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
        startAutoPlay();
      }
    });

    // Touch Swipe Support
    carouselEl.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    carouselEl.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });

    function handleSwipe() {
      const threshold = 45;
      if (touchEndX < touchStartX - threshold) {
        nextSlide();
        startAutoPlay();
      } else if (touchEndX > touchStartX + threshold) {
        prevSlide();
        startAutoPlay();
      }
    }

    // Initialize
    showSlide(0);
    startAutoPlay();
  }
})();
