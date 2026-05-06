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
    [0x000000, 0x091840, 0x0066aa],
    [0x000000, 0x091840, 0x0066aa],
    [0x000000, 0x091840, 0x0066aa],
    [0x000000, 0x1e0c04, 0x993320],
    [0x000000, 0x091a0e, 0x007744],
    [0x060310, 0x11091e, 0x6644aa],
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

  // ── PROJECT MINI CANVASES ────────────────────────────────────────────────
  function initProjCanvas(id, color1, color2) {
    var canvas = document.getElementById(id);
    if (!canvas) return;
    var scene  = new THREE.Scene();
    var cam    = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
    cam.position.set(0, 3.5, 6);
    cam.lookAt(0, 0, 0);
    var r  = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    r.setSize(640, 360);
    r.setPixelRatio(1);
    var W = 50, H = 50;
    var g  = new THREE.PlaneGeometry(12, 12, W, H);
    g.rotateX(-Math.PI / 2);
    var ca = new Float32Array(g.attributes.position.count * 3);
    g.setAttribute('color', new THREE.BufferAttribute(ca, 3));
    var m    = new THREE.MeshBasicMaterial({ wireframe: true, vertexColors: true, transparent: true, opacity: 0.65 });
    var mesh = new THREE.Mesh(g, m);
    scene.add(mesh);
    var c0  = new THREE.Color(0x04070e);
    var c1  = new THREE.Color(color1);
    var c2  = new THREE.Color(color2);
    var pos = g.attributes.position;
    var col = g.attributes.color;
    var t   = Math.random() * 10;
    function loop() {
      requestAnimationFrame(loop);
      t += 0.009;
      for (var i = 0; i <= W; i++) for (var j = 0; j <= H; j++) {
        var idx = j * (W + 1) + i;
        var x = pos.getX(idx), z = pos.getZ(idx);
        var y = Math.sin(x * 0.6 + t) * 0.5
              + Math.cos(z * 0.5 + t * 0.9) * 0.4
              + Math.sin((x - z) * 0.3 + t * 1.3) * 0.2;
        pos.setY(idx, y);
        var n = Math.max(0, Math.min(1, (y + 1.1) / 2.2));
        var cv = n < 0.5 ? c0.clone().lerp(c1, n * 2) : c1.clone().lerp(c2, (n - 0.5) * 2);
        col.setXYZ(idx, cv.r, cv.g, cv.b);
      }
      pos.needsUpdate = true;
      col.needsUpdate = true;
      r.render(scene, cam);
    }
    loop();
  }
  initProjCanvas('lnd-proj-canvas-0', 0x0d2060, 0x00c8ff);
  initProjCanvas('lnd-proj-canvas-1', 0x2d1206, 0xff6b2b);

  // ── SCROLL-JACKING ENGINE ────────────────────────────────────────────────
  var TOTAL_SCENES   = 6;
  var currentScene   = 0;
  var isTransitioning = false;
  var throttleTimer  = null;
  var touchStartY    = 0;
  var wheelAccum     = 0;
  var THRESHOLD      = 80;

  var SCENES = [
    { el: 'lnd-scene-0', blocks: ['s0-tag','s0-name','s0-sub','s0-hint'] },
    { el: 'lnd-scene-1', blocks: ['s1-tag','s1-head','s1-stats','s1-sub'] },
    { el: 'lnd-scene-2', blocks: ['s2-content'] },
    { el: 'lnd-scene-3', blocks: ['s3-content'] },
    { el: 'lnd-scene-4', blocks: ['s4-tag','s4-head','s4-timeline'] },
    { el: 'lnd-scene-5', blocks: ['s5-tag','s5-head','s5-cta'] },
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
      prevEl.style.opacity      = '0';
      prevEl.style.pointerEvents = 'none';
    }, 200);

    var nextEl = document.getElementById(SCENES[next].el);
    setBlocks(next, preClass);
    nextEl.style.opacity      = '1';
    nextEl.style.pointerEvents = next === 5 ? 'auto' : 'none';
    setTimeout(function () { setBlocks(next, 'in'); }, 120);

    targetPalette = SCENE_PALETTES[next].slice();

    if (next === 4) {
      setTimeout(function () {
        ['lnd-tl0','lnd-tl1','lnd-tl2','lnd-tl3'].forEach(function (id, i) {
          setTimeout(function () {
            var el = document.getElementById(id);
            if (el) el.classList.add('lit');
          }, i * 180);
        });
      }, 400);
    } else {
      ['lnd-tl0','lnd-tl1','lnd-tl2','lnd-tl3'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove('lit');
      });
    }

    updateProgress();
    isTransitioning = false;
  }

  function updateProgress() {
    var dots = document.querySelectorAll('.lnd-prog-dot');
    dots.forEach(function (d, i) {
      d.classList.toggle('active',  i === currentScene);
      d.classList.toggle('visited', i < currentScene);
    });
    var label = document.getElementById('lnd-progress-label');
    if (label) label.textContent = currentScene + ' / ' + (TOTAL_SCENES - 1);
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
  var cursorDot  = document.getElementById('lnd-cursor');
  var cursorRing = document.getElementById('lnd-cursor-ring');
  lndWrapper.addEventListener('mousemove', function (e) {
    cursorDot.style.left  = e.clientX + 'px';
    cursorDot.style.top   = e.clientY + 'px';
    setTimeout(function () {
      cursorRing.style.left = e.clientX + 'px';
      cursorRing.style.top  = e.clientY + 'px';
    }, 60);
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

}());
