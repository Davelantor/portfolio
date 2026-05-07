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
    [0x000000, 0x1e0c04, 0x993320],  // 3 seismic
    [0x000000, 0x071a0e, 0x007744],  // 4 Ajeco (green)
    [0x000000, 0x062018, 0x009988],  // 5 design system (teal)
    [0x060010, 0x100820, 0x6633bb],  // 6 logistics (purple)
    [0x08001a, 0x140830, 0x7722cc],  // 7 lab tracking (purple)
    [0x000000, 0x091a0e, 0x007744],  // 8 timeline
    [0x060310, 0x11091e, 0x6644aa],  // 9 CTA
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
  var lndBgVid   = document.getElementById('lnd-bg-video');
  var lndBgVidRAF = null;
  var lndBgReverseT = null;

  // Idle loops — play while user dwells on a scene
  var BG_IDLE = {
    2: 'videos/0025-1025.mp4',
    3: 'videos/1075-2075.mp4',
    4: 'videos/2125-3125.mp4',
    5: 'videos/3175-4175.mp4',
    6: 'videos/4225-5225.mp4',
    7: 'videos/5275-6275.mp4',
  };

  // Transition clips keyed by 'lo-hi' (lower scene first)
  var BG_TRANS = {
    '1-2': 'videos/0000-0025.mp4',
    '2-3': 'videos/1025-1075.mp4',
    '3-4': 'videos/2075-2125.mp4',
    '4-5': 'videos/3125-3175.mp4',
    '5-6': 'videos/4175-4225.mp4',
    '6-7': 'videos/5225-5275.mp4',
    '7-8': 'videos/6275-6300.mp4',
  };

  function bgCancelReverse() {
    if (lndBgVidRAF) { cancelAnimationFrame(lndBgVidRAF); lndBgVidRAF = null; }
    lndBgReverseT = null;
  }

  function bgPlayForward(src, loop, onDone) {
    bgCancelReverse();
    lndBgVid.loop    = !!loop;
    lndBgVid.onended = loop ? null : (onDone || null);
    lndBgVid.src     = src;
    lndBgVid.load();
    lndBgVid.play().catch(function () {});
  }

  function bgPlayReverse(src, onDone) {
    bgCancelReverse();
    lndBgVid.pause();
    lndBgVid.loop    = false;
    lndBgVid.onended = null;
    lndBgVid.src     = src;
    lndBgVid.load();
    function onMeta() {
      lndBgVid.removeEventListener('loadedmetadata', onMeta);
      lndBgVid.currentTime = lndBgVid.duration;
      lndBgReverseT = performance.now();
      function tick(now) {
        var elapsed = (now - lndBgReverseT) / 1000;
        lndBgReverseT = now;
        var next = Math.max(0, lndBgVid.currentTime - elapsed);
        lndBgVid.currentTime = next;
        if (next <= 0.04) {
          lndBgVidRAF = null;
          if (onDone) onDone();
        } else {
          lndBgVidRAF = requestAnimationFrame(tick);
        }
      }
      lndBgVidRAF = requestAnimationFrame(tick);
    }
    lndBgVid.addEventListener('loadedmetadata', onMeta);
  }

  function bgEnterScene(next, prev, direction) {
    var lo       = Math.min(prev, next);
    var hi       = Math.max(prev, next);
    var transUrl = BG_TRANS[lo + '-' + hi];
    var idleUrl  = BG_IDLE[next];

    if (transUrl || idleUrl) {
      lndBgVid.classList.add('active');
      bgCanvas.style.opacity = '0.18';
    }

    if (transUrl) {
      var afterTrans = idleUrl
        ? function () { bgPlayForward(idleUrl, true, null); }
        : function () {
            lndBgVid.classList.remove('active');
            bgCanvas.style.opacity = '1';
          };
      if (direction > 0) {
        bgPlayForward(transUrl, false, afterTrans);
      } else {
        bgPlayReverse(transUrl, afterTrans);
      }
    } else if (idleUrl) {
      bgPlayForward(idleUrl, true, null);
    } else {
      bgCancelReverse();
      lndBgVid.pause();
      lndBgVid.classList.remove('active');
      bgCanvas.style.opacity = '1';
    }
  }

  // ── SCROLL-JACKING ENGINE ────────────────────────────────────────────────
  var TOTAL_SCENES   = 10;
  var currentScene   = 0;
  var isTransitioning = false;
  var throttleTimer  = null;
  var touchStartY    = 0;
  var wheelAccum     = 0;
  var THRESHOLD      = 80;

  var SCENES = [
    { el: 'lnd-scene-0', blocks: ['s0-tag','s0-name','s0-sub','s0-hint'] },
    { el: 'lnd-scene-1', blocks: ['s1-tag','s1-head','s1-stats','s1-sub'] },
    { el: 'lnd-scene-2', blocks: ['s2-img', 's2-right'] },
    { el: 'lnd-scene-3', blocks: ['s3-img', 's3-right'] },
    { el: 'lnd-scene-4', blocks: ['s4-img', 's4-right'] },
    { el: 'lnd-scene-5', blocks: ['s5-img', 's5-right'] },
    { el: 'lnd-scene-6', blocks: ['s6-img', 's6-right'] },
    { el: 'lnd-scene-7', blocks: ['s7-img', 's7-right'] },
    { el: 'lnd-scene-8', blocks: ['s8-tag','s8-head','s8-timeline'] },
    { el: 'lnd-scene-9', blocks: ['s9-tag','s9-head','s9-cta'] },
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
    nextEl.style.pointerEvents = next === 9 ? 'auto' : 'none';
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
