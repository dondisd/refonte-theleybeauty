/* THE LEY BEAUTY — miroir à métamorphose (objet-héros), avant/après scrubbed,
   parcours de réservation deux villes avec calendrier Acuity intégré. */
(() => {
  'use strict';

  /* Reveals */
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.16 });
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fx = !reduced && window.gsap && window.ScrollFX;
  if (!fx) return;

  document.body.classList.add('fx');
  ScrollFX.init();

  /* ── LE MIROIR : 4 couleurs pilotées par le scroll ──────────────── */
  const STATES = [
    { name: 'Cherry Burgundy', glow: '#8a2f3d' },
    { name: 'Midnight Blue', glow: '#2f4d8a' },
    { name: 'Jet Black', glow: '#454b54' },
    { name: 'Platinum Blonde', glow: '#8a6f2f' }
  ];
  const layers = [...document.querySelectorAll('.mirror-frame .layer')];
  const frameEl = document.querySelector('.mirror-frame');
  const hudNum = document.querySelector('.hud-num');
  const hudName = document.querySelector('.hud-name');
  const bigword = document.querySelector('.bigword');

  const mirrorTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.mirror', start: 'top top', end: '+=320%', scrub: 1, pin: true, anticipatePin: 1,
      onUpdate: (st) => {
        const i = Math.min(STATES.length - 1, Math.floor(st.progress * STATES.length));
        const s = STATES[i];
        if (hudName.textContent !== s.name) {
          hudNum.textContent = '0' + (i + 1) + ' / 04';
          hudName.textContent = s.name;
          bigword.textContent = s.name.split(' ').pop().toUpperCase();
          frameEl.style.setProperty('--glow', s.glow);
        }
      }
    }
  });
  layers.forEach((el, i) => {
    if (i === 0) return;
    mirrorTl.to(el, { opacity: 1, duration: 0.55, ease: 'none' }, i - 0.55);
  });
  mirrorTl.fromTo('.mirror-frame', { scale: 0.97 }, { scale: 1.02, ease: 'none', duration: STATES.length - 0.5 }, 0);

  /* 3D réel : le miroir s'incline en perspective sous le pointeur */
  if (matchMedia('(pointer: fine)').matches) {
    const mirrorSec = document.querySelector('.mirror');
    const rx = gsap.quickTo(frameEl, 'rotationX', { duration: 0.5, ease: 'power2.out' });
    const ry = gsap.quickTo(frameEl, 'rotationY', { duration: 0.5, ease: 'power2.out' });
    gsap.set(frameEl, { transformPerspective: 900 });
    mirrorSec.addEventListener('pointermove', (e) => {
      const x = e.clientX / innerWidth - 0.5;
      const y = e.clientY / innerHeight - 0.5;
      ry(x * 10); rx(-y * 7);
    });
    mirrorSec.addEventListener('pointerleave', () => { ry(0); rx(0); });
  }

  /* ── AVANT / APRÈS : le rideau suit le scroll ───────────────────── */
  const ba = document.querySelector('.ba');
  const wipe = { v: 12 };
  gsap.to(wipe, {
    v: 96, ease: 'none',
    scrollTrigger: { trigger: ba, start: 'top 75%', end: 'bottom 45%', scrub: 0.6 },
    onUpdate: () => ba.style.setProperty('--wipe', wipe.v + '%')
  });

  /* Parallaxe légère du fond de hero */
  gsap.to('.hero-bg', {
    yPercent: 12, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  /* Ancres via Lenis */
  if (ScrollFX.lenis) {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const t = document.querySelector(a.getAttribute('href'));
        if (!t) return;
        e.preventDefault();
        ScrollFX.lenis.scrollTo(t, { offset: 0 });
      });
    });
  }
})();
