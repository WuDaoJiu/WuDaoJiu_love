/*!
 * pt-tear.js · 票根撕扯与掉落
 * 2026-10-23 / 移植自 tear-ticket 引擎：clip 几何 + 纸纤维 + 撕扯物理
 * 本版：票根在右、票面在左；尺寸跟随容器实时重建；轻点或拖拽都以「掉落」收尾
 */
(function (global) {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var GRAVITY = 2400;      /* px/s^2 */
  var RETRACT = 0.17;      /* 断口纤维回缩时长(s) */
  var RAD = Math.PI / 180;
  var STUB_RATIO = 0.4;    /* 票根宽度占比 */
  var FADE_MS = 430;       /* 撕后票面淡出时长（css 420ms）+ 一帧 */

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function f(n) { return n.toFixed(2); }
  function noise(seed) {
    var s = seed | 0;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ================= 几何：左票面 + 右票根、中间齿孔撕线 ================= */
  function buildGeometry(W, H, S, R, holes, hole, gap) {
    var main = W;
    var cross = H;
    var x = main - S;
    var hr = hole / 2;
    var n = Math.max(1, Math.round(holes));
    var span = cross - 2 * gap;
    var bridge = Math.max(3, (span - n * hole) / (n + 1));
    var pt = function (u, v) { return f(u) + ',' + f(v); };
    var arc = function (r, sweep, u, v) { return 'A' + f(r) + ',' + f(r) + ' 0 0 ' + sweep + ' ' + pt(u, v); };
    /* 撕线上的桥（孔与孔之间的实心段）。
       v34：不再加纤维抖动。抖动只有 ±1px，却让整条边看起来像被咬过，
       缩放后就是一排锯齿。现在所有桥都落在同一条竖线上：
       撕线 = 干净直线 + 等距圆孔。 */
    var bridges = [];
    for (var i = 0; i <= n; i += 1) {
      var y0 = gap + i * (bridge + hole);
      bridges.push({ y0: y0, y1: y0 + bridge, mid: y0 + bridge / 2, pts: [], x: x, y: y0 + bridge / 2 });
    }
    /* 票面：左两角圆角 R，右两角（撕线端）直角，中间一段齿孔。
       四个可见外角半径完全一致，都取同一个 R —— 之前上下两角用 R、
       撕线侧两角用 notch，所以四个角看起来圆得不一样。 */
    var body = 'M' + pt(R, 0) + 'L' + pt(x, 0);
    for (var b = 0; b < n; b += 1) {
      body += 'L' + pt(x, bridges[b].y1) + arc(hr, 0, x, bridges[b].y1 + hole);
    }
    body += 'L' + pt(x, bridges[n].y1) +
      'L' + pt(x, cross) +
      'L' + pt(R, cross) + arc(R, 1, 0, cross - R) +
      'L' + pt(0, R) + arc(R, 1, R, 0) + 'Z';
    /* 票根：右两角圆角 R，左两角（撕线端）直角，齿孔与票面逐一对齐。 */
    var stub = 'M' + pt(x, 0) +
      'L' + pt(main - R, 0) + arc(R, 1, main, R) +
      'L' + pt(main, cross - R) + arc(R, 1, main - R, cross) +
      'L' + pt(x, cross);
    for (var j = n; j >= 0; j -= 1) {
      stub += 'L' + pt(x, bridges[j].y0);
      if (j > 0) stub += arc(hr, 0, x, bridges[j - 1].y1);
    }
    stub += 'Z';
    var bodyOutline = 'M' + pt(R, 0) + 'L' + pt(x, 0) + 'L' + pt(x, cross) +
      'L' + pt(R, cross) + arc(R, 1, 0, cross - R) +
      'L' + pt(0, R) + arc(R, 1, R, 0) + 'Z';
    var stubOutline = 'M' + pt(x, 0) + 'L' + pt(main - R, 0) + arc(R, 1, main, R) +
      'L' + pt(main, cross - R) + arc(R, 1, main - R, cross) + 'L' + pt(x, cross) + 'Z';
    return {
      W: W, H: H, main: main, cross: cross, x: x, S: S,
      notch: gap, hole: hole, R: R,
      body: body, stub: stub, bridges: bridges,
      bodyOutline: bodyOutline, stubOutline: stubOutline,
      ends: [
        { x: x, y: gap, v: gap },
        { x: x, y: cross - gap, v: cross - gap }
      ]
    };
  }

  function create(root) {
    var plane = root.querySelector('[data-ticket-plane]');
    var bodyEl = root.querySelector('[data-ticket-body]');
    var stubEl = root.querySelector('[data-ticket-stub]');
    var face = root.querySelector('.pt-stub-face');
    var bodyPaper = root.querySelector('[data-body-paper]');
    var stubPaper = root.querySelector('[data-stub-paper]');
    var fibresEl = root.querySelector('[data-ticket-fibres]');
    var bodyOutline = root.querySelector('[data-body-outline]');
    var stubOutline = root.querySelector('[data-stub-outline]');
    if (!bodyEl || !stubEl || !face) return null;

    var reveal = root.closest ? root.closest('.p2-postcard-reveal') : null;
    var reduced = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

    var W = 0, H = 0, geo = null;
    var near = [], far = [];
    var used = false;
    var left = false;
    var STRETCH = 18;      /* 断桥阈值：按票面高度自适应 */
    var LIMIT = 38 * RAD;  /* 最大撕开角 */
    var GAIN = 1.55;       /* 指针角度 → 撕开角 的增益 */

    var sim = {
      raf: 0, last: 0, phase: 'idle', id: null, sign: 1,
      hinge: { x: 0, y: 0 }, hingeV: 0,
      grab: { x: 0, y: 0 }, start: { x: 0, y: 0 }, point: { x: 0, y: 0 },
      a0: 0, theta: 0, thetaV: 0, locked: 0,
      sx: 0, sy: 0, vx: 0, vy: 0, spin: 0,
      pvx: 0, pvy: 0, pt: 0, downAt: 0, moved: 0,
      fade: 1, age: 0, bx: 0, bv: 0,
      snapped: [], snapAt: [], span: []
    };

    /* ---------------- 尺寸自适应 ---------------- */
    function build() {
      if (sim.phase !== 'idle') return;
      var w = Math.round(root.clientWidth);
      var h = Math.round(root.clientHeight);
      if (!w || !h) return;
      var oldX = geo ? geo.x : -1;
      W = w; H = h;
      var S = Math.round(w * STUB_RATIO);
      /* 四个角统一一个半径（v34）：按票宽算，取到 0.5px 整数档，四角绝对一致。
         以前上下两角是 R(2~4.5)、撕线侧两角是 notch(2~4)，所以看起来圆得不一样。 */
      var radius = Math.round(clamp(w * 0.0072, 4, 7) * 2) / 2;
      var gap = clamp(h * 0.012, 3, 5);
      var hole = clamp(h * 0.017, 4, 7);
      var holes = clamp(Math.round(h / 25), 6, 16);

      root.style.setProperty('--tt-stub', S + 'px');
      root.style.setProperty('--tt-w', W + 'px');
      root.style.setProperty('--tt-h', H + 'px');

      geo = buildGeometry(W, H, S, radius, holes, hole, gap);
      root.style.setProperty('--pt-radius', radius + 'px');
      STRETCH = Math.max(11, Math.round(H * 0.13));

      /* 纸层不再用 clip-path: path() 裁剪。path() 里的坐标是绝对 px，
         不随票根缩放，窄屏时右侧纸会被裁到元素外，直接变成不存在。
         现在纸是矩形，齿孔位置用 --pt-body-w 按百分比给出，任何宽度都准。 */
      root.style.setProperty('--pt-body-w', ((geo.x / W) * 100).toFixed(3) + '%');
      /* 恢复票根的原始形状：齿孔与圆角直接写回纸层的 clip-path。
         两个纸层的坐标系与整张票 1:1（body 从 0,0 起；stub 现在铺满全宽），
         所以 path() 里的绝对 px 与元素尺寸完全对得上，缩放时由 build() 重算。
         孔处两层都被剪空，露出来的就是票后面的暗底 —— 真孔，不是画上去的。 */
      var setClip = function (el, d) {
        if (!el) return;
        var v = 'path("' + d + '")';
        el.style.webkitClipPath = v;
        el.style.clipPath = v;
      };
      setClip(bodyPaper, geo.body);
      setClip(stubPaper, geo.stub);
      /* 阴影已改为纯 CSS 渐变（.pt-cast），不再在 SVG 里做 mask + blur：
         那一套在 preserve-3d 子树里会渗出一圈矩形图层（白色半透明长方形）。 */
      if (bodyOutline) bodyOutline.setAttribute('d', geo.bodyOutline);
      if (stubOutline) stubOutline.setAttribute('d', geo.stubOutline);

      near = []; far = [];
      if (fibresEl) {
        fibresEl.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        while (fibresEl.firstChild) fibresEl.removeChild(fibresEl.firstChild);
        geo.bridges.forEach(function () {
          var g = document.createElementNS(SVGNS, 'g');
          var a = document.createElementNS(SVGNS, 'path');
          var b = document.createElementNS(SVGNS, 'path');
          a.style.opacity = '0';
          b.style.opacity = '0';
          g.appendChild(a);
          g.appendChild(b);
          fibresEl.appendChild(g);
          near.push(a);
          far.push(b);
        });
      }
      sim.snapped = [];
      sim.snapAt = [];
      sim.span = [];
      void oldX;
      paint(performance.now());
    }

    /* ---------------- 绘制 ---------------- */
    /* 撕开后才把影拆成两片：未撕时仍是一整片，接缝处不会出现断层。 */
    var peeling = false;
    function syncPeel() {
      var on = sim.theta > 0.02 || used;
      if (on === peeling) return;
      peeling = on;
      if (on) root.setAttribute('data-peeling', '');
      else root.removeAttribute('data-peeling');
    }
    function paint(now) {
      if (!geo) return false;
      stubEl.style.transform =
        'translate(' + sim.sx.toFixed(2) + 'px,' + sim.sy.toFixed(2) + 'px) rotate(' +
        ((sim.theta * sim.sign * 180) / Math.PI).toFixed(3) + 'deg)';
      stubEl.style.opacity = sim.fade.toFixed(3);
      bodyEl.style.transform = '';   /* 撕票时左侧照片/纸面完全不弹动 */
      syncPeel();

      var cos = Math.cos(sim.theta * sim.sign);
      var sin = Math.sin(sim.theta * sim.sign);
      var ly = 1.6;
      var busy = false;

      geo.bridges.forEach(function (b, i) {
        var dx = b.x - sim.hinge.x;
        var dy = b.y - sim.hinge.y;
        var tx = sim.hinge.x + dx * cos - dy * sin + sim.sx;
        var ty = sim.hinge.y + dx * sin + dy * cos + sim.sy;
        var ox = b.x;
        var oy = b.y;
        var gx = tx - ox;
        var gy = ty - oy;
        var gap = Math.hypot(gx, gy);
        var n = near[i];
        var fr = far[i];
        if (!n || !fr) return;
        var live = sim.phase !== 'idle' && sim.phase !== 'return' && !reduced;

        if (!sim.snapped[i]) {
          if (!live || gap < 0.8) {
            n.style.opacity = '0';
            fr.style.opacity = '0';
            return;
          }
          var k = clamp(gap / STRETCH, 0, 1);
          var sag = gap * 0.18;
          var w = (1.7 - 1.15 * k).toFixed(2);
          var cx = gx / 2;
          var cy = sag + gy / 2;
          n.setAttribute('d', 'M' + f(ox) + ',' + f(oy - ly) + 'Q' + f(ox + cx) + ',' + f(oy - ly + cy) + ' ' + f(tx) + ',' + f(ty - ly));
          fr.setAttribute('d', 'M' + f(ox) + ',' + f(oy + ly) + 'Q' + f(ox + gx - cx) + ',' + f(oy + ly + gy - cy) + ' ' + f(tx) + ',' + f(ty + ly));
          n.style.strokeWidth = w;
          fr.style.strokeWidth = w;
          n.style.opacity = '1';
          fr.style.opacity = '1';
          sim.span[i] = gap;
          return;
        }

        var t = (now - sim.snapAt[i]) / 1000 / RETRACT;
        if (!live || t >= 1 || !sim.snapAt[i]) {
          n.style.opacity = '0';
          fr.style.opacity = '0';
          return;
        }
        busy = true;
        var left = (1 - t) * (1 - t);
        var len = (sim.span[i] || 30) * 0.5 * left;
        var ux = gap > 0.01 ? gx / gap : 1;
        var uy = gap > 0.01 ? gy / gap : 0;
        n.setAttribute('d', 'M' + f(ox) + ',' + f(oy) + 'L' + f(ox + ux * len) + ',' + f(oy + uy * len));
        fr.setAttribute('d', 'M' + f(tx) + ',' + f(ty) + 'L' + f(tx - ux * len) + ',' + f(ty - uy * len));
        n.style.strokeWidth = '0.9';
        fr.style.strokeWidth = '0.9';
        n.style.opacity = left.toFixed(2);
        fr.style.opacity = left.toFixed(2);
      });

      return busy;
    }

    /* ---------------- 结束 ---------------- */
    /* 票根一撕开就翻页：不等掉落动画，不在页面二多停 */
    function leave() {
      if (left) return;
      left = true;
      if (typeof global.showPage === 'function') { global.showPage('page3'); return; }
      var nav = document.querySelector('.bottom-nav a[data-page="page3"]');
      if (nav) nav.click();
    }
    function finish() {
      if (root.getAttribute('data-used')) return;
      used = true;
      root.style.opacity = '';            /* 清掉入场保险写的 inline opacity，让 is-torn 的淡出生效 */
      face.setAttribute('aria-hidden', 'true');
      face.setAttribute('tabindex', '-1');
      root.setAttribute('data-used', '');
      if (reveal) {
        /* 先写内联 1，避免 is-torn 的 opacity:0 在下一帧抢先生效造成闪白/闪空 */
        root.style.setProperty('opacity', '1', 'important');
        reveal.classList.add('is-torn');
        syncPeel();
        global.setTimeout(function () { reveal.classList.remove('is-revealed'); }, 640);
      }
      /* 左票面淡出交给 JS 逐帧驱动：安卓 WebView 里带 clip-path 的子树跑 CSS
         alpha 过渡会被跳过或停在中间值，那样"消失"和"跳页"就对不上。
         这里手动一格一格降不透明度，降到 0 的那一帧同步翻页。 */
      fadeOutAndLeave();
    }
    /* 左边剩下的票面（含压暗层、说明文字）淡出，消失瞬间翻页 */
    function fadeOutAndLeave() {
      if (left) return;
      var dim = reveal ? reveal.querySelector('.pt-dim') : null;
      var caption = reveal ? reveal.querySelector('.pt-caption') : null;
      var targets = [root];
      if (dim) targets.push(dim);
      if (caption) targets.push(caption);
      var t0 = performance.now();
      function setAll(v) {
        for (var i = 0; i < targets.length; i++) {
          try { targets[i].style.setProperty('opacity', v, 'important'); } catch (e) {}
        }
      }
      function step() {
        var k = clamp((performance.now() - t0) / FADE_MS, 0, 1);
        /* 前 12% 不走，让"右边掉下去"先被看见；之后线性到 0 */
        var v = 1 - (k < 0.12 ? 0 : (k - 0.12) / 0.88);
        setAll(v.toFixed(3));
        if (k >= 1) {
          setAll('0');
          leave();               /* 完全看不见的这一帧切到页面三 */
          return;
        }
        global.requestAnimationFrame(step);
      }
      global.requestAnimationFrame(step);
    }

    /* ---------------- 物理 ---------------- */
    function step(now) {
      var dt = clamp((now - sim.last) / 1000, 0.001, 0.034);
      sim.last = now;
      var limit = LIMIT;

      if (sim.phase === 'held') {
        var count = geo.bridges.length;
        var intact = 0;
        for (var i = 0; i < count; i += 1) if (!sim.snapped[i]) intact += 1;
        var hold = count ? intact / count : 0;
        var follow = 0.92 * (1 - 0.3 * hold);
        var a = Math.atan2(sim.point.y - sim.hinge.y, sim.point.x - sim.hinge.x);
        var da = wrap(a - sim.a0);
        var mag = Math.abs(da);
        if (!sim.locked && mag > 0.045) { sim.locked = 1; sim.sign = da > 0 ? 1 : -1; }
        var want = clamp(mag * follow * GAIN, 0, limit + 0.1);
        sim.theta += (want - sim.theta) * (1 - Math.exp(-dt / 0.035));

        var away = clamp((sim.point.x - sim.start.x) * 0.14, -10, 20);
        var side = clamp((sim.point.y - sim.start.y) * 0.14, -8, 8);
        sim.sx += (away - sim.sx) * (1 - Math.exp(-dt / 0.05));
        sim.sy += (side - sim.sy) * (1 - Math.exp(-dt / 0.05));

        var pulled = Math.hypot(sim.point.x - sim.start.x, sim.point.y - sim.start.y) * 0.12;
        var slack = Math.max(Math.hypot(sim.sx, sim.sy), pulled);
        var left = 0;
        geo.bridges.forEach(function (b, idx) {
          if (sim.snapped[idx]) return;
          var d = Math.abs(b.mid - sim.hingeV);
          if (2 * d * Math.sin(sim.theta / 2) + slack > STRETCH) {
            sim.snapped[idx] = true;
            sim.snapAt[idx] = now;
            sim.bv -= 560 / count;
          } else {
            left += 1;
          }
        });
        /* 角度顶到头还没断完：从离铰链最远的那根开始，一帧一根崩下去 */
        if (left > 0 && sim.theta >= limit - 0.006) {
          var pick = -1, pickD = -1;
          geo.bridges.forEach(function (b, idx) {
            if (sim.snapped[idx]) return;
            var d2 = Math.abs(b.mid - sim.hingeV);
            if (d2 > pickD) { pickD = d2; pick = idx; }
          });
          if (pick >= 0) {
            sim.snapped[pick] = true;
            sim.snapAt[pick] = now;
            sim.bv -= 560 / count;
            left -= 1;
          }
        }
        if (left === 0) {
          sim.phase = 'free';
          sim.bv -= 150;
        }
      } else if (sim.phase === 'free') {
        var c2 = Math.cos(sim.theta * sim.sign);
        var s2 = Math.sin(sim.theta * sim.sign);
        var gx0 = sim.grab.x - sim.hinge.x;
        var gy0 = sim.grab.y - sim.hinge.y;
        var wx = sim.point.x - sim.hinge.x - (gx0 * c2 - gy0 * s2);
        var wy = sim.point.y - sim.hinge.y - (gx0 * s2 + gy0 * c2);
        sim.sx += (wx - sim.sx) * (1 - Math.exp(-dt / 0.085));
        sim.sy += (wy - sim.sy) * (1 - Math.exp(-dt / 0.085));
        var hang = limit * 0.55 + clamp(sim.pvx * 0.0009 * sim.sign, -0.3, 0.3);
        sim.theta += (hang - sim.theta) * (1 - Math.exp(-dt / 0.12));
      } else if (sim.phase === 'drop') {
        sim.age += dt;
        sim.vy += GRAVITY * dt;
        sim.sx += sim.vx * dt;
        sim.sy += sim.vy * dt;
        sim.theta += sim.spin * dt;
        sim.fade = 1;                       /* 掉落阶段不掉透明度，票根整张完整掉 */
        /* 第一步：撕下的那半张掉出屏幕（用起始 top + 位移算，避开旋转撑高包围盒的误差） */
        var vh = global.innerHeight || (document.documentElement && document.documentElement.clientHeight) || 0;
        var vw = global.innerWidth || (document.documentElement && document.documentElement.clientWidth) || 0;
        var gone = sim.age > 1;
        if (!gone && stubEl) {
          if (sim.baseTop == null) sim.baseTop = stubEl.getBoundingClientRect().top - sim.sy;
          var sr = stubEl.getBoundingClientRect();
          gone = !!vh && (sim.baseTop + sim.sy >= vh - 1 || sr.left >= vw - 1 || sr.right <= 1);
        }
        if (gone) {
          sim.phase = 'idle';
          finish();
        }
      } else if (sim.phase === 'return') {
        sim.thetaV += (-300 * sim.theta - 24 * sim.thetaV) * dt;
        sim.theta += sim.thetaV * dt;
        sim.sx += (0 - sim.sx) * (1 - Math.exp(-dt / 0.07));
        sim.sy += (0 - sim.sy) * (1 - Math.exp(-dt / 0.07));
        if (Math.abs(sim.theta) < 0.0008 && Math.abs(sim.thetaV) < 0.01 && Math.hypot(sim.sx, sim.sy) < 0.05) {
          sim.theta = 0;
          sim.thetaV = 0;
          sim.sx = 0;
          sim.sy = 0;
          sim.phase = 'idle';
        }
      }

      sim.bv += (-520 * sim.bx - 30 * sim.bv) * dt;
      sim.bx += sim.bv * dt;
      var busy = paint(now);
      var moving = Math.abs(sim.bx) > 0.02 || Math.abs(sim.bv) > 0.5 || sim.phase === 'return';
      if (sim.phase !== 'idle' || moving || busy) {
        sim.raf = global.requestAnimationFrame(step);
      } else {
        sim.bx = 0;
        sim.bv = 0;
        paint(now);
        sim.raf = 0;
      }
    }

    function run() {
      if (sim.raf) return;
      sim.last = performance.now();
      sim.raf = global.requestAnimationFrame(step);
    }

    /* ---------------- 坐标 ---------------- */
    function local(event) {
      var r = root.getBoundingClientRect();
      var k = r.width && W ? r.width / W : 1;
      return { x: (event.clientX - r.left) / k, y: (event.clientY - r.top) / k };
    }

    function tearNow() {
      if (used) return;
      global.cancelAnimationFrame(sim.raf);
      sim.raf = 0;
      sim.phase = 'idle';
      sim.fade = 1;
      sim.sx = 0;
      sim.sy = 0;
      paint(performance.now());
      finish();
    }

    /* 轻点：抖开一角，然后整张掉下去 */
    function peel() {
      if (used || sim.phase === 'drop') return;
      global.cancelAnimationFrame(sim.raf);
      sim.raf = 0;
      sim.phase = 'drop';
      sim.age = 0;
      sim.theta = 2 * RAD;
      sim.sx = 0;
      sim.sy = 0;
      sim.vx = 26;
      sim.vy = -14;
      sim.spin = 1.25;
      sim.fade = 1;
      stubEl.style.transformOrigin = geo.x + 'px ' + (geo.cross - 4) + 'px';
      run();
    }

    /* ---------------- 指针 ---------------- */
    function onDown(event) {
      if (used || sim.id !== null || sim.phase === 'drop') return;
      if (event.button !== undefined && event.button !== 0) return;
      try { face.setPointerCapture(event.pointerId); } catch (e) {}
      var p = local(event);
      sim.id = event.pointerId;
      sim.start = p;
      sim.point = p;
      sim.pt = performance.now();
      sim.downAt = sim.pt;
      sim.moved = 0;
      sim.pvx = 0;
      sim.pvy = 0;
      if (sim.theta < 0.01 && Math.hypot(sim.sx, sim.sy) < 1) {
        var atFar = p.y < geo.cross / 2;
        var end = geo.ends[atFar ? 1 : 0];
        sim.sign = 1;
        sim.locked = 0;
        sim.hinge = { x: end.x, y: end.y };
        sim.hingeV = end.v;
        stubEl.style.transformOrigin = sim.hinge.x + 'px ' + sim.hinge.y + 'px';
      }
      var cos = Math.cos(-sim.theta * sim.sign);
      var sin = Math.sin(-sim.theta * sim.sign);
      var ux = p.x - sim.sx - sim.hinge.x;
      var uy = p.y - sim.sy - sim.hinge.y;
      sim.grab = { x: sim.hinge.x + ux * cos - uy * sin, y: sim.hinge.y + ux * sin + uy * cos };
      sim.a0 = Math.atan2(sim.grab.y - sim.hinge.y, sim.grab.x - sim.hinge.x) - (sim.theta * sim.sign) / (0.92 * GAIN);
      sim.phase = 'held';
      root.setAttribute('data-grabbing', '');
      run();
    }

    function onMove(event) {
      if (sim.id !== event.pointerId) return;
      var p = local(event);
      var now = performance.now();
      var dt = Math.max(0.004, (now - sim.pt) / 1000);
      sim.moved += Math.hypot(p.x - sim.point.x, p.y - sim.point.y);
      sim.pvx += ((p.x - sim.point.x) / dt - sim.pvx) * 0.35;
      sim.pvy += ((p.y - sim.point.y) / dt - sim.pvy) * 0.35;
      sim.pt = now;
      sim.point = p;
      if (event.cancelable) event.preventDefault();
      if (reduced && Math.hypot(p.x - sim.start.x, p.y - sim.start.y) > 24) {
        sim.id = null;
        root.removeAttribute('data-grabbing');
        tearNow();
      }
    }

    function onUp(event) {
      if (sim.id !== event.pointerId) return;
      sim.id = null;
      try {
        if (face.hasPointerCapture(event.pointerId)) face.releasePointerCapture(event.pointerId);
      } catch (e) {}
      root.removeAttribute('data-grabbing');

      var tapped = sim.phase === 'held' && sim.moved < 9 && performance.now() - sim.downAt < 520;
      if (tapped) {
        sim.phase = 'idle';
        peel();
        return;
      }

      if (sim.phase === 'free') {
        var still = performance.now() - sim.pt > 80;
        sim.vx = still ? 0 : clamp(sim.pvx * 0.55, -620, 620);
        sim.vy = still ? 0 : clamp(sim.pvy * 0.5, -520, 620);
        sim.spin = clamp(Math.abs(sim.vx) * 0.003, 0, 4) + 1.5;
        sim.age = 0;
        sim.fade = 1;
        sim.phase = 'drop';
      } else if (sim.phase === 'held') {
        var snappedCount = 0;
        for (var i = 0; i < geo.bridges.length; i += 1) if (sim.snapped[i]) snappedCount += 1;
        if (snappedCount >= geo.bridges.length * 0.55) {
          sim.vx = clamp(sim.pvx * 0.55, -620, 620);
          sim.vy = clamp(sim.pvy * 0.5, -520, 620);
          sim.spin = clamp(Math.abs(sim.vx) * 0.003, 0, 4) + 1.5;
          sim.age = 0;
          sim.fade = 1;
          sim.phase = 'drop';
        } else {
          sim.phase = 'return';
        }
      }
      run();
    }

    function onKey(event) {
      if (used || (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar')) return;
      event.preventDefault();
      if (!event.repeat) tearNow();
    }

    face.addEventListener('pointerdown', onDown);
    face.addEventListener('pointermove', onMove);
    face.addEventListener('pointerup', onUp);
    face.addEventListener('pointercancel', onUp);
    face.addEventListener('lostpointercapture', onUp);
    face.addEventListener('keydown', onKey);
    face.addEventListener('dragstart', function (event) { event.preventDefault(); });

    var resizeTimer = 0;
    function onResize() {
      global.clearTimeout(resizeTimer);
      resizeTimer = global.setTimeout(build, 120);
    }
    global.addEventListener('resize', onResize);
    global.addEventListener('orientationchange', onResize);
    if (global.ResizeObserver) {
      var ro = new ResizeObserver(function () { if (sim.phase === 'idle') build(); });
      ro.observe(root);
    }

    build();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { build(); }, function () {});
    }

    return {
      tear: tearNow,
      reset: function () {
        used = false;
        left = false;
        root.removeAttribute('data-used');
        root.removeAttribute('data-peeling');
        peeling = false;
        stubEl.style.visibility = '';
        stubEl.style.opacity = '1';
        sim.phase = 'idle';
        sim.theta = 0;
        sim.thetaV = 0;
        sim.sx = 0;
        sim.sy = 0;
        sim.bx = 0;
        sim.bv = 0;
        sim.fade = 1;
        sim.snapped = [];
        sim.snapAt = [];
        sim.span = [];
        sim.baseTop = null;
        /* 票据回到「还没下滑」的隐藏态：下滑到页面二底部才再次出现 */
        if (typeof global.__p2TicketArm === 'function') global.__p2TicketArm();
        else if (reveal) reveal.classList.remove('is-torn', 'is-revealed');
        /* 撕票淡出是 JS 写的内联 !important，复位要把它们整条删掉 */
        root.style.removeProperty('opacity');
        if (reveal) {
          var d0 = reveal.querySelector('.pt-dim'), c0 = reveal.querySelector('.pt-caption');
          if (d0) d0.style.removeProperty('opacity');
          if (c0) c0.style.removeProperty('opacity');
        }
        paint(performance.now());
      },
      /* 保险：未撕状态下强制恢复不透明，杜绝 WebView 合成层残留半透明 */
      ensureSolid: function () {
        if (used || sim.phase !== 'idle') return;
        sim.fade = 1;
        stubEl.style.opacity = '1';
        stubEl.style.visibility = '';
        root.style.opacity = '1';
        paint(performance.now());
      },
      isTorn: function () { return used; },
      debug: function () { return { sim: sim, geo: geo }; },
      rect: function () { return { w: W, h: H, stub: geo ? geo.S : 0, lineX: geo ? geo.x : 0 }; }
    };
  }

  function boot() {
    var root = document.getElementById('p2PostcardTicket');
    if (!root || root.getAttribute('data-pt-ready')) return;
    var instance = create(root);
    if (!instance) return;
    root.setAttribute('data-pt-ready', '1');
    global.__ptTicket = instance;
    /* 回到页面二就复位：票根重新长出来，可以再撕一次 */
    var page2 = document.getElementById('page2');
    if (page2 && global.MutationObserver) {
      var wasVisible = page2.classList.contains('is-visible');
      new MutationObserver(function () {
        var visible = page2.classList.contains('is-visible');
        if (visible && !wasVisible && instance.isTorn()) instance.reset();
        wasVisible = visible;
      }).observe(page2, { attributes: true, attributeFilter: ['class'] });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
