/*!
 * carousel.js — 液态透镜旋转木马
 * 移植自 React + ogl 的 FlexCarousel：卡片先渲染到离屏纹理，再用透镜着色器做
 * 弯折、位移与色散，最后合成到画布。去掉了 ogl 依赖，改成原生 WebGL2。
 */
(function (global) {
  'use strict';

  var PRESET = {
    lensWidth: 1,
    lensHeight: 1,
    tilt: 0,
    roundness: 0.55,
    bend: 0.07,
    reach: 0.3,
    dispersion: 0.1,
    liquid: 0
  };
  var TAPS = 12;
  var PIXEL_BUDGET = 4.5e6;
  var INTRO_SECONDS = 2.1;

  var clamp01 = function (v) {
    return Math.min(Math.max(v, 0), 1);
  };
  var easeOut = function (v) {
    return 1 - Math.pow(1 - clamp01(v), 3);
  };
  var easeOutQuint = function (v) {
    return 1 - Math.pow(1 - clamp01(v), 5);
  };
  var easeInOut = function (v) {
    var t = clamp01(v);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };
  var wrap = function (value, size) {
    return ((((value + size / 2) % size) + size) % size) - size / 2;
  };

  var CARD_VERTEX = `#version 300 es
in vec3 position;
in vec2 uv;
uniform vec4 uRect;
uniform vec2 uResolution;
out vec2 vUv;
out vec2 vLocal;
void main() {
  vUv = uv;
  vLocal = vec2(position.x, -position.y) * uRect.zw;
  vec2 px = uRect.xy + vLocal;
  gl_Position = vec4(px.x / uResolution.x * 2.0 - 1.0, 1.0 - px.y / uResolution.y * 2.0, 0.0, 1.0);
}`;

  var CARD_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D tMap;
uniform vec2 uSize;
uniform vec2 uImage;
uniform float uRadius;
uniform float uAlpha;
uniform float uReady;
uniform float uShift;
uniform float uDpr;
uniform vec3 uPlaceholder;
in vec2 vUv;
in vec2 vLocal;
out vec4 fragColor;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  float sd = roundedBox(vLocal, uSize * 0.5, min(uRadius, min(uSize.x, uSize.y) * 0.5));
  float mask = clamp(0.5 - sd * uDpr, 0.0, 1.0);
  vec2 local = vLocal / uSize + 0.5;
  float cardAspect = uSize.x / uSize.y;
  float imageAspect = uImage.x / max(uImage.y, 1.0);
  vec2 scale = imageAspect > cardAspect ? vec2(cardAspect / imageAspect, 1.0) : vec2(1.0, imageAspect / cardAspect);
  vec2 uv = vec2(local.x, 1.0 - local.y);
  uv = (uv - 0.5) * scale + 0.5;
  uv.x += uShift * (1.0 - scale.x) * 0.5;
  vec3 image = texture(tMap, uv).rgb;
  vec3 color = mix(uPlaceholder, image, uReady);
  float alpha = mask * uAlpha;
  fragColor = vec4(color * alpha, alpha);
}`;

  var LENS_VERTEX = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

  var LENS_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D tScene;
uniform vec2 uResolution;
uniform float uDpr;
uniform vec2 uCenter;
uniform vec2 uHalf;
uniform float uAngle;
uniform float uExponent;
uniform float uInner;
uniform float uOuter;
uniform float uFlow;
uniform float uCurl;
uniform float uDispersion;
uniform float uStrength;
uniform float uSceneAlpha;
out vec4 fragColor;

void main() {
  vec2 frag = gl_FragCoord.xy / uDpr;
  vec2 uv = frag / uResolution;
  vec2 rel = frag - vec2(uCenter.x, uResolution.y - uCenter.y);
  float ca = cos(uAngle);
  float sa = sin(uAngle);
  vec2 local = vec2(ca * rel.x + sa * rel.y, -sa * rel.x + ca * rel.y);
  vec2 k = max(abs(local) / uHalf, vec2(1e-5));
  float nd = pow(pow(k.x, uExponent) + pow(k.y, uExponent), 1.0 / uExponent);
  vec2 grad = pow(k, vec2(uExponent - 1.0)) * sign(local) / uHalf * pow(nd, 1.0 - uExponent);
  float glen = max(length(grad), 1e-6);
  float edge = (nd - 1.0) / glen;
  vec2 outward = grad / glen;
  vec2 normal = vec2(ca * outward.x - sa * outward.y, sa * outward.x + ca * outward.y);
  vec2 along = vec2(-normal.y, normal.x);

  float t = clamp((edge + uInner) / (uInner + uOuter), 0.0, 1.0);
  float ramp = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  float slope = 16.0 * t * t * (1.0 - t) * (1.0 - t);
  float reachX = rel.x / (uResolution.x * 0.5);
  float side = smoothstep(0.02, 0.3, abs(reachX)) * (uCurl == 0.0 ? sign(reachX) : uCurl);
  float lift = ramp * side * uFlow * uStrength;
  vec2 swirl = along * along.y * side * slope * uFlow * uStrength * 0.35;
  vec2 drift = vec2(0.0, -lift) - swirl;
  vec2 shifted = uv + drift / uResolution;

  vec2 texels = uResolution * uDpr;
  vec2 gx = dFdx(shifted);
  vec2 gy = dFdy(shifted);
  gx *= min(1.0, 3.0 / max(length(gx * texels), 1e-4));
  gy *= min(1.0, 3.0 / max(length(gy * texels), 1e-4));

  vec4 color = textureGrad(tScene, shifted, gx, gy);
  vec2 spread = vec2(0.0, side * slope * uFlow * uStrength) / uResolution * uDispersion;
  float spreadPx = length(spread * texels);
  if (color.a > 0.002 && spreadPx > 0.25) {
    vec3 base = color.rgb / color.a;
    vec3 sumColor = vec3(0.0);
    vec3 sumWeight = vec3(0.0);
    for (int i = 0; i < ${TAPS}; i++) {
      float s = (float(i) + 0.5) / float(${TAPS});
      vec4 c = textureGrad(tScene, shifted + spread * (s - 0.5), gx, gy);
      vec3 w = max(1.0 - abs(vec3(s) - vec3(0.15, 0.5, 0.85)) * 2.6, 0.0) * c.a;
      sumColor += c.rgb * (w / max(c.a, 0.002));
      sumWeight += w;
    }
    vec3 split = mix(base, sumColor / max(sumWeight, vec3(1e-4)), clamp(sumWeight * 2.0, 0.0, 1.0));
    color.rgb = mix(color.rgb, clamp(split, 0.0, 1.0) * color.a, smoothstep(0.25, 1.5, spreadPx));
  }

  fragColor = color * uSceneAlpha;
}`;

  /* ---------------- WebGL 小工具 ---------------- */

  function compile(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    if (global.console) global.console.warn('[carousel] shader:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  function makeProgram(gl, vertexSource, fragmentSource) {
    var vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    var fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    var program = gl.createProgram();
    if (!vertex || !fragment || !program) return null;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (global.console) global.console.warn('[carousel] link:', gl.getProgramInfoLog(program));
      return null;
    }
    var uniforms = {};
    var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < count; i++) {
      var info = gl.getActiveUniform(program, i);
      if (!info) continue;
      var name = info.name.replace(/\[0\]$/, '');
      uniforms[name] = { loc: gl.getUniformLocation(program, name), type: info.type };
    }
    return { program: program, uniforms: uniforms };
  }

  function setUniform(gl, program, name, value) {
    var item = program.uniforms[name];
    if (!item || !item.loc) return;
    switch (item.type) {
      case gl.FLOAT:
        gl.uniform1f(item.loc, value);
        break;
      case gl.FLOAT_VEC2:
        gl.uniform2fv(item.loc, value);
        break;
      case gl.FLOAT_VEC3:
        gl.uniform3fv(item.loc, value);
        break;
      case gl.FLOAT_VEC4:
        gl.uniform4fv(item.loc, value);
        break;
      case gl.INT:
      case gl.SAMPLER_2D:
        gl.uniform1i(item.loc, value);
        break;
      default:
        break;
    }
  }

  /* ---------------- 主体 ---------------- */

  function mount(container, options) {
    if (!container) return null;
    var opts = options || {};
    var stage = opts.stage || container;

    var list = container.querySelector('[data-items]');
    var preset = global.GALLERY;
    var items = opts.items || (preset && preset.length
      ? preset
      : list
        ? Array.prototype.slice
            .call(list.querySelectorAll('li'))
            .map(function (li) {
              var img = li.querySelector('img');
              return { src: img ? img.getAttribute('src') : '', title: li.getAttribute('data-title') || '' };
            })
            .filter(function (item) {
              return item.src;
            })
        : []);
    if (!items.length) return null;

    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    stage.prepend(canvas);

    var gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false
    });
    if (!gl) {
      canvas.remove();
      return null;
    }
    gl.clearColor(0, 0, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    var cardProgram = makeProgram(gl, CARD_VERTEX, CARD_FRAGMENT);
    var lensProgram = makeProgram(gl, LENS_VERTEX, LENS_FRAGMENT);
    if (!cardProgram || !lensProgram) return null;

    /* 标记 WebGL 可用：可用于隐藏占位图，避免占位裁切与卡片渲染不一致时的跳变 */
    container.setAttribute('data-webgl', '1');
    /* 几何 */
    function bufferGeometry(program, positions, size, uvs, indices) {
      var vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      var pb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, pb);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      var posLoc = gl.getAttribLocation(program.program, 'position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, size, gl.FLOAT, false, 0, 0);
      if (uvs) {
        var ub = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ub);
        gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
        var uvLoc = gl.getAttribLocation(program.program, 'uv');
        if (uvLoc >= 0) {
          gl.enableVertexAttribArray(uvLoc);
          gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
        }
      }
      var ib = null;
      if (indices) {
        ib = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
      }
      gl.bindVertexArray(null);
      return { vao: vao, count: indices ? indices.length : 3 };
    }

    var quad = bufferGeometry(
      cardProgram,
      new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0]),
      3,
      new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
      new Uint16Array([0, 1, 2, 1, 3, 2])
    );
    var fullscreen = bufferGeometry(
      lensProgram,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      2,
      null,
      null
    );

    /* 离屏目标 */
    var target = { texture: gl.createTexture(), framebuffer: gl.createFramebuffer(), width: 2, height: 2 };
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    var width = 1;
    var height = 1;
    var dpr = 1;
    var slots = [];
    var pos = 0;
    var goal = 0;
    var vel = 0;
    var mode = 'spring';
    var raf = 0;
    var last = performance.now();
    var dirty = true;
    var alive = true;
    var activeIndex = -1;
    var deform = 0;
    var deformVel = 0;
    var intro = { t: 1, running: false, done: true };
    var wentLive = false;
    var liveCount = 0;
    function goLive() {
      if (wentLive || liveCount < 1) return;
      wentLive = true;
      global.requestAnimationFrame(function () {
        global.requestAnimationFrame(function () {
          // 先量好尺寸、把画面停在第 0 张的中心，并同步画出一帧，
          // 这样切到 canvas 的那一刻，底下的画面已经是最终裁剪，不会再有“另一版裁剪”闪一下。
          resize();
          var m0 = metrics();
          goal = snapPoint(m0, goal);
          pos = goal;
          vel = 0;
          mode = 'spring';
          resnap = false;
          try { draw(); } catch (err) {}
          container.classList.add('is-live');
          start();
        });
      });
    }
    var baseRadius = opts.radius === undefined ? 14 : opts.radius;
    var roundMix = 1;
    var radiusCss = '';
    var lastRadiusCss = '';
    var layout = null;
    var resnap = true;
    var pointer = { down: false, id: -1, startX: 0, startPos: 0, dragging: false, x: 0, y: 0, over: false, samples: [] };
    var reduced = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var titleEl = container.querySelector('[data-caption]');
    var countEl = container.querySelector('[data-count]');

    function loadSlot(item, index) {
      var slot = {
        item: item,
        index: index,
        texture: gl.createTexture(),
        image: [1, 1],
        aspect: 1,
        loaded: false,
        ready: 0,
        color: [0.5, 0.5, 0.5]
      };
      gl.bindTexture(gl.TEXTURE_2D, slot.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

      var image = new Image();
      image.decoding = 'async';
      image.onload = function () {
        if (!alive) return;
        gl.bindTexture(gl.TEXTURE_2D, slot.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, image); } catch (e) { console.warn('[P4TEX] ' + e.name + ': ' + e.message + ' key=' + srcKey + ' hasData=' + !!dataStore); container.removeAttribute('data-webgl'); container.classList.remove('is-live'); return; }
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        slot.image = [image.naturalWidth || 1, image.naturalHeight || 1];
        slot.aspect = slot.image[0] / slot.image[1];
        slot.loaded = true;
        try {
          var probe = document.createElement('canvas');
          probe.width = 8;
          probe.height = 8;
          var ctx = probe.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(image, 0, 0, 8, 8);
            var data = ctx.getImageData(0, 0, 8, 8).data;
            var avg = [0, 0, 0];
            for (var i = 0; i < data.length; i += 4) {
              avg[0] += data[i];
              avg[1] += data[i + 1];
              avg[2] += data[i + 2];
            }
            slot.color = avg.map(function (v) {
              return v / 64 / 255;
            });
          }
        } catch (error) {
          slot.color = [0.5, 0.5, 0.5];
        }
        dirty = true;
        start();
        liveCount += 1;
        goLive();
      };
      /* 优先用页面内联的 data:URI：file:// 下本地文件当纹理会被判跨域污染 */
      var srcAttr = item.src || '';
      var srcKey = srcAttr.split('?')[0].split('/').pop();
      var dataStore = global.__P4_FLOW_DATA || null;
      image.src = (dataStore && dataStore[srcKey]) ? dataStore[srcKey] : item.src;
      return slot;
    }

    function metrics() {
      var cardH = Math.max(24, (opts.cardHeight || 0.58) * height);
      var widths = slots.map(function (slot) {
        var aspect = opts.fit === 'portrait' ? 0.75 : opts.fit === 'square' ? 1 : slot.aspect;
        return aspect * cardH;
      });
      var gapValue = opts.gap === undefined || opts.gap === null ? 14 : Math.max(0, opts.gap);
      var centers = [];
      var cursor = 0;
      for (var i = 0; i < widths.length; i++) {
        centers.push(cursor + widths[i] / 2);
        cursor += widths[i] + gapValue;
      }
      return { cardH: cardH, widths: widths, centers: centers, gap: gapValue, loop: Math.max(cursor, 1) };
    }

    function nearest(m, at) {
      var best = 0;
      var bestDist = Infinity;
      for (var i = 0; i < m.centers.length; i++) {
        var dist = Math.abs(wrap(m.centers[i] - at, m.loop));
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      return best;
    }

    function snapPoint(m, at) {
      var i = nearest(m, at);
      return at + wrap(m.centers[i] - at, m.loop);
    }

    function remap(from, to, at) {
      var i = nearest(from, at);
      var offset = wrap(at - from.centers[i], from.loop);
      var cycles = Math.round((at - offset - from.centers[i]) / from.loop);
      return cycles * to.loop + to.centers[i] + (offset * to.widths[i]) / from.widths[i];
    }

    function step(m, delta) {
      var at = snapPoint(m, goal);
      var index = nearest(m, at);
      var n = m.centers.length;
      for (var k = 0; k < Math.abs(delta); k++) {
        var next = (index + (delta > 0 ? 1 : n - 1)) % n;
        var distance =
          delta > 0
            ? m.widths[index] / 2 + m.gap + m.widths[next] / 2
            : -(m.widths[next] / 2 + m.gap + m.widths[index] / 2);
        at += distance;
        index = next;
      }
      goal = at;
      mode = 'spring';
      dirty = true;
      start();
    }

    function goTo(m, index) {
      var i = ((index % m.centers.length) + m.centers.length) % m.centers.length;
      goal = goal + wrap(m.centers[i] - goal, m.loop);
      mode = 'spring';
      dirty = true;
      start();
    }

    function resize() {
      width = Math.max(1, stage.clientWidth);
      height = Math.max(1, stage.clientHeight);
      dpr = Math.min(global.devicePixelRatio || 1, 2, Math.sqrt(PIXEL_BUDGET / (width * height)));
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      var tw = Math.max(2, Math.round(width * dpr));
      var th = Math.max(2, Math.round(height * dpr));
      if (target.width !== tw || target.height !== th) {
        target.width = tw;
        target.height = th;
        gl.bindTexture(gl.TEXTURE_2D, target.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, tw, th, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      dirty = true;
      resnap = true;
      if (slots.length) { try { draw(); } catch (err) {} }
      start();
    }

    function introEffects() {
      var t = intro.running ? intro.t : intro.done ? 1 : 0;
      var e = { strength: 1, card: null };
      if (t >= 1) return e;
      e.strength = easeInOut((t - 0.3) / 0.65);
      e.card = function (rel) {
        var delay = Math.min(Math.abs(rel) / (width * 0.6), 1) * 0.34;
        var local = clamp01((t - delay) / 0.6);
        return {
          alpha: clamp01(local * 4),
          x: 0,
          y: (1 - easeOutQuint(local)) * height * 0.62,
          scale: 0.5 + 0.5 * easeInOut((local - 0.18) / 0.82)
        };
      };
      return e;
    }

    function draw() {
      var m = metrics();
      var n = slots.length;
      var effects = introEffects();
      var homeX = width / 2;
      var homeY = height / 2;
      var cardH = m.cardH;

      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      gl.viewport(0, 0, target.width, target.height);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(cardProgram.program);
      gl.bindVertexArray(quad.vao);
      setUniform(gl, cardProgram, 'uResolution', [width, height]);
      setUniform(gl, cardProgram, 'uDpr', dpr);
      setUniform(gl, cardProgram, 'tMap', 0);
      gl.activeTexture(gl.TEXTURE0);

      var draws = [];
      for (var i = 0; i < n; i++) {
        var baseRel = wrap(m.centers[i] - pos, m.loop);
        for (var k = -3; k <= 3; k++) {
          var rel = baseRel + k * m.loop;
          var w = m.widths[i];
          if (Math.abs(rel) - w / 2 > width + 40) continue;
          var fx = effects.card ? effects.card(rel) : null;
          var x = homeX + rel + (fx ? fx.x : 0);
          var scale = fx ? fx.scale : 1;
          var alpha = fx ? fx.alpha : 1;
          var cw = w * scale;
          if (alpha <= 0.001 || x + cw / 2 < -40 || x - cw / 2 > width + 40) continue;
          draws.push({ i: i, rel: rel, x: x, y: homeY + (fx ? fx.y : 0), cw: cw, ch: cardH * scale, alpha: alpha });
        }
      }
      draws.sort(function (a, b) {
        return Math.abs(b.rel) - Math.abs(a.rel);
      });

      for (var d = 0; d < draws.length; d++) {
        var draw = draws[d];
        var slot = slots[draw.i];
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, slot.texture);
        setUniform(gl, cardProgram, 'uRect', [draw.x, draw.y, draw.cw + 2, draw.ch + 2]);
        setUniform(gl, cardProgram, 'uSize', [draw.cw, draw.ch]);
        setUniform(gl, cardProgram, 'uRadius', 0);
        setUniform(gl, cardProgram, 'uImage', slot.image);
        setUniform(gl, cardProgram, 'uAlpha', draw.alpha);
        setUniform(gl, cardProgram, 'uReady', slot.ready);
        setUniform(gl, cardProgram, 'uShift', reduced ? 0 : Math.max(-1, Math.min(1, draw.rel / (width * 0.75))));
        setUniform(gl, cardProgram, 'uPlaceholder', slot.color);
        gl.drawElements(gl.TRIANGLES, quad.count, gl.UNSIGNED_SHORT, 0);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(lensProgram.program);
      gl.bindVertexArray(fullscreen.vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, target.texture);
      gl.generateMipmap(gl.TEXTURE_2D);
      setUniform(gl, lensProgram, 'tScene', 0);

      var halfW = (PRESET.lensWidth * width) / 2;
      var halfH = Math.min((PRESET.lensHeight * width) / 2, height * 0.5);
      var lensX = homeX;
      var lensY = homeY;
      var spanW = Math.max(halfW, 1);
      var spanH = Math.max(halfH, 1);
      var inner = Math.max(4, PRESET.reach * (spanW + spanH) * 0.5);
      setUniform(gl, lensProgram, 'uResolution', [width, height]);
      setUniform(gl, lensProgram, 'uDpr', dpr);
      setUniform(gl, lensProgram, 'uCenter', [lensX, lensY]);
      setUniform(gl, lensProgram, 'uHalf', [spanW, spanH]);
      setUniform(gl, lensProgram, 'uAngle', (PRESET.tilt * Math.PI) / 180);
      setUniform(gl, lensProgram, 'uExponent', 2 + Math.pow(1 - clamp01(PRESET.roundness), 1.5) * 10);
      setUniform(gl, lensProgram, 'uInner', inner);
      setUniform(gl, lensProgram, 'uOuter', inner * 1.6);
      setUniform(gl, lensProgram, 'uFlow', PRESET.bend * (spanW + spanH) * 0.45);
      setUniform(gl, lensProgram, 'uCurl', 0);
      setUniform(gl, lensProgram, 'uDispersion', PRESET.dispersion * 0.12 * (1 + Math.abs(deform) * 1.2));
      setUniform(gl, lensProgram, 'uStrength', effects.strength);
      setUniform(gl, lensProgram, 'uSceneAlpha', 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
    }

    function frame(now) {
      raf = 0;
      if (!alive) return;
      var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      var m = metrics();
      var n = slots.length;
      var animating = false;

      if (resnap) {
        goal = snapPoint(m, goal);
        pos = goal;
        vel = 0;
        resnap = false;
      } else if (layout && layout.loop !== m.loop) {
        pos = remap(layout, m, pos);
        goal = remap(layout, m, goal);
        pointer.startPos = pos + (pointer.x - pointer.startX);
        animating = true;
      }
      layout = m;

      if (!intro.done) {
        var settled = slots.every(function (slot) {
          return slot.loaded;
        });
        if (settled || now - startedAt > 2600) {
          intro.t = Math.min(1, intro.t + dt / INTRO_SECONDS);
          if (intro.t >= 1) {
            intro.running = false;
            intro.done = true;
          }
        }
        animating = true;
      }

      if (mode === 'wheel' && now - wheelAt > 150) {
        goal = snapPoint(m, goal);
        mode = 'spring';
      }

      if (!pointer.dragging) {
        var stiffness = mode === 'wheel' ? 80 : 55;
        var damping = 2 * Math.sqrt(stiffness);
        var steps = Math.ceil(dt / (1 / 240));
        var h = dt / steps;
        for (var i = 0; i < steps; i++) {
          var acc = stiffness * (goal - pos) - damping * vel;
          vel += acc * h;
          pos += vel * h;
        }
        if (Math.abs(goal - pos) < 0.05 && Math.abs(vel) < 0.5) {
          pos = goal;
          vel = 0;
        } else {
          animating = true;
        }
      } else {
        animating = true;
      }

      if (Math.abs(pos) > m.loop * 8) {
        var shift = Math.round(pos / m.loop) * m.loop;
        pos -= shift;
        goal -= shift;
        pointer.startPos -= shift;
      }

      var current = nearest(m, pos);
      if (current !== activeIndex) {
        activeIndex = current;
        if (titleEl) titleEl.textContent = slots[current].item.title || '';
        if (countEl) countEl.textContent = String(current + 1).padStart(2, '0');
      }

      for (var s = 0; s < n; s++) {
        if (slots[s].loaded && slots[s].ready < 1) {
          slots[s].ready = 1;
          animating = true;
        }
      }

      var movingNow = pointer.dragging || Math.abs(goal - pos) > 0.4 || Math.abs(vel) > 2;
      var targetRound = movingNow ? 0 : 1;
      if (targetRound === 0) {
        if (roundMix !== 0) {
          roundMix = 0;
          animating = true;
        }
      } else if (roundMix < 1) {
        roundMix = Math.min(1, roundMix + dt / 0.22);
        if (roundMix > 0.998) roundMix = 1;
        animating = true;
      }
      radiusCss = Math.round(baseRadius * roundMix * 100) / 100 + 'px';
      if (radiusCss !== lastRadiusCss) {
        lastRadiusCss = radiusCss;
        container.style.borderRadius = radiusCss;
      }
      var push = Math.max(-1, Math.min(1, vel / 2200));
      deformVel += (120 * (push - deform) - 2 * Math.sqrt(120) * 0.32 * deformVel) * dt;
      deform += deformVel * dt;
      if (Math.abs(deform) > 0.0005 || Math.abs(deformVel) > 0.005) animating = true;

      if (dirty || animating || pointer.dragging) {
        dirty = false;
        draw();
      }

      if (animating || pointer.down) raf = requestAnimationFrame(frame);
    }

    var startedAt = performance.now();
    var wheelAt = 0;

    function start() {
      if (raf || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function point(event) {
      var rect = container.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    }

    function onDown(event) {
      if (event.button !== undefined && event.button > 0) return;
      var p = point(event);
      pointer.down = true;
      pointer.id = event.pointerId;
      pointer.startX = p[0];
      pointer.x = p[0];
      pointer.y = p[1];
      pointer.startPos = pos;
      pointer.dragging = false;
      pointer.samples = [{ x: p[0], t: performance.now() }];
      if (Math.abs(vel) > 40) {
        goal = pos;
        vel = 0;
      }
      dirty = true;
      start();
    }

    function onMove(event) {
      var p = point(event);
      pointer.x = p[0];
      pointer.y = p[1];
      pointer.over = true;
      if (pointer.down && event.pointerId === pointer.id) {
        var dx = p[0] - pointer.startX;
        if (!pointer.dragging && Math.abs(dx) > 5) {
          pointer.dragging = true;
          pointer.startX = p[0];
          pointer.startPos = pos;
          container.setAttribute('data-dragging', '');
          try {
            container.setPointerCapture(event.pointerId);
          } catch (error) {}
        }
        if (pointer.dragging) {
          pos = pointer.startPos - (p[0] - pointer.startX);
          goal = pos;
          vel = 0;
          var now = performance.now();
          pointer.samples.push({ x: p[0], t: now });
          while (pointer.samples.length > 2 && now - pointer.samples[0].t > 100) pointer.samples.shift();
        }
      }
      start();
    }

    function onUp(event) {
      if (!pointer.down || event.pointerId !== pointer.id) return;
      pointer.down = false;
      container.removeAttribute('data-dragging');
      var m = metrics();
      if (pointer.dragging) {
        pointer.dragging = false;
        var now = performance.now();
        var first = pointer.samples[0];
        var lastSample = pointer.samples[pointer.samples.length - 1];
        var velocity = 0;
        if (first && lastSample && lastSample.t > first.t && now - lastSample.t < 70) {
          velocity = -((lastSample.x - first.x) / (lastSample.t - first.t)) * 1000;
        }
        vel = velocity;
        var landing = snapPoint(m, pos + velocity * 0.32);
        goal = landing;
        if (Math.abs(velocity) > 400 && Math.abs(landing - pos) < 1) step(m, velocity > 0 ? 1 : -1);
        mode = 'spring';
        start();
        return;
      }
      var p = point(event);
      var rel = p[0] - width / 2;
      goal = snapPoint(m, pos + rel);
      mode = 'spring';
      start();
    }

    function onCancel() {
      pointer.down = false;
      pointer.dragging = false;
      container.removeAttribute('data-dragging');
      goal = snapPoint(metrics(), pos);
      mode = 'spring';
      start();
    }

    function onWheel(event) {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      if (now2() - wheelAt < 140) return;
      wheelAt = now2();
      goal += Math.max(-120, Math.min(120, event.deltaX)) * 1.25;
      mode = 'wheel';
      start();
    }

    function now2() {
      return performance.now();
    }

    function onKey(event) {
      var m = metrics();
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        step(m, 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        step(m, -1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        goTo(m, 0);
      } else if (event.key === 'End') {
        event.preventDefault();
        goTo(m, slots.length - 1);
      }
    }

    function onLeave() {
      pointer.over = false;
    }

    container.addEventListener('pointerdown', onDown);
    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerup', onUp);
    container.addEventListener('pointercancel', onCancel);
    container.addEventListener('pointerleave', onLeave);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('keydown', onKey);

    var observer = null;
    if (global.ResizeObserver) {
      observer = new ResizeObserver(resize);
      observer.observe(stage);
    }
    global.addEventListener('resize', resize);

    slots = items.map(loadSlot);
    goLive();
    resize();
    start();

    return {
      resize: resize,
      redraw: function () { try { draw(); } catch (err) {} },
      destroy: function () {
        alive = false;
        if (raf) cancelAnimationFrame(raf);
        if (observer) observer.disconnect();
        global.removeEventListener('resize', resize);
        container.removeEventListener('pointerdown', onDown);
        container.removeEventListener('pointermove', onMove);
        container.removeEventListener('pointerup', onUp);
        container.removeEventListener('pointercancel', onCancel);
        container.removeEventListener('pointerleave', onLeave);
        container.removeEventListener('wheel', onWheel);
        container.removeEventListener('keydown', onKey);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }

  global.FlexCarousel = { mount: mount };
})(window);
