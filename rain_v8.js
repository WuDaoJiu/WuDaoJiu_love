/* P3 卡面翻转 + RAIN v8：WebGL2 玻璃折射
   旧版（v6/v7）用预渲染精灵贴图：水珠边缘是死的，只能靠画上去的高光暗环
   假装玻璃，看起来像溅在屏幕上的灰脏点。
   v8 改按真正的折射思路重写：2D Canvas 画底图 -> 上传纹理 -> 全屏 fragment
   shader 用数学高度场生成水珠，按球面法线偏移采样坐标，形成透镜畸变。 */
(function () {
  var p3 = document.getElementById('page3');
  if (!p3) return;
  var cards = [].slice.call(p3.querySelectorAll('.page3-highlight'));
  if (!cards.length) return;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var canvas = null, gl = null, prog = null;
  var rainOn = false, rafId = 0;
  var W = 0, H = 0, DPR = 1;
  var _time = 0, _last = 0;
  var _resizeBound = false;
  var uni = {};
  var texBase = null, texTrail = null;
  var baseCanvas = null, baseCtx = null;
  var trailCanvas = null, trailCtx = null;
  var _baseImg = null, _baseDirty = true;

  var VS = [
    '#version 300 es',
    'in vec2 aPos;',
    'void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }'
  ].join('\n');

  var FS = [
    '#version 300 es',
    'precision highp float;',
    'out vec4 outColor;',
    'uniform sampler2D uBase;',
    'uniform sampler2D uTrail;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    '',
    'float hash21(vec2 p){',
    '  p = fract(p * vec2(123.34, 456.21));',
    '  p += dot(p, p + 45.32);',
    '  return fract(p.x * p.y);',
    '}',
    'vec2 hash22(vec2 p){',
    '  float n = hash21(p);',
    '  return vec2(n, hash21(p + n * 7.13));',
    '}',
    '',
    '/* 一层水珠：返回 (法线xy, 高度z, 遮罩) */',
    'vec4 dropLayer(vec2 uv, float scale, float density, float t){',
    '  vec2 gv = uv * scale;',
    '  vec2 id = floor(gv);',
    '  vec2 f  = fract(gv) - 0.5;',
    '  if (hash21(id) > density) return vec4(0.0);',
    '  vec2 seed = hash22(id);',
    '  vec2 off = (seed - 0.5) * 0.46;',
    '  float rad = 0.13 + 0.26 * hash21(id + 11.7);',
    '  /* 极慢的上下浮动：整颗水珠在自己的格子里呼吸，不跨格，避免瞬移 */',
    '  float sway = sin(t * (0.30 + 0.25 * seed.x) + seed.y * 6.2831);',
    '  vec2 d = f - off - vec2(0.0, sway * 0.06 * seed.y);',
    '  float stretch = 1.0 + 0.32 * seed.x;',
    '  d.y /= stretch;',
    '  float dist = length(d) / rad;',
    '  if (dist > 1.0) return vec4(0.0);',
    '  float z = sqrt(max(0.0, 1.0 - dist * dist));',
    '  float a = smoothstep(1.0, 0.90, dist);',
    '  return vec4(d / rad, z, a);',
    '}',
    '',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes;',
    '  float asp = uRes.x / uRes.y;',
    '  vec2 suv = vec2(uv.x * asp, uv.y);',
    '',
    '  vec4 dA = dropLayer(suv, 19.0, 0.58, uTime);',
    '  vec4 dB = dropLayer(suv, 7.2,  0.40, uTime * 0.62);',
    '  vec4 d = dA.w > dB.w ? dA : dB;',
    '',
    '  float wipe = texture(uTrail, uv).r;',
    '  vec3 col = texture(uBase, uv).rgb;',
    '  float a = 0.05 * (1.0 - wipe);',
    '',
    '  if (d.w > 0.004) {',
    '    vec2 nrm = d.xy;',
    '    float z = d.z;',
    '    /* 关键一步：按球面法线偏移采样坐标，这就是玻璃折射 */',
    '    vec2 refr = uv + nrm * 0.085 * z;',
    '    col = texture(uBase, refr).rgb;',
    '    /* 边缘厚度：越靠边越暗，形成玻璃珠的厚重环 */',
    '    float rim = smoothstep(0.22, 0.95, length(nrm));',
    '    col *= mix(1.0, 0.56, rim);',
    '    /* 主高光 */',
    '    vec3 N = normalize(vec3(nrm, z + 0.001));',
    '    vec3 L = normalize(vec3(-0.42, 0.52, 0.74));',
    '    col += pow(max(dot(N, L), 0.0), 40.0) * 1.25;',
    '    /* 副高光：左下小反光 */',
    '    vec3 L2 = normalize(vec3(0.55, -0.62, 0.55));',
    '    col += pow(max(dot(N, L2), 0.0), 90.0) * 0.40;',
    '    a = max(a, d.w);',
    '  }',
    '',
    '  /* 玻璃水汽：极淡冷白，被擦过的地方变清 */',
    '  col = mix(col, vec3(0.95, 0.97, 1.0), 0.035 * (1.0 - wipe));',
    '  outColor = vec4(col, a);',
    '}'
  ].join('\n');

  function makeTex() {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[rain] shader error', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function initGL() {
    gl = canvas.getContext('webgl2', {
      alpha: true, premultipliedAlpha: false, antialias: false,
      depth: false, stencil: false, powerPreference: 'high-performance'
    });
    if (!gl) { console.warn('[rain] no webgl2'); return false; }
    var vs = compile(gl.VERTEX_SHADER, VS);
    var fs = compile(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return false;
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[rain] link error', gl.getProgramInfoLog(prog));
      return false;
    }
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    uni.uBase = gl.getUniformLocation(prog, 'uBase');
    uni.uTrail = gl.getUniformLocation(prog, 'uTrail');
    uni.uRes = gl.getUniformLocation(prog, 'uRes');
    uni.uTime = gl.getUniformLocation(prog, 'uTime');
    texBase = makeTex();
    texTrail = makeTex();
    gl.uniform1i(uni.uBase, 0);
    gl.uniform1i(uni.uTrail, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    return true;
  }

  function sizeUp() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    if (!canvas) return;
    canvas.width = Math.max(1, Math.round(W * DPR));
    canvas.height = Math.max(1, Math.round(H * DPR));
  }

  /* 底图：把页面结构画成一张低分辨率色块图，作为折射的内容来源。
     水珠外的像素 alpha 为 0，所以真实 DOM 完全不受影响。 */
  function buildBase() {
    if (!baseCanvas) {
      baseCanvas = document.createElement('canvas');
      baseCtx = baseCanvas.getContext('2d');
    }
    var bw = Math.max(1, Math.round(W * 0.8));
    var bh = Math.max(1, Math.round(H * 0.8));
    baseCanvas.width = bw;
    baseCanvas.height = bh;
    var g = baseCtx;
    var k = bw / W;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, bw, bh);

    var bn = p3.querySelector('.page3-banner');
    if (bn && _baseImg && _baseImg.complete && _baseImg.naturalWidth) {
      var rb = bn.getBoundingClientRect();
      if (rb.width > 4 && rb.height > 4) {
        g.save();
        g.globalAlpha = 0.95;
        g.drawImage(_baseImg, rb.left * k, rb.top * k, rb.width * k, rb.height * k);
        g.restore();
      }
    }

    var sel = '.page3-avatar,.page3-identity h1,.page3-handle,.page3-location,' +
              '.page3-subscribe,.page3-url,.page3-highlight,.page3-tab,' +
              '.page3-post-head,.page3-post-body,.page3-post-img';
    var nodes = p3.querySelectorAll(sel);
    for (var i = 0; i < nodes.length; i++) {
      var b = nodes[i].getBoundingClientRect();
      if (b.width < 3 || b.height < 3) continue;
      if (b.bottom < -40 || b.top > H + 40) continue;
      g.fillStyle = 'rgba(122,154,186,0.13)';
      g.fillRect(b.left * k, b.top * k, b.width * k, b.height * k);
    }
    _baseDirty = true;
  }

  function initTrail() {
    if (!trailCanvas) {
      trailCanvas = document.createElement('canvas');
      trailCtx = trailCanvas.getContext('2d');
    }
    trailCanvas.width = Math.max(1, Math.round(W * 0.5));
    trailCanvas.height = Math.max(1, Math.round(H * 0.5));
    trailCtx.setTransform(1, 0, 0, 1, 0, 0);
    trailCtx.fillStyle = '#000000';
    trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
  }

  function uploadBase() {
    if (!baseCanvas || !gl) return;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texBase);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, baseCanvas);
  }

  function uploadTrail() {
    if (!trailCanvas || !gl) return;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texTrail);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, trailCanvas);
  }

  function paintTrail(x, y, rad) {
    if (!trailCtx) return;
    var kx = trailCanvas.width / W;
    var ky = trailCanvas.height / H;
    var cx = x * kx, cy = y * ky;
    var rr2 = (rad || 30) * kx;
    var grd = trailCtx.createRadialGradient(cx, cy, 0, cx, cy, rr2);
    grd.addColorStop(0, 'rgba(255,255,255,0.42)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    trailCtx.globalCompositeOperation = 'lighter';
    trailCtx.fillStyle = grd;
    trailCtx.beginPath();
    trailCtx.arc(cx, cy, rr2, 0, Math.PI * 2);
    trailCtx.fill();
    trailCtx.globalCompositeOperation = 'source-over';
  }

  function frame(now) {
    if (!rainOn || !gl) { rafId = 0; return; }
    rafId = requestAnimationFrame(frame);
    if (!_last) _last = now;
    var dt = Math.min(0.05, (now - _last) / 1000);
    _last = now;
    _time += dt;

    if (trailCtx) {
      trailCtx.fillStyle = 'rgba(0,0,0,0.014)';
      trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
    }
    if (_baseDirty) { uploadBase(); _baseDirty = false; }
    uploadTrail();

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.uniform2f(uni.uRes, canvas.width, canvas.height);
    gl.uniform1f(uni.uTime, _time);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texBase);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texTrail);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function loadBaseImage() {
    if (_baseImg) return;
    _baseImg = new Image();
    _baseImg.onload = function () { buildBase(); };
    _baseImg.src = 'page3-banner.jpg';
  }

  function ensureRain() {
    if (canvas && canvas.isConnected && gl) return canvas;
    if (canvas && canvas.parentNode) canvas.remove();
    canvas = document.createElement('canvas');
    canvas.className = 'page3-rain-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    if (!initGL()) return canvas;
    sizeUp();
    initTrail();
    loadBaseImage();
    buildBase();
    if (!_resizeBound) {
      _resizeBound = true;
      window.addEventListener('resize', function () {
        if (!canvas || !gl) return;
        sizeUp();
        initTrail();
        buildBase();
      });
    }
    return canvas;
  }

  function setRain(on) {
    ensureRain();
    if (!gl) return;
    rainOn = on;
    if (canvas) canvas.classList.toggle('is-on', on);
    if (on) {
      buildBase();
      _last = 0;
      if (!rafId) rafId = requestAnimationFrame(frame);
    } else {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }

  var _drag = false;
  p3.addEventListener('pointerdown', function (ev) {
    if (!rainOn || !trailCtx) return;
    _drag = true;
    paintTrail(ev.clientX, ev.clientY, 30);
  }, { passive: true });
  p3.addEventListener('pointermove', function (ev) {
    if (!rainOn || !_drag || !trailCtx) return;
    paintTrail(ev.clientX, ev.clientY, 24);
  }, { passive: true });
  window.addEventListener('pointerup', function () { _drag = false; }, { passive: true });
  window.addEventListener('pointercancel', function () { _drag = false; }, { passive: true });

  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      var flipped = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', flipped ? 'true' : 'false');
      if (card.dataset.flip === 'rain') setRain(flipped);
    });
    card.setAttribute('aria-pressed', 'false');
  });

  new MutationObserver(function () {
    if (!p3.classList.contains('is-visible')) {
      if (rainOn) setRain(false);
      cards.forEach(function (c) {
        c.classList.remove('is-flipped');
        c.setAttribute('aria-pressed', 'false');
      });
    }
  }).observe(p3, { attributes: true, attributeFilter: ['class'] });
})();
