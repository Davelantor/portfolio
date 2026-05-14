(function () {
  'use strict';

  /* ── DOM refs ── */
  const nav         = document.getElementById('nav');
  const heroSection = document.getElementById('hero');
  const seq1El      = document.getElementById('seq1');
  const bgV1        = document.getElementById('bg-v1');
  const bgCanvas    = document.getElementById('bg-canvas');
  const bgV2        = document.getElementById('bg-v2');
  const bgCtx       = bgCanvas.getContext('2d');

  /* ── State ── */
  let frames1   = [];
  let lastIdx1  = -1;

  /* ── Praise Parade sequence ref ── */
  const ppSeqEl = document.getElementById('pp-sequence');

  const psSeqEl       = document.getElementById('ps-sequence');

  /* ── Nav active refs ── */
  const navLinkEls = Array.from(document.querySelectorAll('#navLinks a'));

  /* ── About sequence refs ── */
  const aboutSeqEl   = document.getElementById('about');
  const aboutPanels  = Array.from(document.querySelectorAll('.about-panel'));
  const aboutDots    = Array.from(document.querySelectorAll('.about-seq-dot'));
  const aboutDotsWrap = document.getElementById('aboutSeqDots');

  /* ── About panel bounds — evenly spaced from panel count ─
     Each entry is the scroll-progress (0→1) at which that
     panel becomes active.  Computed once so tickAboutSeq,
     initAboutPanelNav, and buildSnaps always agree.        */
  function getAboutBounds () {
    var n = aboutPanels.length;
    var b = [];
    for (var i = 0; i < n; i++) b.push(i / n);
    return b;
  }

  /* ────────────────────────────────────────────────────
     CANVAS SIZING
     https://github.com/Davelantor
  ──────────────────────────────────────────────────── */
  function resizeCanvas () {
    bgCanvas.width  = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    if (frames1[lastIdx1]) bgCtx.drawImage(frames1[lastIdx1], 0, 0);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  /* ────────────────────────────────────────────────────
     FRAME EXTRACTION ENGINE
     • Seeks through the video at target FPS
     • Draws each frame to a temporary offscreen canvas
       scaled to viewport size (object-fit: cover)
     • Stores each frame as an ImageBitmap
  ──────────────────────────────────────────────────── */
  function extractFrames (src, label, pStart, pSpan) {
    return new Promise(function (resolve, reject) {
      const video = document.createElement('video');
      video.muted       = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.preload     = 'auto';

      const off    = document.createElement('canvas');
      const offCtx = off.getContext('2d');
      off.width  = window.innerWidth;
      off.height = window.innerHeight;

      video.addEventListener('error', function () {
        reject(new Error('Could not load video: ' + src));
      });

      video.addEventListener('loadedmetadata', async function () {
        const dur       = video.duration;
        const TARGET_FPS = 24;
        const maxFrames  = Math.min(Math.ceil(dur * TARGET_FPS), 300);
        const result     = [];

        for (let i = 0; i < maxFrames; i++) {
          /* Seek */
          const t = maxFrames > 1 ? (i / (maxFrames - 1)) * dur : 0;
          video.currentTime = t;
          await new Promise(function (res) {
            video.addEventListener('seeked', res, { once: true });
          });

          /* Draw with object-fit:cover cropping */
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const cw = off.width;
          const ch = off.height;
          const vAR = vw / vh;
          const cAR = cw / ch;
          let sx, sy, sw, sh;
          if (vAR > cAR) {
            sh = vh; sw = vh * cAR;
            sy = 0;  sx = (vw - sw) / 2;
          } else {
            sw = vw; sh = vw / cAR;
            sx = 0;  sy = (vh - sh) / 2;
          }
          offCtx.clearRect(0, 0, cw, ch);
          offCtx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);

          /* Store as ImageBitmap */
          result.push(await createImageBitmap(off));

        }

        resolve(result);
      });

      video.src = src;
      video.load();
    });
  }

  /* ────────────────────────────────────────────────────
     BOOT — extract both video sequences
  ──────────────────────────────────────────────────── */
  async function boot () {
    /* Extract video frames in background — scroll sequence plays once ready */
    extractFrames('videos/Star_Hole_Transition.mp4', 'Scroll sequence', 0, 1.0)
      .then(function (f) { frames1 = f; })
      .catch(function (err) { console.warn('[APEX] Frame extraction error:', err); });

    /* Trigger hero content entrance */
    document.querySelectorAll('#hero .fiu').forEach(function (el, i) {
      setTimeout(function () { el.classList.add('on'); }, 160 + i * 110);
    });

    /* Rotating hero text */
    (function () {
      var terms = ['Head of UX', 'Senior UX Lead', 'Product Design Lead', 'Staff Product Designer', 'UX Manager', 'Principal Product Designer'];
      var el = document.getElementById('heroRotate');
      var idx = 0;
      setInterval(function () {
        el.classList.add('fade');
        setTimeout(function () {
          idx = (idx + 1) % terms.length;
          el.textContent = terms[idx];
          el.classList.remove('fade');
        }, 260);
      }, 2200);
    })();

    startEngine();
    initReveal();
    initPraiseParade();
    initPerfBars();
    initStatCounters();
    initContactNav();
    initAboutPanelNav();
  }

  /* ────────────────────────────────────────────────────
     SCROLL ENGINE
  ──────────────────────────────────────────────────── */
  function startEngine () {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function onScroll () {
    const sy = window.scrollY;
    tickNav(sy);
    tickNavActive(sy);
    tickBackground(sy);
    tickCallouts(sy);
    tickDots(sy);
    tickAboutSeq(sy);
  }

  /* ── Nav opacity ── */
  function tickNav (sy) {
    if (sy > 44) nav.classList.remove('transparent');
    else          nav.classList.add('transparent');
  }

  /* ── Helper: section scroll progress (0→1) ── */
  function sectionProgress (el, sy) {
    const top    = el.offsetTop;
    const height = el.offsetHeight;
    const vh     = window.innerHeight;
    const raw    = (sy - top) / (height - vh);
    return Math.max(0, Math.min(1, raw));
  }

  /* ── Single background layer manager ──────────────────
     Phase 1: Star_Static.mp4   (bgV1)     — before seq1
     Phase 2: Frame sequencer   (bgCanvas) — during seq1
     Phase 3: BlackHole_Static  (bgV2)     — after seq1
  ──────────────────────────────────────────────────── */
  function tickBackground (sy) {
    const vh      = window.innerHeight;
    const seq1Top = seq1El.offsetTop;
    const seq1Bot = seq1Top + seq1El.offsetHeight;
    const FADE    = vh * 0.3;

    const canvasIn  = Math.max(0, Math.min(1, (sy - (seq1Top - FADE)) / FADE));
    const canvasOut = Math.max(0, Math.min(1, (sy - (seq1Bot - vh - FADE)) / FADE));

    bgV1.style.opacity     = (1 - canvasIn).toFixed(3);
    bgCanvas.style.opacity = (canvasIn * (1 - canvasOut)).toFixed(3);
    bgV2.style.opacity     = canvasOut.toFixed(3);

    /* Parallax: shift bgV2 upward 32px after it becomes fully visible,
       until its centre sits 128px above the top of the screen.           */
    const parallaxStart = seq1Bot - vh + 1024;
    const parallaxP     = Math.max(0, Math.min(1, (sy - parallaxStart) / (vh * 10)));
    bgV2.style.transform = 'translateY(' + (-(parallaxP * (vh / 4 + 128))).toFixed(1) + 'px)';

    if (frames1.length && canvasIn > 0.01) {
      const p   = sectionProgress(seq1El, sy);
      const idx = Math.round(p * (frames1.length - 1));
      if (idx !== lastIdx1) {
        lastIdx1 = idx;
        bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        bgCtx.drawImage(frames1[idx], 0, 0);
      }
    }
  }

  /* ── Callout cards ── */
  function tickCallouts (sy) {
    tickSeqCallouts(seq1El, sy);
  }

  function tickSeqCallouts (seqEl, sy) {
    const callouts = seqEl.querySelectorAll('.callout');
    if (sy < seqEl.offsetTop) {
      callouts.forEach(function (c) { c.classList.remove('on', 'past'); });
      return;
    }
    const p = sectionProgress(seqEl, sy);
    callouts.forEach(function (c) {
      const s      = parseFloat(c.dataset.s);
      const e      = parseFloat(c.dataset.e);
      const active = p >= s && p <= e;
      const past   = p > e;
      c.classList.toggle('on',   active);
      c.classList.toggle('past', !active && past);
    });
  }

  /* ── Nav active section highlight ── */
  function tickNavActive (sy) {
    var vh  = window.innerHeight;
    var mid = sy + vh * 0.45; // slightly above center gives earlier highlight feel

    // Contact panel becomes active when panel 2 (2/3 through) is visible
    var contactActive = false;
    if (aboutSeqEl) {
      var ap = sectionProgress(aboutSeqEl, sy);
      contactActive = ap >= 0.667;
    }

    // Map each nav link to its target section element
    var sectionMap = [
      { section: psSeqEl,       href: '#profile-summary' },
      { section: seq1El,        href: '#seq1' },
      { section: ppSeqEl,       href: '#recomendations' },
      { section: aboutSeqEl,    href: '#about' },
    ];

    var activeHref = null;
    sectionMap.forEach(function (entry) {
      if (!entry.section) return;
      var top = entry.section.offsetTop;
      var bot = top + entry.section.offsetHeight;
      if (mid >= top && mid < bot) activeHref = entry.href;
    });

    // Contact becomes active only when deep into the about sequence
    if (contactActive) activeHref = '#contact';

    navLinkEls.forEach(function (a) {
      var href = a.getAttribute('href');
      a.classList.toggle('is-active', href === activeHref);
    });
  }

  /* ── About section panel sequencer ── */
  function tickAboutSeq (sy) {
    if (!aboutSeqEl || !aboutPanels.length) return;
    if (window.innerWidth <= 960) return; // CSS handles mobile

    var p      = sectionProgress(aboutSeqEl, sy);
    var n      = aboutPanels.length;
    var BOUNDS = getAboutBounds();

    aboutPanels.forEach(function (panel, i) {
      var s = BOUNDS[i];
      var e = BOUNDS[i + 1];
      var isLast = (i === n - 1);
      var active = isLast ? (p >= s) : (p >= s && p < e);
      var past   = !isLast && (p >= e);
      panel.classList.toggle('is-active', active);
      panel.classList.toggle('is-past',   past);
    });

    // Dots
    if (aboutDotsWrap) {
      aboutDotsWrap.classList.toggle('is-visible', p > 0 && p <= 1);
    }
    aboutDots.forEach(function (dot, i) {
      var s = BOUNDS[i];
      var e = BOUNDS[i + 1];
      var isLast = (i === n - 1);
      var active = isLast ? (p >= s) : (p >= s && p < e);
      var past   = !isLast && (p >= e);
      dot.classList.toggle('is-active', active);
      dot.classList.toggle('is-past',   past && !active);
    });
  }

  /* ── Progress dots (seq1 only) ── */
  function tickDots (sy) {
    const p           = sectionProgress(seq1El, sy);
    const cards       = seq1El.querySelectorAll('.callout:not(.pos-c)');
    const dots        = seq1El.querySelectorAll('.seq-dot');
    const dotsWrap    = seq1El.querySelector('.seq-dots');
    const firstS      = cards.length ? parseFloat(cards[0].dataset.s) : 1;

    dotsWrap.style.opacity = p >= firstS ? '1' : '0';

    cards.forEach(function (c, i) {
      if (!dots[i]) return;
      const s      = parseFloat(c.dataset.s);
      const e      = parseFloat(c.dataset.e);
      const active = p >= s && p <= e;
      const past   = p > e;
      dots[i].classList.toggle('on',   active);
      dots[i].classList.toggle('past', !active && past);
    });
  }

  /* ────────────────────────────────────────────────────
     SCROLL REVEAL — IntersectionObserver
  ──────────────────────────────────────────────────── */
  function initReveal () {
    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('on');
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -48px 0px' });

    document.querySelectorAll('.fiu:not(#hero .fiu)').forEach(function (el) {
      obs.observe(el);
    });
  }

  /* ────────────────────────────────────────────────────
     ABOUT PANEL DEEP-LINK — scroll to a specific panel
     inside the about sequence via data-about-panel="n"
  ──────────────────────────────────────────────────── */
  function initAboutPanelNav () {
    var BOUNDS = getAboutBounds();
    document.querySelectorAll('[data-about-panel]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        if (!aboutSeqEl) return;
        var idx = parseInt(el.getAttribute('data-about-panel'), 10);
        var progress = BOUNDS[idx] != null ? BOUNDS[idx] : 0;
        var top = aboutSeqEl.offsetTop + progress * (aboutSeqEl.offsetHeight - window.innerHeight);
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
  }

  /* ────────────────────────────────────────────────────
     NAV SMOOTH SCROLL — handle anchor clicks on nav links
  ──────────────────────────────────────────────────── */
  function initContactNav () {
    navLinkEls.forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href === '#') return;
      a.addEventListener('click', function (e) {
        // #contact is an empty anchor — route to the contact panel inside #about instead
        if (href === '#contact' && aboutSeqEl) {
          e.preventDefault();
          var aboutH = aboutSeqEl.offsetHeight - window.innerHeight;
          window.scrollTo({ top: Math.round(aboutSeqEl.offsetTop + 0.75 * aboutH), behavior: 'smooth' });
          return;
        }
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        window.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
      });
    });
  }

  /* ────────────────────────────────────────────────────
     PRAISE PARADE — ttwo-row infinite marquee
  ──────────────────────────────────────────────────── */
  function initPraiseParade () {
    // ── Data ───────────────────────────────────────────
    var PP_DATA = [
      {
        id: 0, pullQuote: 'I worked with John',
        body: 'I worked with John through Product Management, especially during a project where we designed a user interface for a global automotive OEM. In this collaboration, John demonstrated exceptional UX/UI expertise and an impressive ability to translate complex and sometimes ambiguous customer needs into clear, intuitive UI solutions. <br><br>He created multiple UI prototypes that were reviewed and accepted by the OEM, and what truly stood out was his ability to iterate extremely quickly. During customer meetings, John was able to adjust and refine UI concepts on the fly, incorporating feedback in real time and turning customer input into concrete, high-quality design updates within minutes. <br><br>John combines strong design thinking with a deep understanding of product and implementation realities. He is highly collaborative, customer-focused, and a pleasure to work with. I would confidently recommend him for lead UX/UI roles, especially in complex, industrial or B2B product environments.',
        avatar: 'images/contacts/Teppo.jpg', name: 'Teppo Aalto',
        role: 'Chief Product Officer', company: 'Mapvision', linkedin: 'https://www.linkedin.com/in/davelantor/details/recommendations/'
      },
      {
        id: 1, pullQuote: 'John is truly a great',
        body: 'John is truly a great asset to any software team as a full stack developer or in a designer role. During his time at Mapvision, he took our UI/UX design and the processes behind it to a new level.<br><br>He is also very customer oriented and always interested to learn how the customers are using his designs. Something that separates him from the rest is his ability to always make you feel good when interacting with him. That is something unique!',
        avatar: 'images/contacts/Kosti.jpg', name: 'Kosti Kannas',
        role: 'Chief Technology Officer', company: 'Mapvision', linkedin: 'https://www.linkedin.com/in/davelantor/details/recommendations/'
      },
      {
        id: 2, pullQuote: 'John has truly been an amazing',
        body: 'John has truly been an amazing multi-disciplinary team player in our development team. We were convinced from the first programming assignment, and from there on John first delivered excellent software development skills, and later on started leading our UX efforts, creating amazing Figma prototypes that leave both product owners and customers begging for more.',
        avatar: 'images/contacts/Tommi.jpg', name: 'Tommi Martela',
        role: 'Director of Product Development', company: 'Mapvision', linkedin: 'https://www.linkedin.com/in/davelantor/details/recommendations/'
      },
      {
        id: 3, pullQuote: 'I worked with John in the same team',
        body: 'I worked with John in the same team and he is one of those people who makes work and days in the office better. He brings a positive energy, genuine enthusiasm and a great sense of humor that makes collaboration really easy and natural.<br><br>He is dependable, consistently delivered in sprints and contributes to technical discussions while always keeping long-term user impact in mind through clear use cases and flows. In his UX role he showed creativity, vision and care, delivering well-reasoned, highly realistic designs and prototypes, with his top-notch Figma skills and very fast iteration. He balances user needs with practical implementation and saves teams significant time by clarifying flows early, reducing rework.<br><br>He collaborates easily with customers and across teams to understand their point of view and improve solutions. He is approachable and highly effective, I would recommend John as a great addition to any UX or development team.',
        avatar: 'images/contacts/Ernest.jpg', name: 'Ernest Arendarenko',
        role: 'Tech Lead / Team Lead', company: 'Mapvision', linkedin: 'https://www.linkedin.com/in/davelantor/details/recommendations/'
      },
      {
        id: 4, pullQuote: 'I have had the honor of working with John',
        body: 'I have had the honor of working with John both when he was a full stack developer in my team as well as when he had pursued his passion in UX design and became independent contributor outside of my direct team. In the former role he worked as a full stack C# developer though his focus on the frontendcovering both winforms and WPF, providing us efficient implementations of needed changes, In the latter role he designed improved looks for new software tools and collaborated with product management to bring their vision to live. Additionally he collected early feedback from customers via prototyping and questionnaires, leading to multiple succsesfull product launches. His insights into designs include his knowledge of implementation limitations, and have provided easy to implement UX to features whether completely new or improvements to existing ones.<br><br>I would recommend him into roles for designing and/or implementing UX.',
        avatar: 'images/contacts/Lasse.jpg', name: 'Lasse Ylinen',
        role: 'Software Engineering Manager', company: 'Mapvision', linkedin: 'https://www.linkedin.com/in/davelantor/details/recommendations/'
      }
    ];

    var LI_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

    // ── Seamless loop: duplicate children ──────────────
    function duplicateTrack (track) {
      var originals = Array.from(track.children);
      originals.forEach(function (child) {
        var clone = child.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      });
    }

    // ── Set animation-duration = halfWidth / (speed * scale) ──
    function applyDuration (track, speed, scale) {
      var half = track.scrollWidth / 2;
      var dur = half / (speed * (scale || 1));
      track.style.animationDuration = dur.toFixed(2) + 's';
    }

    var tracks = [
      { el: document.getElementById('ppTrack1'), speed: 120 },
      { el: document.getElementById('ppTrack2'), speed: 70 },
      { el: document.getElementById('ppTrack3'), speed: 40 }
    ];

    tracks.forEach(function (t) {
      if (!t.el) return;
      duplicateTrack(t.el);
      applyDuration(t.el, t.speed, 1);
    });

    // ── Resize: recalculate durations ──────────────────
    window.addEventListener('resize', function () {
      tracks.forEach(function (t) {
        if (t.el) applyDuration(t.el, t.speed, 1);
      });
    });

    // ── Modal ──────────────────────────────────────────
    var overlay = document.getElementById('ppModal');
    var inner   = document.getElementById('ppModalInner');
    if (!overlay || !inner) return;

    function openModal (id) {
      var d = PP_DATA[id];
      if (!d) return;
      inner.innerHTML =
        '<button class="pp-modal-close" id="ppClose" aria-label="Close">&times;</button>' +
        '<p class="pp-modal-body">\u201c' + d.body + '\u201d</p>' +
        '<hr class="pp-modal-divider">' +
        '<div class="pp-modal-profile">' +
          '<div class="pp-modal-profile-left">' +
            '<img class="pp-modal-avatar" src="' + d.avatar + '" alt="' + d.name + '">' +
            '<div class="pp-modal-author">' +
              '<span class="pp-modal-name">' + d.name + '</span>' +
              '<span class="pp-modal-role">' + d.role + '</span>' +
              '<span class="pp-modal-company">' + d.company + '</span>' +
            '</div>' +
          '</div>' +
          '<a href="' + d.linkedin + '" class="tcard-link" aria-label="LinkedIn" target="_blank" rel="noopener">' + LI_SVG + '</a>' +
        '</div>';
      overlay.classList.add('is-open');
      document.getElementById('ppClose').addEventListener('click', closeModal);
      var liBtn = inner.querySelector('.tcard-link');
      if (liBtn) {
        liBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          window.open(d.linkedin, '_blank', 'noopener');
        });
      }
    }

    function closeModal () {
      overlay.classList.remove('is-open');
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });

    // ── Click delegation (works on originals + clones) ─
    var row1 = document.getElementById('ppRow1');
    var row2 = document.getElementById('ppRow2');
    if (row1) {
      row1.addEventListener('click', function (e) {
        var q = e.target.closest('.pp-quote');
        if (q && q.dataset.id != null) openModal(+q.dataset.id);
      });
    }
    if (row2) {
      row2.addEventListener('click', function (e) {
        var c = e.target.closest('.pp-card');
        if (c && c.dataset.id != null) openModal(+c.dataset.id);
      });
    }
  }

  /* ────────────────────────────────────────────────────
     PERFORMANCE BARS — animate when scrolled into view
  ──────────────────────────────────────────────────── */
  function initPerfBars () {
    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const bar = entry.target.querySelector('.perf-bar');
          if (bar) {
            const target = bar.style.getPropertyValue('--target');
            bar.style.width = target;
          }
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('.perf-row').forEach(function (row) {
      obs.observe(row);
    });
  }

  /* ────────────────────────────────────────────────────
     STAT COUNTERS — animate numbers when scrolled into view
  ──────────────────────────────────────────────────── */
  function initStatCounters () {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var stat   = entry.target;
        var target = parseInt(stat.dataset.target, 10);
        var el     = stat.querySelector('.stat-counter');
        if (!el) return;
        var start    = 0;
        var duration = 1400;
        var startTs  = null;
        function ease (t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
        function step (ts) {
          if (!startTs) startTs = ts;
          var p = Math.min((ts - startTs) / duration, 1);
          var v = Math.round(ease(p) * target);
          el.textContent = target >= 1000 ? v.toLocaleString() : v;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        obs.unobserve(stat);
      });
    }, { threshold: 0.4 });

    document.querySelectorAll('.banner-stat').forEach(function (stat) {
      obs.observe(stat);
    });
  }

  /* ────────────────────────────────────────────────────
     3D TILT CARD ENGINE
     • Cursor-driven perspective rotation on hover
     • Internal parallax layers at different depths
     • Glare effect tracking cursor position
     • Shelf entrance stagger animation
  ──────────────────────────────────────────────────── */
  function initTiltCards () {
    var MAX_TILT      = 3;
    var PARALLAX_IMG  = 24;
    var PARALLAX_TEXT = 40;
    var PARALLAX_BADGE = 56;


    /* ── Enhance split-media panels ── */
    document.querySelectorAll('.split-media').forEach(function (media) {
      media.classList.add('tilt-card-inner');
      media.style.transformStyle = 'preserve-3d';

      var wrapper = document.createElement('div');
      wrapper.className = 'tilt-card';
      wrapper.style.perspective = '1000px';
      media.parentNode.insertBefore(wrapper, media);
      wrapper.appendChild(media);

      var glare = document.createElement('div');
      glare.className = 'tilt-glare';
      media.appendChild(glare);
    });

    /* ── Collect all tilt cards and mark active ── */
    var allTilts = [];
    document.querySelectorAll('.tilt-card').forEach(function (wrapper) {
      var inner = wrapper.querySelector('.tilt-card-inner');
      if (!inner) return;
      inner.classList.add('tilt-active');
      inner.style.transition = 'transform 0.1s ease-out, box-shadow 0.3s ease-out';
      allTilts.push({ wrapper: wrapper, inner: inner, glare: inner.querySelector('.tilt-glare') });
    });

    /* ── Single global mousemove drives all visible cards ── */
    var tiltRaf = null;
    document.addEventListener('mousemove', function (e) {
      if (tiltRaf) return;
      tiltRaf = requestAnimationFrame(function () {
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var mx = e.clientX;
        var my = e.clientY;

        allTilts.forEach(function (c) {
          var rect = c.wrapper.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > vh) return; // skip off-screen

          var cx = rect.left + rect.width  / 2;
          var cy = rect.top  + rect.height / 2;
          var nx = Math.max(-1, Math.min(1, (mx - cx) / (vw / 2)));
          var ny = Math.max(-1, Math.min(1, (my - cy) / (vh / 2)));

          var rotateX = -ny * MAX_TILT;
          var rotateY =  nx * MAX_TILT;

          c.inner.style.transform = 'perspective(1000px) rotateX(' + rotateX.toFixed(2) + 'deg) rotateY(' + rotateY.toFixed(2) + 'deg) scale3d(1.02,1.02,1.02)';

          c.inner.querySelectorAll('.tilt-parallax-img').forEach(function (el) {
            el.style.transform = 'translateZ(' + PARALLAX_IMG + 'px) translate(' + (nx * 4).toFixed(1) + 'px,' + (ny * 8).toFixed(1) + 'px) scale(1.02)';
          });
          c.inner.querySelectorAll('.tilt-parallax-text-sm').forEach(function (el) {
            el.style.transform = 'translateZ(20px) translate(' + (nx * 2).toFixed(1) + 'px,' + (ny * 4).toFixed(1) + 'px)';
          });
          c.inner.querySelectorAll('.tilt-parallax-text-md').forEach(function (el) {
            el.style.transform = 'translateZ(32px) translate(' + (nx * 4).toFixed(1) + 'px,' + (ny * 8).toFixed(1) + 'px)';
          });
          c.inner.querySelectorAll('.tilt-parallax-text').forEach(function (el) {
            el.style.transform = 'translateZ(' + PARALLAX_TEXT + 'px) translate(' + (nx * 8).toFixed(1) + 'px,' + (ny * 12).toFixed(1) + 'px)';
          });
          c.inner.querySelectorAll('.tilt-parallax-badge').forEach(function (el) {
            el.style.transform = 'translateZ(' + PARALLAX_BADGE + 'px) translate(' + (nx * 12).toFixed(1) + 'px,' + (ny * 16).toFixed(1) + 'px)';
          });

          if (c.glare) {
            var gx = rect.width  > 0 ? ((mx - rect.left) / rect.width  * 100).toFixed(1) : 50;
            var gy = rect.height > 0 ? ((my - rect.top)  / rect.height * 100).toFixed(1) : 50;
            c.glare.style.setProperty('--glare-x', gx + '%');
            c.glare.style.setProperty('--glare-y', gy + '%');
          }
        });

        tiltRaf = null;
      });
    });

    /* ── Reset on mouse leave ── */
    document.addEventListener('mouseleave', function () {
      allTilts.forEach(function (c) {
        c.inner.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.5s ease-out';
        c.inner.style.transform = '';
        c.inner.querySelectorAll('.tilt-parallax-img, .tilt-parallax-text-sm, .tilt-parallax-text-md, .tilt-parallax-text, .tilt-parallax-badge').forEach(function (el) {
          el.style.transform = '';
        });
        if (c.glare) {
          c.glare.style.setProperty('--glare-x', '50%');
          c.glare.style.setProperty('--glare-y', '50%');
        }
      });
    });

    /* ── Shelf entrance stagger ── */
    var shelfObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          // Find all shelf-enter siblings for stagger
          var parent = entry.target.parentElement;
          var siblings = parent ? parent.querySelectorAll('.shelf-enter') : [entry.target];
          var idx = Array.prototype.indexOf.call(siblings, entry.target);
          var delay = Math.max(0, idx) * 120;

          setTimeout(function () {
            entry.target.classList.add('shelf-visible');
          }, delay);

          shelfObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.shelf-enter').forEach(function (el) {
      shelfObserver.observe(el);
    });
  }

  /* ────────────────────────────────────────────────────
     HERO ANCHOR CLICKS — plain smooth scroll
  ──────────────────────────────────────────────────── */
  document.querySelectorAll('#hero a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
    });
  });

  var scrollCueEl = document.querySelector('#hero .scroll-cue');
  if (scrollCueEl) {
    scrollCueEl.style.cursor = 'pointer';
    scrollCueEl.addEventListener('click', function () {
      if (psSeqEl) window.scrollTo({ top: psSeqEl.offsetTop, behavior: 'smooth' });
    });
  }

  /* ── GO ── */
  boot();

  /* Init tilt after DOM is fully ready */
  initTiltCards();

}());

(function () {
  'use strict';

  var curMain   = document.getElementById('cur-main');

  var mx = -400, my = -400;

  function setState(state, dir) {
    curMain.dataset.state = state;
    if (dir !== undefined) curMain.dataset.dir = dir;
  }

  /* ── Mouse move: main cursor tracks instantly ── */
  document.addEventListener('mousemove', function (e) {
    mx = e.clientX;
    my = e.clientY;
    curMain.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
  });

/* ── Classify an anchor element ── */
  function classifyLink(a) {
    var href = a.getAttribute('href') || '';
    if (!href || href === '#') return 'default';
    if (/^https?:\/\//.test(href) || /^\/\//.test(href) || a.target === '_blank') return 'external';
    if (href.charAt(0) === '#') return 'scroll';
    return 'default';
  }

  /* ── Determine up/down for a scroll anchor ── */
  function scrollDir(href) {
    try {
      var target = document.querySelector(href);
      if (!target) return 'down';
      return target.getBoundingClientRect().top < 0 ? 'up' : 'down';
    } catch (e) { return 'down'; }
  }

  /*

  /* ── Hover detection ── */
  document.addEventListener('mouseover', function (e) {
    /* pp-quote and pp-card: expand cursor */
    if (e.target.closest('.pp-quote, .pp-card')) {
      setState('expand');
      return;
    }

    var a = e.target.closest('a, button, [role="button"]');
    if (!a) { setState('default'); return; }

    var kind = classifyLink(a);
    if (kind === 'scroll') {
      setState('scroll', scrollDir(a.getAttribute('href')));
    } else if (kind === 'external') {
      setState('external');
    } else {
      setState('default');
    }
  });

  /* ── Re-evaluate direction on scroll (target may cross viewport) ── */
  document.addEventListener('scroll', function () {
    if (curMain.dataset.state !== 'scroll') return;
    var a = document.elementFromPoint(mx, my);
    if (!a) return;
    var link = a.closest('a');
    if (!link) return;
    var href = link.getAttribute('href') || '';
    if (href.charAt(0) === '#' && href.length > 1) {
      curMain.dataset.dir = scrollDir(href);
    }
  }, { passive: true });

  /* ── Hide when cursor leaves window ── */
  document.addEventListener('mouseleave', function () {
    curMain.style.opacity = '0';
  });
  document.addEventListener('mouseenter', function () {
    curMain.style.opacity = '';
  });

  /* ─── Scroll-to-top button ─── */
  var scrollTopBtn = document.getElementById('scroll-top');
  window.addEventListener('scroll', function () {
    scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  scrollTopBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

}());
