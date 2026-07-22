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

  /* ── RIDEAU D'OUVERTURE : néon qui s'allume -> les cheveux balaient ->
     le hero émerge avec une entrée caméra (raccord matière vague->vague) ── */
  const rideau = document.querySelector('.rideau');
  if (rideau) {
    document.body.classList.add('verrou');
    const vague = rideau.querySelector('.rideau-vague');
    const finRideau = () => {
      rideau.remove();
      document.body.classList.remove('verrou');
    };
    const tlRideau = gsap.timeline({ onComplete: finRideau });
    tlRideau
      .add(() => { vague.play().catch(() => {}); }, 1.15)
      .to(vague, { x: 0, duration: 0.85, ease: 'power2.in' }, 1.25)
      .to(rideau, { opacity: 0, duration: 0.7, ease: 'power1.inOut' }, 2.25)
      .from('.hero-inner', { scale: 1.22, y: 34, duration: 1.1, ease: 'power3.out' }, 2.3)
      .from('.nav', { y: -20, opacity: 0, duration: 0.6, ease: 'power2.out' }, 2.6);
    /* Skippable au premier geste */
    const skip = () => { tlRideau.progress(1); removeEventListener('pointerdown', skip); removeEventListener('keydown', skip); };
    addEventListener('pointerdown', skip); addEventListener('keydown', skip);
  }

  /* ── PLONGÉE-CAMÉRA hero -> miroir (loi 2 du scroll-storytelling) :
     on plonge DANS la vague, le miroir émerge pré-zoomé ── */
  const dive = gsap.timeline({
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=120%', scrub: 0.8, pin: true, anticipatePin: 1 }
  });
  dive
    .to('.hero-inner', { scale: 2.7, opacity: 0, ease: 'power1.in', duration: 1 }, 0)
    .to('.hero-bg', { scale: 1.55, ease: 'none', duration: 1 }, 0)
    .to('.hero-veil', { opacity: 0.15, ease: 'none', duration: 0.6 }, 0)
    .to('.hero-veil', { opacity: 1, ease: 'power1.in', duration: 0.4 }, 0.6)
    .to('.scroll-hint', { opacity: 0, duration: 0.2 }, 0);

  /* Hero en couches : parallaxe pointeur (loi 4) */
  if (matchMedia('(pointer: fine)').matches) {
    const hx = gsap.quickTo('.hero-inner', 'x', { duration: 0.6, ease: 'power2.out' });
    const hy = gsap.quickTo('.hero-inner', 'y', { duration: 0.6, ease: 'power2.out' });
    const bx = gsap.quickTo('.hero-bg', 'x', { duration: 0.8, ease: 'power2.out' });
    const by = gsap.quickTo('.hero-bg', 'y', { duration: 0.8, ease: 'power2.out' });
    document.querySelector('.hero').addEventListener('pointermove', (e) => {
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      hx(x * 16); hy(y * 10); bx(x * -26); by(y * -16);
    });
  }

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
  /* Émergence après la plongée : le miroir arrive pré-zoomé et se pose */
  mirrorTl.fromTo('.mirror-frame', { scale: 1.26, opacity: 0.3 }, { scale: 1, opacity: 1, ease: 'power2.out', duration: 0.45 }, 0);
  mirrorTl.to('.mirror-frame', { scale: 1.03, ease: 'none', duration: STATES.length - 0.6 }, 0.5);
  mirrorTl.fromTo('.mirror-head', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 0.15);

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

  /* LE FIL : chaque mèche se dessine au scroll et relie à la section suivante */
  document.querySelectorAll('.fil path').forEach((p) => {
    const L = p.getTotalLength();
    gsap.set(p, { strokeDasharray: L, strokeDashoffset: L });
    gsap.to(p, {
      strokeDashoffset: 0, ease: 'none',
      scrollTrigger: { trigger: p.closest('.fil'), start: 'top 92%', end: 'bottom 30%', scrub: 0.8 }
    });
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
