/* THE LEY — LE FILM. Le scroll est la télécommande : chaque séquence est un
   canvas scrubé (frames webp), préchargée pendant que la précédente joue.
   Rideau : le néon s'allume puis rejoint l'enseigne du salon (raccord lumière). */
(() => {
  'use strict';

  /* Reveals (sections non-film) */
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.16 });
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fx = !reduced && window.gsap && window.ScrollFX;
  if (!fx) { const r = document.querySelector('.rideau'); if (r) r.remove(); return; }

  document.body.classList.add('fx');
  ScrollFX.init();

  /* ── Gestion des séquences du film ─────────────────────────────── */
  const seqs = [...document.querySelectorAll('.seq')].map((el) => ({
    el,
    dir: el.dataset.frames,
    count: +el.dataset.count,
    pin: +el.dataset.pin,
    canvas: el.querySelector('canvas'),
    poster: el.querySelector('.seq-poster'),
    imgs: null,
    loading: null,
    state: { f: 0 }
  }));

  function charge(seq) {
    if (seq.loading) return seq.loading;
    seq.imgs = [];
    const jobs = [];
    for (let i = 1; i <= seq.count; i++) {
      const im = new Image();
      im.src = `${seq.dir}/frame-${String(i).padStart(3, '0')}.webp`;
      seq.imgs.push(im);
      jobs.push(new Promise((res) => { im.complete ? res() : (im.onload = im.onerror = res); }));
    }
    seq.loading = Promise.all(jobs);
    return seq.loading;
  }

  function dimensionne(seq) {
    seq.canvas.width = seq.el.clientWidth * Math.min(devicePixelRatio, 2);
    seq.canvas.height = seq.el.clientHeight * Math.min(devicePixelRatio, 2);
  }

  function rend(seq) {
    const im = seq.imgs && seq.imgs[Math.max(0, Math.min(seq.count - 1, Math.round(seq.state.f)))];
    if (!im || !im.naturalWidth) return;
    const ctx = seq.canvas.getContext('2d');
    const cw = seq.canvas.width, ch = seq.canvas.height;
    const s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
    if (seq.poster && !seq.poster.classList.contains('cache')) seq.poster.classList.add('cache');
  }

  seqs.forEach((seq, i) => {
    dimensionne(seq);
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: seq.el, start: 'top top', end: `+=${seq.pin}%`,
        scrub: 0.8, pin: true, anticipatePin: 1,
        onEnter: () => { charge(seq).then(() => rend(seq)); if (seqs[i + 1]) charge(seqs[i + 1]); }
      }
    });
    tl.to(seq.state, { f: seq.count - 1, ease: 'none', duration: 1, onUpdate: () => rend(seq) }, 0);
    seq.tl = tl;
  });
  addEventListener('resize', () => seqs.forEach((s) => { dimensionne(s); rend(s); }));

  /* Précharge : la 1 tout de suite, la 2 dès que la page est posée */
  charge(seqs[0]).then(() => rend(seqs[0]));
  addEventListener('load', () => { if (seqs[1]) charge(seqs[1]); });

  /* ── Textes du film (persistance, loi de la référence) ─────────── */
  const s1tl = seqs[0].tl;
  s1tl.to('.s1a', { opacity: 1, duration: 0.12 }, 0.06)
      .to('.s1a', { opacity: 0, duration: 0.1 }, 0.44)
      .to('.s1b', { opacity: 1, duration: 0.14 }, 0.6)
      .to('.scroll-hint', { opacity: 0, duration: 0.06 }, 0.1)
      .to('.hud-kicker:not(.k4)', { opacity: 0, duration: 0.1 }, 0.44);
  seqs[1].tl.to('.s2a', { opacity: 1, duration: 0.14 }, 0.08)
            .to('.s2a', { opacity: 0, duration: 0.12 }, 0.82);

  /* Séquence 4 : HUD des teintes soudé à la métamorphose */
  const TEINTES = [
    { p: 0, num: '01 / 04', nom: 'Jet Black' },
    { p: 0.18, num: '02 / 04', nom: 'Cherry Burgundy' },
    { p: 0.45, num: '03 / 04', nom: 'Midnight Blue' },
    { p: 0.72, num: '04 / 04', nom: 'Platinum Blonde' }
  ];
  const s4 = seqs[3];
  const hudNum = document.querySelector('.teinte-hud .hud-num');
  const hudNom = document.querySelector('.teinte-hud .hud-name');
  s4.tl.to('.teinte-hud', { opacity: 1, duration: 0.1 }, 0.04)
       .to('.k4', { opacity: 1, duration: 0.1 }, 0.04);
  s4.tl.eventCallback('onUpdate', () => {
    const p = s4.tl.progress();
    let t = TEINTES[0];
    for (const c of TEINTES) if (p >= c.p) t = c;
    if (hudNom.textContent !== t.nom) { hudNum.textContent = t.num; hudNom.textContent = t.nom; }
  });

  /* Séquence 6 : le texte et le CTA se posent avec le fauteuil */
  const s6 = seqs[4];
  s6.tl.to('.s6a', { opacity: 1, duration: 0.16 }, 0.3)
       .to('.hud-cta', { opacity: 1, duration: 0.16 }, 0.55);

  /* ── Rideau : néon qui s'allume puis rejoint l'enseigne du salon ── */
  const rideau = document.querySelector('.rideau');
  if (rideau) {
    document.body.classList.add('verrou');
    const neon = rideau.querySelector('.rideau-neon');
    const fin = () => { rideau.remove(); document.body.classList.remove('verrou'); };
    const tlR = gsap.timeline({ onComplete: fin });
    tlR.to(rideau, { backgroundColor: 'rgba(6,8,11,0)', duration: 0.7, ease: 'power1.inOut' }, 1.5)
       .to(neon, { scale: 0.24, xPercent: -34, yPercent: -120, opacity: 0, duration: 0.9, ease: 'power2.inOut' }, 1.55)
       .from('.nav', { y: -20, opacity: 0, duration: 0.5, ease: 'power2.out' }, 2.1);
    const skip = () => { tlR.progress(1); removeEventListener('pointerdown', skip); removeEventListener('keydown', skip); };
    addEventListener('pointerdown', skip); addEventListener('keydown', skip);
  }
})();
