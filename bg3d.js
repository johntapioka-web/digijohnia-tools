/* DIAS — arrière-plan 3D : le logo se reconstitue en particules, explose et se reforme en boucle.
   Three.js (r128) requis (chargé avant ce script). Le logo est échantillonné depuis /logo-dias.png (même origine). */
(function () {
  if (!window.THREE) { console.warn('[bg3d] THREE indisponible'); return; }
  var T = window.THREE;

  // --- canvas + overlay injectés ---
  var canvas = document.createElement('canvas');
  canvas.id = 'bg-3d';
  Object.assign(canvas.style, {
    position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
    zIndex: '-10', display: 'block', pointerEvents: 'none',
    background: 'radial-gradient(circle at 50% 40%, #0a1030 0%, #050616 45%, #010101 80%)'
  });
  var overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
    zIndex: '-9', pointerEvents: 'none',
    background: 'radial-gradient(circle at 50% 42%, rgba(1,1,1,0) 42%, rgba(1,1,1,0.5) 100%),'
      + ' linear-gradient(to bottom, rgba(1,1,1,0.30), rgba(1,1,1,0.10) 35%, rgba(1,1,1,0.55))'
  });
  document.body.appendChild(canvas);
  document.body.appendChild(overlay);

  var renderer;
  try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true }); }
  catch (e) { console.warn('[bg3d] WebGL indisponible — fond dégradé conservé'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  var scene = new T.Scene();
  scene.fog = new T.FogExp2(0x05060f, 0.04);
  var camera = new T.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 0.1, 9.2);

  var group = new T.Group(); scene.add(group);
  var stars = new T.Group(); scene.add(stars);

  function makeSprite(soft) {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var x = c.getContext('2d');
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(soft ? 0.5 : 0.65, 'rgba(255,255,255,' + (soft ? 0.6 : 0.9) + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    var tex = new T.Texture(c); tex.needsUpdate = true; return tex;
  }
  var sprite = makeSprite(false), starSprite = makeSprite(true);

  // --- starfield ---
  var SN = 700, sPos = new Float32Array(SN * 3), sCol = new Float32Array(SN * 3);
  var sc1 = new T.Color(0x8fb3ff), sc2 = new T.Color(0xffffff);
  for (var i = 0; i < SN; i++) {
    var r = 14 + Math.random() * 32, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    sPos[i*3] = r*Math.sin(ph)*Math.cos(th); sPos[i*3+1] = r*Math.sin(ph)*Math.sin(th); sPos[i*3+2] = r*Math.cos(ph) - 12;
    var cc = sc1.clone().lerp(sc2, Math.random()); sCol[i*3]=cc.r; sCol[i*3+1]=cc.g; sCol[i*3+2]=cc.b;
  }
  var stGeo = new T.BufferGeometry();
  stGeo.setAttribute('position', new T.BufferAttribute(sPos, 3));
  stGeo.setAttribute('color', new T.BufferAttribute(sCol, 3));
  stars.add(new T.Points(stGeo, new T.PointsMaterial({ size: 0.06, map: starSprite, vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true })));

  // --- particules depuis le logo ---
  var COUNT = 0, assembled, exploded, live, seeds, pGeo = null, posAttr = null;
  function buildFromImage(img) {
    var W = window.innerWidth < 768 ? 130 : 175, H = W;
    var lc = document.createElement('canvas'); lc.width = W; lc.height = H;
    var ix = lc.getContext('2d'); ix.drawImage(img, 0, 0, W, H);
    var data; try { data = ix.getImageData(0, 0, W, H).data; } catch (e) { console.warn('[bg3d] lecture pixels impossible', e); return; }
    var STEP = 2, cand = [];
    for (var y = 0; y < H; y += STEP) for (var x = 0; x < W; x += STEP) {
      var idx = (y * W + x) * 4, a = data[idx + 3]; if (a < 40) continue;
      var rr = data[idx], gg = data[idx + 1], bb = data[idx + 2];
      var lum = (0.299 * rr + 0.587 * gg + 0.114 * bb) / 255; if (lum < 0.16) continue;
      cand.push([x, y, rr, gg, bb, lum]);
    }
    for (var k = cand.length - 1; k > 0; k--) { var j = (Math.random() * (k + 1)) | 0; var tt = cand[k]; cand[k] = cand[j]; cand[j] = tt; }
    var CAP = window.innerWidth < 768 ? 3400 : 6500;
    var list = cand.slice(0, Math.min(CAP, cand.length));
    COUNT = list.length;
    assembled = new Float32Array(COUNT * 3); exploded = new Float32Array(COUNT * 3);
    live = new Float32Array(COUNT * 3); seeds = new Float32Array(COUNT);
    var colors = new Float32Array(COUNT * 3);
    var SIZE = 6.4, DEPTH = 0.9, dir = new T.Vector3();
    for (var n = 0; n < COUNT; n++) {
      var it = list[n], px = it[0], py = it[1];
      var wx = (px / W - 0.5) * SIZE, wy = (0.5 - py / H) * SIZE, wz = (it[5] - 0.5) * DEPTH;
      assembled[n*3]=wx; assembled[n*3+1]=wy; assembled[n*3+2]=wz;
      live[n*3]=wx; live[n*3+1]=wy; live[n*3+2]=wz;
      dir.set(wx, wy, wz); if (dir.lengthSq() < 1e-4) dir.set(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5); dir.normalize();
      var mag = 2.4 + Math.random() * 7.0;
      exploded[n*3]   = wx + dir.x*mag + (Math.random()-0.5)*3.0;
      exploded[n*3+1] = wy + dir.y*mag + (Math.random()-0.5)*3.0;
      exploded[n*3+2] = wz + dir.z*mag + (Math.random()-0.5)*5.5;
      colors[n*3]=it[2]/255; colors[n*3+1]=it[3]/255; colors[n*3+2]=it[4]/255;
      seeds[n] = Math.random() * Math.PI * 2;
    }
    pGeo = new T.BufferGeometry();
    pGeo.setAttribute('position', new T.BufferAttribute(live, 3));
    pGeo.setAttribute('color', new T.BufferAttribute(colors, 3));
    posAttr = pGeo.attributes.position;
    group.add(new T.Points(pGeo, new T.PointsMaterial({ size: 0.075, map: sprite, vertexColors: true, transparent: true, opacity: 1.0, depthWrite: false, blending: T.NormalBlending, sizeAttenuation: true })));
  }

  var CYCLE = 9.0, clock = new T.Clock();
  var mx = 0, my = 0, tmx = 0, tmy = 0;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.addEventListener('mousemove', function (e) { tmx = e.clientX / window.innerWidth - 0.5; tmy = e.clientY / window.innerHeight - 0.5; }, { passive: true });
  window.addEventListener('resize', function () {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  });

  function animate() {
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();
    if (pGeo) {
      var e = 0.5 - 0.5 * Math.cos((t / CYCLE) % 1 * Math.PI * 2);
      if (reduce) e *= 0.25;
      for (var n = 0; n < COUNT; n++) {
        var a = n*3, b = a+1, c = a+2, s = seeds[n], sh = e * 0.05;
        live[a] = assembled[a] + (exploded[a]-assembled[a])*e + Math.sin(t*0.9+s)*sh;
        live[b] = assembled[b] + (exploded[b]-assembled[b])*e + Math.cos(t*0.8+s)*sh;
        live[c] = assembled[c] + (exploded[c]-assembled[c])*e;
      }
      posAttr.needsUpdate = true;
    }
    mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;
    group.rotation.y = Math.sin(t * 0.25) * 0.45 + mx * 0.6;
    group.rotation.x = Math.sin(t * 0.20) * 0.10 + my * 0.4;
    stars.rotation.y = t * 0.015;
    renderer.render(scene, camera);
  }

  var img = new Image();
  img.onload = function () { buildFromImage(img); };
  img.onerror = function () { console.warn('[bg3d] logo non chargé'); };
  img.src = '/logo-dias.png';
  animate();
})();
