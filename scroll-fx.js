/*!
 * ScrollFX v1 — bibliothèque de signatures scroll-driven pour les refontes.
 * Vanilla + GSAP/ScrollTrigger (+ Lenis optionnel). Aucun framework.
 * Chaque signature respecte prefers-reduced-motion : état final statique, zéro animation.
 * Charger APRÈS vendor/gsap.min.js, vendor/ScrollTrigger.min.js, vendor/lenis.min.js.
 */
(function (global) {
  'use strict';

  var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FX = { reduced: reduced, lenis: null };

  /* ---------------------------------------------------------------- init */

  FX.init = function (opts) {
    opts = opts || {};
    gsap.registerPlugin(ScrollTrigger);
    document.documentElement.style.scrollBehavior = 'auto';
    if (!reduced && opts.smooth !== false && global.Lenis) {
      FX.lenis = new Lenis({ autoRaf: false, lerp: opts.lerp || 0.1 });
      FX.lenis.on('scroll', ScrollTrigger.update);
      FX._tick = function (t) { if (FX.lenis) FX.lenis.raf(t * 1000); };
      gsap.ticker.add(FX._tick);
      gsap.ticker.lagSmoothing(0);
    }
  };

  /* Mode capture (Playwright) : scroll natif déterministe, plus de smoothing. */
  FX.captureMode = function () {
    if (FX._tick) { gsap.ticker.remove(FX._tick); FX._tick = null; }
    if (FX.lenis) { FX.lenis.destroy(); FX.lenis = null; }
    document.documentElement.style.scrollBehavior = 'auto';
    global.__SCROLLFX_CAPTURE = true;
  };

  function num(v, d) { v = parseFloat(v); return isNaN(v) ? d : v; }

  /* ------------------------------------------- 01. pinAssembly / exploded
   * Section épinglée ; les enfants [data-part] volent depuis data-from-x/y/rot/
   * scale/fade jusqu'à leur place (assemblage type burger). explodedLayers fait
   * l'inverse : parts assemblées qui s'écartent vers data-to-x/y/rot (éclaté Rolex). */

  FX.pinAssembly = function (section, opts) {
    opts = opts || {};
    var parts = section.querySelectorAll('[data-part]');
    if (reduced || !parts.length) return null;
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: section, start: 'top top', end: opts.end || '+=250%',
        scrub: opts.scrub != null ? opts.scrub : 1, pin: true, anticipatePin: 1
      }
    });
    parts.forEach(function (el, i) {
      var d = el.dataset;
      tl.from(el, {
        x: num(d.fromX, 0), y: num(d.fromY, -320),
        rotation: num(d.fromRot, 0), scale: num(d.fromScale, 1),
        opacity: d.fromFade != null ? 0 : 1,
        ease: 'power2.out', duration: 1
      }, i * (opts.stagger != null ? opts.stagger : 0.35));
    });
    return tl;
  };

  FX.explodedLayers = function (section, opts) {
    opts = opts || {};
    var parts = section.querySelectorAll('[data-part]');
    if (reduced || !parts.length) return null;
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: section, start: 'top top', end: opts.end || '+=220%',
        scrub: opts.scrub != null ? opts.scrub : 1, pin: true, anticipatePin: 1
      }
    });
    parts.forEach(function (el, i) {
      var d = el.dataset;
      tl.to(el, {
        x: num(d.toX, 0), y: num(d.toY, (i - parts.length / 2) * 90),
        rotation: num(d.toRot, 0), ease: 'power1.inOut', duration: 1
      }, i * 0.12);
    });
    if (opts.reassemble) tl.to(parts, { x: 0, y: 0, rotation: 0, duration: 1, stagger: 0.08 }, '+=0.3');
    return tl;
  };

  /* --------------------------------------------------- 02. canvas scrub
   * Scrub façon Apple : le scroll pilote une frame. drawFrame(ctx, i, total)
   * dessine la frame i (procédural OU drawImage d'une séquence préchargée). */

  FX.canvasScrub = function (section, canvas, frameCount, drawFrame, opts) {
    opts = opts || {};
    var state = { f: 0 };
    var ctx = canvas.getContext('2d');
    function render() { drawFrame(ctx, Math.round(state.f), frameCount); }
    if (reduced) { state.f = frameCount - 1; render(); return null; }
    render();
    return gsap.to(state, {
      f: frameCount - 1, ease: 'none',
      scrollTrigger: {
        trigger: section, start: 'top top', end: opts.end || '+=300%',
        scrub: opts.scrub != null ? opts.scrub : 0.5,
        pin: opts.pin !== false, anticipatePin: 1
      },
      onUpdate: render
    });
  };

  /* Séquence d'images (sortie de scripts/video-to-frames.js). Précharge tout,
   * dessine en cover. Renvoie une Promise. */
  FX.imageSequenceScrub = function (section, canvas, urls, opts) {
    var imgs = urls.map(function (u) { var im = new Image(); im.src = u; return im; });
    return Promise.all(imgs.map(function (im) {
      return new Promise(function (res) { im.complete ? res() : (im.onload = im.onerror = res); });
    })).then(function () {
      return FX.canvasScrub(section, canvas, imgs.length, function (ctx, i) {
        var im = imgs[Math.min(i, imgs.length - 1)];
        if (!im.naturalWidth) return;
        var cw = canvas.width, ch = canvas.height;
        var s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
        var w = im.naturalWidth * s, h = im.naturalHeight * s;
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
      }, opts);
    });
  };

  /* Turntable produit 360° : même mécanique, sémantique différente (catalogue). */
  FX.turntable = FX.canvasScrub;

  /* --------------------------------------------- 03. crossfade de couches
   * Couches [data-layer] empilées en absolu dans une section épinglée ; le
   * scroll fond l'une dans l'autre (morphing visage→cyborg, fibre optique). */

  FX.crossfadeLayers = function (section, opts) {
    opts = opts || {};
    var layers = section.querySelectorAll('[data-layer]');
    if (!layers.length) return null;
    if (reduced) {
      layers.forEach(function (l, i) { l.style.opacity = i === layers.length - 1 ? 1 : 0; });
      return null;
    }
    gsap.set(layers, { opacity: 0 });
    gsap.set(layers[0], { opacity: 1 });
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: section, start: 'top top',
        end: opts.end || ('+=' + (layers.length * 120) + '%'),
        scrub: opts.scrub != null ? opts.scrub : 1, pin: true, anticipatePin: 1
      }
    });
    for (var i = 1; i < layers.length; i++) {
      tl.to(layers[i], { opacity: 1, duration: 1, ease: 'none' }, (i - 1) * 1.2 + 0.2);
    }
    return tl;
  };

  /* ------------------------------------------------------- 04. compteurs
   * [data-count-to] : s'incrémente à l'entrée (ou en scrub si data-count-scrub).
   * data-count-from, data-count-dec (décimales), data-count-suffix. */

  FX.counters = function (root) {
    (root || document).querySelectorAll('[data-count-to]').forEach(function (el) {
      var d = el.dataset;
      var to = num(d.countTo, 0), dec = num(d.countDec, 0);
      var suffix = d.countSuffix || '', st = { v: num(d.countFrom, 0) };
      function fmt(v) { return v.toFixed(dec) + suffix; }
      if (reduced) { el.textContent = fmt(to); return; }
      var scrub = d.countScrub != null;
      gsap.to(st, {
        v: to, duration: scrub ? 1 : 1.4, ease: scrub ? 'none' : 'power1.out',
        scrollTrigger: scrub
          ? { trigger: el, start: 'top 85%', end: 'top 30%', scrub: 1 }
          : { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
        onUpdate: function () { el.textContent = fmt(st.v); }
      });
      el.textContent = fmt(st.v);
    });
  };

  /* --------------------------------------- 05. panneaux plein écran (L'Écrin)
   * [data-panel] 100svh ; le média [data-panel-media] zoome doucement pendant la
   * traversée, la légende [data-panel-caption] se révèle. */

  FX.fullscreenPanels = function (container, opts) {
    opts = opts || {};
    container.querySelectorAll('[data-panel]').forEach(function (panel) {
      var media = panel.querySelector('[data-panel-media]');
      var cap = panel.querySelector('[data-panel-caption]');
      if (media && !reduced) {
        gsap.fromTo(media, { scale: 1 }, {
          scale: opts.zoom || 1.12, ease: 'none',
          scrollTrigger: { trigger: panel, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }
      if (cap && !reduced) {
        gsap.from(cap, {
          y: 60, opacity: 0, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: panel, start: 'top 55%', toggleActions: 'play none none reverse' }
        });
      }
    });
  };

  /* ------------------------------------------------------- 06. parallaxe
   * [data-speed="0.4"] : plus petit = plus lent (profondeur). Négatif = sens
   * inverse. Déplacement max ~240 px pondéré par la vitesse. */

  FX.parallax = function (root) {
    if (reduced) return;
    (root || document).querySelectorAll('[data-speed]').forEach(function (el) {
      var sp = num(el.dataset.speed, 0.5);
      gsap.to(el, {
        y: -240 * sp, ease: 'none',
        scrollTrigger: {
          trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true
        }
      });
    });
  };

  /* ------------------------------------------------- 07. scroll horizontal
   * Section épinglée, la piste [data-track] défile en X sur la longueur exacte. */

  FX.horizontal = function (section, opts) {
    opts = opts || {};
    var track = section.querySelector('[data-track]');
    if (!track) return null;
    if (reduced) { section.style.overflowX = 'auto'; return null; }
    var dist = function () { return track.scrollWidth - section.clientWidth; };
    return gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: {
        trigger: section, start: 'top top',
        end: function () { return '+=' + dist(); },
        scrub: opts.scrub != null ? opts.scrub : 1,
        pin: true, anticipatePin: 1, invalidateOnRefresh: true
      }
    });
  };

  /* ---------------------------------------------------- 08. mask reveal
   * Wipe clip-path à l'entrée (ou en scrub). opts.from : 'left'|'bottom'|'circle'. */

  FX.maskReveal = function (el, opts) {
    opts = opts || {};
    var shapes = {
      left:   ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'],
      bottom: ['inset(100% 0 0 0)', 'inset(0% 0 0 0)'],
      circle: ['circle(0% at 50% 50%)', 'circle(75% at 50% 50%)']
    };
    var s = shapes[opts.from || 'left'];
    if (reduced) { el.style.clipPath = s[1]; return; }
    var scrub = opts.scrub != null;
    gsap.fromTo(el, { clipPath: s[0] }, {
      clipPath: s[1], duration: 1.1, ease: scrub ? 'none' : 'power3.inOut',
      scrollTrigger: scrub
        ? { trigger: el, start: 'top 80%', end: 'top 30%', scrub: opts.scrub }
        : { trigger: el, start: 'top 75%', toggleActions: 'play none none reverse' }
    });
  };

  /* ------------------------------------------------------ 09. text scrub
   * Découpe le texte en mots, révélation progressive au scrub. Les mots dans
   * <em>/<i>/.fx-em gardent leur balisage (emphase serif italique du site). */

  FX.splitWords = function (el) {
    var walk = function (node, out) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (tok) {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            var span = document.createElement('span');
            span.className = 'fx-word';
            span.textContent = tok;
            frag.appendChild(span);
            out.push(span);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) walk(child, out);
      });
    };
    var words = [];
    walk(el, words);
    return words;
  };

  FX.textScrub = function (el, opts) {
    opts = opts || {};
    var words = FX.splitWords(el);
    if (reduced || !words.length) return null;
    return gsap.from(words, {
      opacity: 0.1, y: opts.y != null ? opts.y : 10,
      stagger: opts.stagger != null ? opts.stagger : 0.05, ease: 'none',
      scrollTrigger: {
        trigger: el, start: opts.start || 'top 80%', end: opts.end || 'top 30%',
        scrub: opts.scrub != null ? opts.scrub : 1
      }
    });
  };

  /* ---------------------------------------------------- 10. sticky stack
   * Cartes [data-card] en position:sticky (CSS) ; chaque carte recouverte
   * rétrécit et s'assombrit pendant que la suivante arrive. */

  FX.stickyStack = function (section) {
    var cards = section.querySelectorAll('[data-card]');
    if (reduced) return;
    cards.forEach(function (card, i) {
      var next = cards[i + 1];
      if (!next) return;
      gsap.to(card, {
        scale: 0.94, opacity: 0.55, ease: 'none',
        scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top+=90', scrub: true }
      });
    });
  };

  /* ------------------------------------------------- 11. barre de progrès
   * HUD technique : barre fine liée au progrès global de la page. */

  FX.progressBar = function (el) {
    if (reduced) { el.style.transform = 'scaleX(1)'; return; }
    gsap.set(el, { scaleX: 0, transformOrigin: '0 50%' });
    gsap.to(el, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.3 }
    });
  };

  /* ------------------------------------------------------- init déclaratif
   * <section data-fx="pin-assembly" data-fx-opts='{"end":"+=200%"}'> */

  var registry = {
    'pin-assembly': FX.pinAssembly,
    'exploded': FX.explodedLayers,
    'crossfade': FX.crossfadeLayers,
    'panels': FX.fullscreenPanels,
    'horizontal': FX.horizontal,
    'sticky-stack': FX.stickyStack,
    'text-scrub': FX.textScrub,
    'mask-reveal': FX.maskReveal
  };

  FX.auto = function () {
    document.querySelectorAll('[data-fx]').forEach(function (el) {
      var fn = registry[el.dataset.fx];
      if (!fn) return;
      var opts = {};
      if (el.dataset.fxOpts) { try { opts = JSON.parse(el.dataset.fxOpts); } catch (e) {} }
      fn(el, opts);
    });
    FX.counters();
    FX.parallax();
  };

  global.ScrollFX = FX;
})(window);
