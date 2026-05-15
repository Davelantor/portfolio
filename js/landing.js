(function () {
  'use strict';

  // ── THREE.JS BACKGROUND ──────────────────────────────────────────────────
  var bgCanvas  = document.getElementById('lnd-bg-canvas');
  var bgScene   = new THREE.Scene();
  var bgCamera  = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
  bgCamera.position.set(0, 8, 0);
  bgCamera.lookAt(0, 0, 0);

  var bgRenderer = new THREE.WebGLRenderer({ canvas: bgCanvas, alpha: true, antialias: true });
  bgRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  bgRenderer.setSize(innerWidth, innerHeight);

  var MESH_W = 100, MESH_H = 100;
  var bgGeom = new THREE.PlaneGeometry(16, 16, MESH_W, MESH_H);
  bgGeom.rotateX(-Math.PI / 2);
  var bgColors = new Float32Array(bgGeom.attributes.position.count * 3);
  bgGeom.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));
  var bgMat  = new THREE.MeshBasicMaterial({ wireframe: true, vertexColors: true, transparent: true, opacity: 0.4 });
  var bgMesh = new THREE.Mesh(bgGeom, bgMat);
  bgScene.add(bgMesh);

  // Particles
  var pGeo = new THREE.BufferGeometry();
  var PC   = 80;
  var pArr = new Float32Array(PC * 3);
  for (var i = 0; i < PC; i++) {
    pArr[i*3]   = (Math.random() - 0.5) * 16;
    pArr[i*3+1] = Math.random() * 4;
    pArr[i*3+2] = (Math.random() - 0.5) * 16;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
  var pMat  = new THREE.PointsMaterial({ color: 0x00c8ff, size: 0.05, transparent: true, opacity: 0.5 });
  var pMesh = new THREE.Points(pGeo, pMat);
  bgScene.add(pMesh);

  // Scene color palettes: [low, mid, high]
  var SCENE_PALETTES = [
    [0x000000, 0x091840, 0x0066aa],  // 0 hero
    [0x000000, 0x091840, 0x0066aa],  // 1 stats
    [0x000000, 0x091840, 0x0066aa],  // 2 Mapvision AI
    [0x000000, 0x1e0c04, 0x993320],  // 3 Result
    [0x000000, 0x071a0e, 0x007744],  // 4 Lab (green)
    [0x000000, 0x062018, 0x009988],  // 5 Ajeco (teal)
    [0x060010, 0x100820, 0x6633bb],  // 6 Cargo (purple)
    [0x08001a, 0x140830, 0x7722cc],  // 7 YNA (purple)
    [0x000000, 0x091a0e, 0x007744],  // 8 timeline
    [0x04040c, 0x0c0818, 0x3322aa],  // 9 about me (deep indigo)
    [0x060310, 0x11091e, 0x6644aa],  // 10 CTA
  ];

  var bgPalette    = SCENE_PALETTES[0].slice();
  var targetPalette = SCENE_PALETTES[0].slice();

  var bgPos = bgGeom.attributes.position;
  var bgCA  = bgGeom.attributes.color;
  var bgT   = 0;

  function lerpColor(a, b, t) {
    var ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab_ = a & 0xff;
    var br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb_ = b & 0xff;
    return (Math.round(ar + (br - ar) * t) << 16) |
           (Math.round(ag + (bg - ag) * t) << 8)  |
            Math.round(ab_ + (bb_ - ab_) * t);
  }

  function lerpPalette(t) {
    for (var k = 0; k < 3; k++) {
      bgPalette[k] = lerpColor(bgPalette[k], targetPalette[k], t);
    }
  }

  function animateBG() {
    requestAnimationFrame(animateBG);
    bgT += 0.007;
    lerpPalette(0.025);

    var c0 = new THREE.Color(bgPalette[0]);
    var c1 = new THREE.Color(bgPalette[1]);
    var c2 = new THREE.Color(bgPalette[2]);

    for (var ii = 0; ii <= MESH_W; ii++) {
      for (var jj = 0; jj <= MESH_H; jj++) {
        var idx = jj * (MESH_W + 1) + ii;
        var x   = bgPos.getX(idx), z = bgPos.getZ(idx);
        var y   = Math.sin(x * 0.5 + bgT) * 0.35
                + Math.cos(z * 0.4 + bgT * 0.8) * 0.25
                + Math.sin((x + z) * 0.3 + bgT * 1.2) * 0.15;
        bgPos.setY(idx, y);
        var n = Math.max(0, Math.min(1, (y + 0.75) / 1.5));
        var c = n < 0.5 ? c0.clone().lerp(c1, n * 2) : c1.clone().lerp(c2, (n - 0.5) * 2);
        bgCA.setXYZ(idx, c.r, c.g, c.b);
      }
    }
    bgPos.needsUpdate = true;
    bgCA.needsUpdate  = true;

    var pp = pGeo.attributes.position;
    for (var pi = 0; pi < PC; pi++) {
      var py = pp.getY(pi) + 0.012;
      if (py > 4) py = 0;
      pp.setY(pi, py);
    }
    pp.needsUpdate = true;

    bgCamera.lookAt(0, 0, 0);

    bgRenderer.render(bgScene, bgCamera);
  }
  animateBG();

  window.addEventListener('resize', function () {
    bgCamera.aspect = innerWidth / innerHeight;
    bgCamera.updateProjectionMatrix();
    bgRenderer.setSize(innerWidth, innerHeight);
  });

  // ── BACKGROUND VIDEO ────────────────────────────────────────────────────
  // Dedicated buffers:
  //   idleBuf  (z-index 1) — scene idle loops; preloads silently during transitions
  //   transBuf (z-index 2) — transition clips; overlays idleBuf, fades out when done
  // The idle is already playing when the transition ends → no loading gap, no flash.
  var idleBuf  = document.getElementById('lnd-bg-video');
  var transBuf = document.getElementById('lnd-bg-video-b');

  var pendingTrans        = null;
  var idleReady          = false;
  var idleShowCb         = null;
  var idlePendingCanPlay = null;

  // Idle loops — play while user dwells on a scene
  var BG_IDLE = {
    2:  'videos/0050-1050.mp4',
    3:  'videos/1100-2100.mp4',
    4:  'videos/2150-3150.mp4',
    5:  'videos/3200-4200.mp4',
    6:  'videos/4250-5250.mp4',
    7:  'videos/5300-6300.mp4',
    8:  'videos/6350-7350.mp4',
    9:  'videos/7400-8400.mp4',
  };

  // Transition clips keyed by 'lo-hi' (lower scene first)
  var BG_TRANS = {
    '1-2':  'videos/0000-0050.mp4',
    '2-3':  'videos/1050-1100.mp4',
    '3-4':  'videos/2100-2150.mp4',
    '4-5':  'videos/3150-3200.mp4',
    '5-6':  'videos/4200-4250.mp4',
    '6-7':  'videos/5250-5300.mp4',
    '7-8':  'videos/6300-6350.mp4',
    '8-9':  'videos/7350-7400.mp4',
    '9-10': 'videos/8400-8450.mp4',
  };

  // Dedicated reverse clips — played forward when navigating backwards
  var BG_TRANS_REV = {
    '1-2':  'videos/0000-0050R.mp4',
    '2-3':  'videos/1050-1100R.mp4',
    '3-4':  'videos/2100-2150R.mp4',
    '4-5':  'videos/3150-3200R.mp4',
    '5-6':  'videos/4200-4250R.mp4',
    '6-7':  'videos/5250-5300R.mp4',
    '7-8':  'videos/6300-6350R.mp4',
    '8-9':  'videos/7350-7400R.mp4',
    '9-10': 'videos/8400-8450R.mp4',
  };

  function bgCancelTrans() {
    if (pendingTrans) {
      transBuf.removeEventListener('canplay',        pendingTrans.canPlay);
      transBuf.removeEventListener('loadedmetadata', pendingTrans.meta);
      transBuf.removeEventListener('seeked',         pendingTrans.seeked);
      pendingTrans = null;
    }
    transBuf.pause();
    transBuf.onended = null;
    transBuf.classList.remove('active');
  }

  // Start loading idle src silently into idleBuf.  Fires idleShowCb (or sets
  // idleReady) the moment the first frame is available via canplay.
  function bgLoadIdle(src) {
    if (idlePendingCanPlay) {
      idleBuf.removeEventListener('canplay', idlePendingCanPlay);
      idlePendingCanPlay = null;
    }
    idleReady  = false;
    idleShowCb = null;
    idleBuf.classList.remove('active');
    idleBuf.pause();
    idleBuf.loop    = true;
    idleBuf.onended = null;

    function onCanPlay() {
      idleBuf.removeEventListener('canplay', onCanPlay);
      idlePendingCanPlay = null;
      idleReady = true;
      if (idleShowCb) { idleShowCb(); idleShowCb = null; }
    }
    idlePendingCanPlay = onCanPlay;
    idleBuf.addEventListener('canplay', onCanPlay);
    idleBuf.src = src;
    idleBuf.load();
  }

  function bgPlayTransForward(src, onDone) {
    bgCancelTrans();
    var h = { canPlay: null, meta: null, seeked: null };
    h.canPlay = function () {
      transBuf.removeEventListener('canplay', h.canPlay);
      pendingTrans = null;
      transBuf.play().catch(function () {});
      transBuf.classList.add('active');
      transBuf.onended = onDone || null;
    };
    pendingTrans = h;
    transBuf.loop = false;
    transBuf.addEventListener('canplay', h.canPlay);
    transBuf.src = src;
    transBuf.load();
  }

  function bgEnterScene(next, prev, direction) {
    var lo       = Math.min(prev, next);
    var hi       = Math.max(prev, next);
    var key      = lo + '-' + hi;
    var transUrl = direction > 0 ? BG_TRANS[key] : BG_TRANS_REV[key];
    var idleUrl  = BG_IDLE[next];

    if (!transUrl && !idleUrl) {
      bgCancelTrans();
      idleBuf.classList.remove('active');
      idleBuf.pause(); idleBuf.src = ''; idleBuf.load();
      bgCanvas.style.opacity = '1';
      return;
    }

    bgCanvas.style.opacity = '0.18';

    // Preload idle immediately — it buffers silently so it's ready when transition ends
    if (idleUrl) bgLoadIdle(idleUrl);

    // If destination has no idle (e.g. scene 8), fade out any lingering idle now
    if (!idleUrl) idleBuf.classList.remove('active');

    var afterTrans = function () {
      if (idleUrl) {
        // Crossfade only once the idle has decoded its first frame.
        // If already ready, fires immediately; otherwise holds transBuf's last
        // frame visible until canplay resolves — zero gap guaranteed.
        var crossfade = function () {
          transBuf.classList.remove('active');
          idleBuf.play().catch(function () {});
          idleBuf.classList.add('active');
        };
        if (idleReady) {
          crossfade();
        } else {
          idleShowCb = crossfade;
        }
      } else {
        transBuf.classList.remove('active');
        bgCanvas.style.opacity = '1';
      }
    };

    if (transUrl) {
      bgPlayTransForward(transUrl, afterTrans);
    } else {
      // Idle-only scene — no transition clip, reveal idle once first frame ready
      var showIdle = function () { idleBuf.play().catch(function () {}); idleBuf.classList.add('active'); };
      if (idleReady) { showIdle(); } else { idleShowCb = showIdle; }
    }
  }

  // ── SCROLL-JACKING ENGINE ────────────────────────────────────────────────
  var TOTAL_SCENES   = 11;
  var currentScene   = 0;
  var isTransitioning = false;
  var throttleTimer  = null;
  var touchStartY    = 0;
  var wheelAccum     = 0;
  var THRESHOLD      = 80;

  var SCENES = [
    { el: 'lnd-scene-0', blocks: ['s0-tag','s0-name','s0-sub','s0-hint','s0-photo'] },
    { el: 'lnd-scene-1', blocks: ['s1-tag','s1-head','s1-stats','s1-sub'] },
    { el: 'lnd-scene-2', blocks: ['s2-img', 's2-right'] },
    { el: 'lnd-scene-3', blocks: ['s3-img', 's3-right'] },
    { el: 'lnd-scene-4', blocks: ['s4-img', 's4-right'] },
    { el: 'lnd-scene-5', blocks: ['s5-img', 's5-right'] },
    { el: 'lnd-scene-6', blocks: ['s6-img', 's6-right'] },
    { el: 'lnd-scene-7', blocks: ['s7-img', 's7-right'] },
    { el: 'lnd-scene-8', blocks: ['s8-tag','s8-head','s8-timeline'] },
    { el: 'lnd-scene-9', blocks: ['s9a-tag','s9a-head','s9a-desc','s9a-mq'] },
    { el: 'lnd-scene-10', blocks: ['s10-tag','s10-head','s10-cta'] },
  ];

  function setBlocks(sceneIdx, state) {
    SCENES[sceneIdx].blocks.forEach(function (id, i) {
      var el = document.getElementById(id);
      if (!el) return;
      el.className = 'lnd-text-block ' + state;
      el.style.transitionDelay = state === 'in' ? (i * 0.08) + 's' : '0s';
    });
  }

  function goToScene(next, direction) {
    if (isTransitioning) return;
    if (next < 0 || next >= TOTAL_SCENES) return;
    if (next === currentScene) return;

    isTransitioning = true;
    var prev = currentScene;
    currentScene = next;

    var flash = document.getElementById('lnd-flash');
    flash.style.transition = 'opacity 0.08s';
    flash.style.opacity    = '0.06';
    setTimeout(function () { flash.style.transition = 'opacity 0.4s'; flash.style.opacity = '0'; }, 80);

    var wipe = document.getElementById('lnd-wipe');
    wipe.style.width = '100%';
    setTimeout(function () { wipe.style.width = '0'; }, 500);

    var prevEl  = document.getElementById(SCENES[prev].el);
    var outClass = direction > 0 ? 'out-up'  : 'out-down';
    var preClass = direction > 0 ? 'pre-up'  : 'pre-down';
    setBlocks(prev, outClass);
    setTimeout(function () {
      prevEl.style.opacity = '0';
      prevEl.classList.remove('active');
    }, 200);

    var nextEl = document.getElementById(SCENES[next].el);
    setBlocks(next, preClass);
    nextEl.style.opacity = '1';
    nextEl.classList.add('active');
    setTimeout(function () { setBlocks(next, 'in'); }, 120);

    targetPalette = SCENE_PALETTES[next].slice();

    if (next === 8) {
      setTimeout(function () {
        ['lnd-tl0','lnd-tl1','lnd-tl2','lnd-tl3','lnd-tl4'].forEach(function (id, i) {
          setTimeout(function () {
            var el = document.getElementById(id);
            if (el) el.classList.add('lit');
          }, i * 180);
        });
      }, 400);
    } else {
      ['lnd-tl0','lnd-tl1','lnd-tl2','lnd-tl3','lnd-tl4'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove('lit');
      });
    }

    bgEnterScene(next, prev, direction);

    updateProgress();
    isTransitioning = false;
  }

  function updateProgress() {
    var dots = document.querySelectorAll('.lnd-prog-dot');
    dots.forEach(function (d, i) {
      d.classList.toggle('active',  i === currentScene);
      d.classList.toggle('visited', i < currentScene);
    });
    var num = document.getElementById('lnd-stage-num');
    if (num) num.textContent = String(currentScene + 1).padStart(2, '0');
    var hint = document.getElementById('lnd-scroll-hint');
    if (hint) hint.style.opacity = currentScene === 0 ? '1' : '0';
  }

  // Dot clicks
  document.querySelectorAll('.lnd-prog-dot').forEach(function (d) {
    d.addEventListener('click', function () {
      var target = +d.dataset.scene;
      goToScene(target, target > currentScene ? 1 : -1);
    });
  });

  // ── WHEEL ──
  var lndWrapper = document.getElementById('landing-wrapper');

  lndWrapper.addEventListener('wheel', function (e) {
    e.preventDefault();
    var bar = document.getElementById('lnd-throttle-bar');
    wheelAccum += Math.abs(e.deltaY);
    var pct = Math.min(100, (wheelAccum / THRESHOLD) * 100);
    bar.style.width   = pct + '%';
    bar.style.opacity = '1';

    clearTimeout(throttleTimer);
    throttleTimer = setTimeout(function () {
      wheelAccum        = 0;
      bar.style.width   = '0%';
      bar.style.opacity = '0';
    }, 300);

    if (wheelAccum >= THRESHOLD) {
      var dir = e.deltaY > 0 ? 1 : -1;
      goToScene(currentScene + dir, dir);
      wheelAccum        = 0;
      bar.style.width   = '0%';
    }
  }, { passive: false });

  // ── KEYBOARD ──
  window.addEventListener('keydown', function (e) {
    // Only handle keys when landing is visible
    if (document.getElementById('landing-wrapper').classList.contains('hiding')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') goToScene(currentScene + 1,  1);
    if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  goToScene(currentScene - 1, -1);
    if (e.key === 'Home') goToScene(0, -1);
    if (e.key === 'End')  goToScene(TOTAL_SCENES - 1, 1);
  });

  // ── TOUCH ──
  lndWrapper.addEventListener('touchstart', function (e) { touchStartY = e.touches[0].clientY; }, { passive: true });
  lndWrapper.addEventListener('touchend',   function (e) {
    var diff = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) goToScene(currentScene + (diff > 0 ? 1 : -1), diff > 0 ? 1 : -1);
  }, { passive: true });

  // ── CURSOR ──
  var cursorDot = document.getElementById('lnd-cursor');
  lndWrapper.addEventListener('mousemove', function (e) {
    cursorDot.style.left = e.clientX + 'px';
    cursorDot.style.top  = e.clientY + 'px';
  });

  // ── VIEW PORTFOLIO REVEAL ────────────────────────────────────────────────
  function revealPortfolio() {
    var wrapper = document.getElementById('landing-wrapper');

    // Restore body scroll so portfolio scroll engine works
    document.body.classList.remove('landing-active');

    // Bright flash before dissolve
    var flash = document.getElementById('lnd-flash');
    flash.style.transition = 'opacity 0.12s';
    flash.style.opacity    = '0.18';
    setTimeout(function () {
      flash.style.transition = 'opacity 1s';
      flash.style.opacity    = '0';
    }, 120);

    // Fade landing out
    setTimeout(function () {
      wrapper.classList.add('hiding');
      // After transition ends, fully remove from layout
      setTimeout(function () {
        wrapper.style.display = 'none';
      }, 900);
    }, 60);
  }

  var vpBtn = document.getElementById('view-portfolio-btn');
  if (vpBtn) {
    vpBtn.addEventListener('click', function (e) {
      e.preventDefault();
      revealPortfolio();
    });
  }

  // ── SATELLITE HUD ────────────────────────────────────────────────────────
  // Ghost data particles follow the cursor only while lnd-bg-video is active
  // (scenes 2-7). Phase is read from lndBgVid.classList each frame.
  (function initSatHud () {
    var hud = document.getElementById('lnd-sat-hud');
    if (!hud) return;
    var hCtx = hud.getContext('2d');
    var hudW = 0, hudH = 0;
    var mx = -999, my = -999, prevMx = -999, prevMy = -999;
    var particles = [], rings = [];
    var hudAlpha = 0, lastTs = 0, spawnBucket = 0;
    var MAX_P = 55, SPAWN_IVTL = 0.072;

    function rI(a, b) { return (Math.random() * (b - a + 1) | 0) + a; }
    function rF(a, b, d) { return (a + Math.random() * (b - a)).toFixed(d); }
    function rPick(a) { return a[Math.random() * a.length | 0]; }
    function rBin(n) { var s = ''; for (var i = 0; i < n; i++) s += Math.random() > 0.5 ? '1' : '0'; return s; }

    var gens = [
      function () { return rI(10,89) + '°' + rI(10,59) + '\'' + rI(0,9) + rI(0,9) + '"' + rPick(['N','S']); },
      function () { return rI(10,179) + '°' + rI(10,59) + '\'' + rPick(['E','W']); },
      function () { return 'ALT ' + rF(470, 492, 1) + ' km'; },
      function () { return 'VEL ' + rF(7.60, 7.72, 2) + ' km/s'; },
      function () { return '0x' + ((Math.random() * 0xFFFF | 0).toString(16).toUpperCase().padStart(4,'0')); },
      function () { return 'SIG ' + rF(92, 99.8, 1) + ' dB'; },
      function () { return 'ΔV ' + rF(0, 0.009, 4); },
      function () { return 'T+' + String(rI(0,23)).padStart(2,'0') + ':' + String(rI(0,59)).padStart(2,'0') + ':' + String(rI(0,59)).padStart(2,'0'); },
      function () { return rBin(8); },
      function () { return rBin(4) + ' ' + rBin(4); },
      function () { return '[TRK ' + rI(100, 999) + ']'; },
      function () { return 'LOCK ' + rI(91, 99) + '%'; },
      function () { return 'ΔΘ ' + rF(0, 0.09, 3) + '°'; },
      function () { return String(rI(1000, 9999)); },
      function () { return 'RES ' + rPick(['0.5m','1.0m','2.5m']); },
      function () { return rF(8, 22, 1) + ' GHz'; },
      function () { return 'CH ' + rI(1,32) + '▸'; },
    ];

    function spawnParticle(x, y) {
      if (particles.length >= MAX_P) return;
      var angle  = Math.random() * Math.PI * 2;
      var r      = 16 + Math.random() * 38;
      var dAngle = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.85;
      var spd    = 12 + Math.random() * 20;
      var life   = 0.85 + Math.random() * 1.3;
      particles.push({
        x: x + Math.cos(angle) * r,  y: y + Math.sin(angle) * r,
        vx: Math.cos(dAngle) * spd,  vy: Math.sin(dAngle) * spd,
        text: gens[Math.random() * gens.length | 0](),
        maxLife: life, life: life,
        alpha: 0.14 + Math.random() * 0.22,
      });
    }

    function spawnRing(x, y) {
      rings.push({ x: x, y: y, r: 5, maxR: 54, life: 0.6, maxLife: 0.6 });
    }

    function resize() {
      hudW = hud.width  = window.innerWidth;
      hudH = hud.height = window.innerHeight;
    }

    function frame(ts) {
      requestAnimationFrame(frame);
      var dt = Math.min((ts - lastTs) * 0.001, 0.05);
      lastTs = ts;

      // Active when the landing bg video has the .active class
      var videoOn = (idleBuf.classList.contains('active') || transBuf.classList.contains('active')) ? 1 : 0;
      hudAlpha += (videoOn - hudAlpha) * Math.min(1, dt * 2.5);

      hCtx.clearRect(0, 0, hudW, hudH);
      if (hudAlpha < 0.015) return;

      var moved = mx !== prevMx || my !== prevMy;
      prevMx = mx; prevMy = my;

      if (moved && mx > 0) {
        spawnBucket += dt;
        while (spawnBucket >= SPAWN_IVTL) {
          spawnBucket -= SPAWN_IVTL;
          spawnParticle(mx, my);
          if (Math.random() < 0.28) spawnRing(mx, my);
        }
      } else {
        spawnBucket = 0;
      }

      var i, rg, p, a, lifeP, fade;

      for (i = rings.length - 1; i >= 0; i--) {
        rg = rings[i];
        rg.life -= dt;
        if (rg.life <= 0) { rings.splice(i, 1); continue; }
        p = 1 - rg.life / rg.maxLife;
        rg.r = 5 + p * (rg.maxR - 5);
        a = (rg.life / rg.maxLife) * 0.20 * hudAlpha;
        hCtx.beginPath();
        hCtx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2);
        hCtx.strokeStyle = 'rgba(0,200,255,' + a.toFixed(3) + ')';
        hCtx.lineWidth = 0.75;
        hCtx.stroke();
      }

      hCtx.font = '9.5px "Space Mono","Courier New",monospace';
      hCtx.textBaseline = 'top';
      for (i = particles.length - 1; i >= 0; i--) {
        p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        lifeP = p.life / p.maxLife;
        if      (lifeP > 0.82) fade = (1 - lifeP) / 0.18;
        else if (lifeP < 0.28) fade = lifeP / 0.28;
        else                   fade = 1;
        a = fade * p.alpha * hudAlpha;
        hCtx.fillStyle = 'rgba(0,200,255,' + a.toFixed(3) + ')';
        hCtx.fillText(p.text, p.x, p.y);
      }
    }

    window.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; });
    window.addEventListener('resize', resize, { passive: true });
    resize();
    requestAnimationFrame(function (ts) { lastTs = ts; requestAnimationFrame(frame); });
  }());

  // ── TESTIMONIAL PARADE HOVER-PAUSE ──────────────────────────────────────
  (function initParadeHover() {
    var track = document.querySelector('.lnd-tc-track');
    if (!track) return;
    window.addEventListener('mousemove', function (e) {
      var r = track.getBoundingClientRect();
      var over = e.clientX >= r.left && e.clientX <= r.right &&
                 e.clientY >= r.top  && e.clientY <= r.bottom;
      track.style.animationPlayState = over ? 'paused' : 'running';
    }, { passive: true });
  }());

  // ── PROJECT LINK HOVER ──────────────────────────────────────
  (function initProjectLinkHover() {
  var links = document.querySelectorAll('.lnd-proj-link');
  if (!links.length) return;

  function isPointerInside(el, e) {
    var r = el.getBoundingClientRect();

    return (
      e.clientX >= r.left &&
      e.clientX <= r.right &&
      e.clientY >= r.top &&
      e.clientY <= r.bottom
    );
  }

  window.addEventListener('mousemove', function (e) {
    links.forEach(function (link) {
      var over = isPointerInside(link, e);
      link.classList.toggle('is-manual-hover', over);
    });
  }, { passive: true });

  window.addEventListener('click', function (e) {
    for (var i = 0; i < links.length; i++) {
      var link = links[i];

      if (isPointerInside(link, e)) {
        e.preventDefault();
        e.stopPropagation();

        var href = link.getAttribute('href');
        var target = link.getAttribute('target');

        if (!href) return;

        if (target === '_blank') {
          window.open(href, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = href;
        }

        return;
      }
    }
  }, true);
}());

}());
