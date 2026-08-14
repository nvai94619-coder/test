
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const langButtons = document.querySelectorAll('.lang-btn');
const translatable = document.querySelectorAll('[data-ky][data-ru]');
function setLanguage(lang) {
  document.documentElement.lang = lang;
  translatable.forEach((el) => {
    const value = el.dataset[lang];
    if (!value) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = value;
    else if (el.hasAttribute('data-html')) el.innerHTML = value;
    else el.textContent = value;
  });
  langButtons.forEach((button) => button.classList.toggle('active', button.dataset.lang === lang));
  try { localStorage.setItem('jbm-lang', lang); } catch (e) {}
  window.dispatchEvent(new CustomEvent('jbm:languagechange', { detail: { lang } }));
}
langButtons.forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
let savedLang = 'ky';
try { savedLang = localStorage.getItem('jbm-lang') || 'ky'; } catch (e) {}
setLanguage(savedLang);

const menuButton = document.querySelector('.menu-btn');
const navigation = document.querySelector('.main-nav');
if (menuButton && navigation) {
  menuButton.addEventListener('click', () => {
    const open = navigation.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => navigation.classList.remove('open')));
}

const page = document.body.dataset.page;
document.querySelectorAll('.main-nav a[data-page]').forEach((link) => link.classList.toggle('active', link.dataset.page === page));

const header = document.querySelector('.site-header');
function updateHeader() { if (header) header.classList.toggle('scrolled', window.scrollY > 18); }
window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

const revealItems = document.querySelectorAll('.reveal');
if (prefersReducedMotion || !('IntersectionObserver' in window)) revealItems.forEach((el) => el.classList.add('visible'));
else {
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      obs.unobserve(entry.target);
    });
  }, { threshold: .08, rootMargin: '0px 0px -6% 0px' });
  revealItems.forEach((el) => observer.observe(el));
}

const counters = document.querySelectorAll('[data-count]');
if ('IntersectionObserver' in window && !prefersReducedMotion) {
  const countObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count || 0);
      const suffix = el.dataset.suffix || '';
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / 1100, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = `${new Intl.NumberFormat('ru-RU').format(Math.round(target * eased))}${suffix}`;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      obs.unobserve(el);
    });
  }, { threshold: .55 });
  counters.forEach((counter) => { counter.textContent = `0${counter.dataset.suffix || ''}`; countObserver.observe(counter); });
}

const filterButtons = document.querySelectorAll('.filter-btn');
const filterItems = document.querySelectorAll('[data-category]');
filterButtons.forEach((button) => button.addEventListener('click', () => {
  const filter = button.dataset.filter;
  filterButtons.forEach((item) => item.classList.toggle('active', item === button));
  filterItems.forEach((item) => item.classList.toggle('is-hidden', filter !== 'all' && item.dataset.category !== filter));
}));

// Native internal navigation is intentionally used here.
// This avoids navigation failures on static hosts such as GitHub Pages.

// Lightweight premium hover depth. Uses only transforms and is disabled on touch/reduced-motion devices.
if (!prefersReducedMotion && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
  document.querySelectorAll('.project-card, .program-card, .event-card, .team-card, .contact-card').forEach((card) => {
    card.setAttribute('data-tilt', '');
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.transform = `perspective(900px) rotateX(${(-y * 2.5).toFixed(2)}deg) rotateY(${(x * 3).toFixed(2)}deg) translateY(-5px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

// Scroll progress indicator.
let scrollTicking = false;
function updateScrollProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const progress = max > 0 ? (window.scrollY / max) * 100 : 0;
  document.body.style.setProperty('--scroll-progress', `${progress}%`);
  scrollTicking = false;
}
window.addEventListener('scroll', () => {
  if (!scrollTicking) { requestAnimationFrame(updateScrollProgress); scrollTicking = true; }
}, { passive:true });
updateScrollProgress();
