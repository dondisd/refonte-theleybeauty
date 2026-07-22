/* THE LEY BEAUTY — parcours de réservation en 5 étapes (maquette fluide).
   Aucune donnée transmise : démonstration. Transitions GSAP si disponible. */
(() => {
  'use strict';

  const VILLES = { mtl: { nom: 'Montréal', devise: 'CAD' }, hou: { nom: 'Houston', devise: 'USD' } };
  const PRESTAS = {
    install: 'Install & style',
    colour: 'Colour transformation',
    ponytail: 'Sleek ponytail',
    silk: 'Silk press'
  };
  const ACOMPTE = 50;

  const etat = { etape: 1, ville: null, presta: null, prix: 0, date: null, heure: null };
  const steps = [...document.querySelectorAll('.step')];
  const dots = [...document.querySelectorAll('[data-step-dot]')];
  const btnPrev = document.querySelector('[data-prev]');
  const btnNext = document.querySelector('[data-next]');
  const stepNav = document.querySelector('.step-nav');

  /* Pré-sélection par ?city= */
  const param = new URLSearchParams(location.search).get('city');

  function recap(cle, val) { const el = document.querySelector(`[data-recap="${cle}"]`); if (el) el.textContent = val; }

  function montre(n) {
    const courant = document.querySelector('.step.on');
    const suivant = steps.find((s) => +s.dataset.step === n);
    if (!suivant || courant === suivant) return;
    etat.etape = n;
    courant.classList.remove('on');
    suivant.classList.add('on');
    if (window.gsap) gsap.fromTo(suivant, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' });
    dots.forEach((d) => d.classList.toggle('on', +d.dataset.stepDot <= Math.min(n, 5)));
    btnPrev.hidden = n <= 1 || n >= 6;
    stepNav.hidden = n >= 6;
    btnNext.textContent = n === 5 ? `Pay $${ACOMPTE} deposit →` : 'Continue →';
    valide();
    scrollTo({ top: 0, behavior: 'smooth' });
  }

  function valide() {
    const n = etat.etape;
    let ok = false;
    if (n === 1) ok = !!etat.ville;
    if (n === 2) ok = !!etat.presta;
    if (n === 3) ok = !!(etat.date && etat.heure);
    if (n === 4) {
      const f = document.querySelector('.resa-form');
      ok = f.querySelector('[name="nom"]').value.trim().length > 1 &&
           /.+@.+\..+/.test(f.querySelector('[name="email"]').value) &&
           f.querySelector('[name="tel"]').value.trim().length >= 7;
    }
    if (n === 5) {
      const p = document.querySelector('.pay-form');
      ok = p.querySelector('[name="cc"]').value.replace(/\D/g, '').length >= 15 &&
           p.querySelector('[name="exp"]').value.replace(/\D/g, '').length >= 4 &&
           p.querySelector('[name="cvc"]').value.replace(/\D/g, '').length >= 3;
    }
    btnNext.disabled = !ok;
  }

  /* Étape 1 : ville */
  document.querySelectorAll('.ville').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.ville').forEach((x) => x.classList.toggle('actif', x === b));
      etat.ville = b.dataset.ville;
      recap('ville', VILLES[etat.ville].nom);
      majTotaux();
      valide();
      setTimeout(() => montre(2), 260);
    });
  });

  /* Étape 2 : prestation */
  document.querySelectorAll('.presta').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.presta').forEach((x) => x.classList.toggle('actif', x === b));
      etat.presta = b.dataset.presta;
      etat.prix = +b.dataset.prix;
      recap('presta', PRESTAS[etat.presta]);
      majTotaux();
      valide();
      setTimeout(() => montre(3), 260);
    });
  });

  function majTotaux() {
    const devise = etat.ville ? VILLES[etat.ville].devise : '';
    recap('acompte', `$${ACOMPTE} ${devise}`.trim());
    recap('total', etat.prix ? `from $${etat.prix} ${devise}`.trim() : '–');
  }

  /* Étape 3 : calendrier (21 jours, fermé dim./lun. ; créneaux déterministes) */
  const joursBox = document.querySelector('.cal-jours');
  const heuresBox = document.querySelector('.cal-heures');
  const FMT = new Intl.DateTimeFormat('en-CA', { weekday: 'short', day: 'numeric', month: 'short' });

  function slotsPour(d) {
    const seed = d.getDate() + d.getMonth() * 31;
    return ['9:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00']
      .filter((_, i) => (seed * 7 + i * 13) % 10 > 2);
  }

  const jours = [];
  for (let i = 1; jours.length < 21; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    if (d.getDay() === 0 || d.getDay() === 1) continue;
    jours.push(d);
  }
  jours.forEach((d) => {
    const b = document.createElement('button');
    b.className = 'cal-jour';
    b.setAttribute('role', 'option');
    const [sem, mois, num] = FMT.format(d).replace(',', '').split(' ');
    b.innerHTML = `<small>${sem}</small><b>${num}</b><small>${mois}</small>`;
    b.addEventListener('click', () => {
      [...joursBox.children].forEach((x) => x.classList.toggle('actif', x === b));
      etat.date = d; etat.heure = null;
      recap('date', FMT.format(d)); recap('heure', '–');
      heuresBox.innerHTML = '';
      slotsPour(d).forEach((h) => {
        const hb = document.createElement('button');
        hb.className = 'cal-heure'; hb.textContent = h;
        hb.setAttribute('role', 'option');
        hb.addEventListener('click', () => {
          [...heuresBox.children].forEach((x) => x.classList.toggle('actif', x === hb));
          etat.heure = h; recap('heure', h); valide();
        });
        heuresBox.appendChild(hb);
      });
      if (window.gsap) gsap.from(heuresBox.children, { opacity: 0, y: 10, stagger: 0.04, duration: 0.35, ease: 'power2.out' });
      valide();
    });
    joursBox.appendChild(b);
  });

  /* Étapes 4-5 : validation en continu + mise en forme de la carte */
  document.querySelectorAll('.resa-form input, .pay-form input').forEach((i) => i.addEventListener('input', valide));
  const cc = document.querySelector('[name="cc"]');
  cc.addEventListener('input', () => {
    cc.value = cc.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    document.querySelector('.pc-num').textContent = cc.value.padEnd(19, '•') || '•••• •••• •••• ••••';
  });
  const exp = document.querySelector('[name="exp"]');
  exp.addEventListener('input', () => {
    const v = exp.value.replace(/\D/g, '').slice(0, 4);
    exp.value = v.length > 2 ? v.slice(0, 2) + ' / ' + v.slice(2) : v;
  });
  document.querySelector('[name="nom"]').addEventListener('input', (e) => {
    document.querySelector('.pc-nom').textContent = (e.target.value || 'YOUR NAME').toUpperCase();
  });

  /* Navigation */
  btnPrev.addEventListener('click', () => montre(etat.etape - 1));
  btnNext.addEventListener('click', () => {
    if (btnNext.disabled) return;
    if (etat.etape < 5) { montre(etat.etape + 1); return; }
    /* « Paiement » : maquette, rien n'est transmis */
    document.querySelector('.done-recap').textContent =
      `${PRESTAS[etat.presta]} · ${VILLES[etat.ville].nom} · ${FMT.format(etat.date)} at ${etat.heure}`;
    montre(6);
    document.querySelector('.done-check').classList.add('joue');
  });

  if (param && VILLES[param]) document.querySelector(`.ville[data-ville="${param}"]`).click();
  valide();
})();
