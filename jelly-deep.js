/* ============================================================
   jelly-deep.js  ·  页面二 · 深海 ASCII 水母背景
   版本：20261022_JELLY_V48b（白纸浅蓝 · ASCII 密度水母 · 小格大伞 · 呼吸推进滑行）
   ------------------------------------------------------------
   画布只铺页面二的深蓝区（到 .page2-blue-extension 上沿为止）。
   呼吸是物理模拟：快速收缩（伞体变窄变高、颜色压暗）→ 慢速舒张
   （变宽变扁），收缩时喷水给一个推力，然后靠水阻惯性滑行减速。
   配色：伞体半透明蓝，伞缘褶边淡青白，中下部一条暖金光带（收缩时
   变亮），口腕蓝紫，细触手淡蓝、约三分之一带暖粉，伞内随机闪白点。
   ============================================================ */
(function () {
  'use strict';
  var page = document.getElementById('page2');
  if (!page) return;
  var host = document.getElementById('p2JellyLayer');
  var canvas = document.getElementById('p2Jelly');
  if (!host || !canvas) return;
  var ctx = canvas.getContext('2d', { alpha: false });
  /* [v49d] 原来这里写 canvas.style.background='#ffffff'（内联纯白）。
     滚动时 WebView 一旦丢一帧画布纹理，露出来的就是这块刺眼纯白 —— 就是那个闪白。
     现在不用内联白，让 style.css 里的同色系浅蓝渐变幕底生效，
     即使丢帧也只是看到渐变色，不再刷一片白。 */
  if (!ctx) return;
  /* [v49c] 导航栏镜像：把被顶栏盖住的那一条水母拷贝过去，靠 CSS blur 变模糊。
     每帧只 drawImage 一张 390×53 的小图（一次纯 GPU 拷贝），不做像素回读。 */
  var frostCanvas = document.getElementById('p2TopFrost');
  var frostCtx = frostCanvas ? frostCanvas.getContext('2d') : null;
  var topbar = page.querySelector('.p2-topbar');
  var frostW = 0, frostH = 0;
  var blueExt = page.querySelector('.page2-blue-extension');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CELL = 7;
  var W = 0, H = 0, cols = 0, rows = 0, dpr = 1;
  var dens = null, ccol = null, rnd = null, hz = null, curHaze = 0, curFade = 1;
  var jellies = [], stars = [], sparks = [];
  var time = 0, ready = false;

  /* ---------- 颜色号 ---------- */
  var K_BELL = 1, K_BELLP = 2, K_RIM = 3, K_GOLD = 4, K_ORAL = 5, K_TENT = 6, K_PINK = 7, K_STAR = 8, K_BELLD = 9;
  var K_GLOW = 10, K_SPARK = 11, K_HALO = 12;   /* 暖金光带 / 白色闪点 / 闪点余光 */
  var RGBS = [];
  RGBS[K_BELL] = 'rgb(44,106,198)';     /* 伞体上：中蓝 */
  RGBS[K_BELLP] = 'rgb(118,120,222)';   /* 伞体中：淡蓝紫（提亮，不能压成一块实色） */
  RGBS[K_BELLD] = 'rgb(38,72,166)';      /* 伞体下：深蓝 */
  RGBS[K_RIM] = 'rgb(104,158,232)';      /* 边缘：青蓝 */
  RGBS[K_GOLD] = 'rgb(152,196,244)';    /* 伞顶受光带：更浅的蓝 */
  RGBS[K_ORAL] = 'rgb(130,118,220)';

  RGBS[K_TENT] = 'rgb(74,140,214)';
  RGBS[K_PINK] = 'rgb(210,98,156)';
  RGBS[K_STAR] = 'rgb(238,248,255)';   /* 伞内亮点：接近白 */
  RGBS[K_GLOW] = 'rgb(255,244,206)';       /* 金光带里的字符：暖白，压在金色块上才像发光 */
  RGBS[K_SPARK] = 'rgb(0,110,255)';     /* 闪点：高饱和蓝，白纸上白字看不见 */
  RGBS[K_HALO] = 'rgb(0,178,255)';      /* 闪点余光：高饱和亮蓝 */

  /* ---------- 预计算颜色串（避免每帧拼字符串 → 手机 GC 压力） ---------- */
  /* 背景方块色：按 kind × alpha档(0..7) 预生成 72 个字符串 */
  var BG_BASE = [];
  BG_BASE[K_BELL]  = '150,200,248';
  BG_BASE[K_BELLP] = '170,172,248';
  BG_BASE[K_RIM]   = '160,206,250';
  BG_BASE[K_GOLD]  = '206,228,250';
  BG_BASE[K_ORAL]  = '186,178,246';
  BG_BASE[K_TENT]  = '168,204,248';
  BG_BASE[K_PINK]  = '252,208,230';
  BG_BASE[K_STAR]  = '180,200,246';
  BG_BASE[K_BELLD] = '156,180,244';
  BG_BASE[K_GLOW] = '253,229,166';   /* 金光带的底色块：暖金 */
  BG_BASE[K_SPARK] = '72,122,192';
  BG_BASE[K_HALO] = '228,240,252';
  var ALPHA_STEPS = 8;
  var BG_STR = [];      /* [kind][aStep] */
  for (var _k = 1; _k <= 12; _k++) {
    var _base = BG_BASE[_k] || '190,214,244';
    var _arr = [];
    for (var _a = 0; _a < ALPHA_STEPS; _a++) {
      /* 底色块整体压淡，白纸能从字缝里透出来；金光带例外，它要亮 */
      var _v = (_k === K_GLOW) ? (0.30 + 0.32 * (_a / (ALPHA_STEPS - 1))) : (0.10 + 0.26 * (_a / (ALPHA_STEPS - 1)));
      _arr.push('rgba(' + _base + ',' + _v.toFixed(2) + ')');
    }
    BG_STR[_k] = _arr;
  }
  /* 字符透明度也量化，用 globalAlpha 赋值即可（数值运算，不拼串） */
  var TIERS = [
    { min: 0.045, chars: '.:0;', w: 0.52 },
    { min: 0.15, chars: 'o:t;x', w: 0.68 },
    { min: 0.29, chars: 'tXxS%', w: 0.84 },
    { min: 0.48, chars: 'SX8%@', w: 0.96 },
    { min: 0.68, chars: '#@8%X', w: 1.00 }
  ];
  /* ---------- 密度 / 颜色写入 ---------- */
  function addAt(gx, gy, w, kind) {
    if (w <= 0 || gx < 0 || gy < 0 || gx >= cols || gy >= rows) return;
    if (curFade < 1) w *= curFade;   /* 入场渐显 */
    var i = gy * cols + gx;
    if (curHaze > hz[i]) hz[i] = curHaze;
    if (w > dens[i]) {
      dens[i] = w > 1 ? 1 : w;
      if (kind) ccol[i] = kind;
    }
  }
  function addSoft(x, y, w, soft, kind) {
    if (curFade < 1) { w *= curFade; if (w <= 0.001) return; }
    if (w <= 0) return;
    var gx = (x / CELL) | 0, gy = (y / CELL) | 0;
    addAt(gx, gy, w, kind);
    if (soft > 0.02) {
      var s = w * soft;
      addAt(gx - 1, gy, s * 0.55, kind); addAt(gx + 1, gy, s * 0.55, kind);
      addAt(gx, gy - 1, s * 0.55, kind); addAt(gx, gy + 1, s * 0.55, kind);
      addAt(gx - 1, gy - 1, s * 0.3, kind); addAt(gx + 1, gy + 1, s * 0.3, kind);
      addAt(gx + 1, gy - 1, s * 0.3, kind); addAt(gx - 1, gy + 1, s * 0.3, kind);
    }
  }

  /* ---------- 造水母 ---------- */
  function mkJelly(nx, ny, nr, alpha, tone) {
    var j = {
      x: W * nx, y: H * ny,
      r: Math.min(W, H * 0.92) * nr,
      alpha: alpha,
      tone: tone || 0,
      vx: 9, vy: -10,
      s: Math.random(),          /* 收缩程度 0=舒张 1=收缩 */
      phase: 1,                  /* 1=收缩中 0=舒张中 */
      dc: 0.95 + Math.random() * 0.30,
      dr: 1.50 + Math.random() * 0.60,
      flat: 0.86 + Math.random() * 0.28,
      ang: 0.78 + (Math.random() * 2 - 1) * 0.12,  /* 朝右上方斜游（约45度） */
      ph: Math.random() * 6.283,
      ph2: Math.random() * 6.283,
      haze: 0,
      lane: 0,                   /* 0=常规斜游  1=贴着右边缘擦过去 */
      laneX: 0,                  /* lane=1 时钉住的那条边线 x */
      tents: [], arms: [], sparksArr: []
    };
    var i;
    for (i = 0; i < 5; i++) {
      var u = i / 4;
      j.tents.push({
        ox: -0.42 + 0.84 * u + (Math.random() - 0.5) * 0.10,
        seg: 1.4 + Math.random() * 1.0,
        amp: 0.06 + Math.random() * 0.09,
        len: 1.45 + Math.random() * 2.35,
        ph: Math.random() * 6.283,
        sp: 0.30 + Math.random() * 0.30,
        w: 0.11 + Math.random() * 0.05,
        pink: i % 3 === 1
      });
    }
    for (i = 0; i < 3; i++) {
      j.arms.push({
        ox: -0.18 + 0.18 * i,
        amp: 0.05 + Math.random() * 0.05,
        len: 1.30 + Math.random() * 0.45,
        ph: Math.random() * 6.283,
        sp: 0.45 + Math.random() * 0.30,
        w: 0.20 + Math.random() * 0.06
      });
    }
    for (i = 0; i < 26; i++) {
      j.sparksArr.push({
        ox: (Math.random() * 2 - 1) * 0.80,
        oy: (Math.random() * 1.8 - 1.0) * 0.62,
        ph: Math.random() * 6.283,
        sp: 1.3 + Math.random() * 2.0,
        ch: Math.random() < 0.5 ? '*' : '+'
      });
    }
    return j;
  }
  function seedJellies() {
    function mk(nx, ny, nr, a, tone, band, track, lane) {
      var j = mkJelly(nx, ny, nr, a, tone);
      j.x += (Math.random() - 0.5) * W * 0.04;
      j.y += (Math.random() - 0.5) * H * 0.04;
      j.band = band | 0;
      j.track = track | 0;
      j.lane = lane | 0;
      /* 方向固定：左下 → 右上，整段斜线，不做水平平移 */
      j.ang = 0.30 + (j.band % 2) * 0.10 + Math.random() * 0.04;
      j.homeY = j.y;
      return j;
    }
    /* 4 只，大小差开：一大、一中、一中偏小、一只极小只擦边露角。
       位置压在四个角上，中间让出来，虚化区正好是空的。 */
    jellies = [
      /* 大小交替：大 → 小 → 中 → 极小，相邻两只尺寸差拉开，眼睛才有节奏 */
      /* 大：左上，伞顶常常探出上边界，只露下半身和触手 */
      mk(0.22, 0.075, 0.335, 0.97, 0, 0, 0, 0),
      /* 小：右上偏中，贴着右边界慢慢游 */
      mk(0.80, 0.235, 0.155, 0.92, 1, 1, 0, 0),
      /* 中：左下 */
      mk(0.14, 0.615, 0.245, 0.95, 0, 2, 0, 0),
      /* 极小：贴右边缘往上浮，只露一角 */
      mk(0.92, 0.885, 0.130, 0.84, 1, 3, 1, 1)
    ];
    /* 擦边那只一开始就钉在右边界外一点点，免得开场先在屏中间冒出来 */
    var JL = jellies[3];
    JL.laneX = W + JL.r * 0.22;
    JL.x = JL.laneX;
    JL.y = H * 0.72;
  }
  function seedStars() {
    stars = [];
    var n = Math.round(Math.min(190, Math.max(70, W * 0.45)));
    for (var i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * (H + 60),
        r: 0.7 + Math.random() * 1.1,
        ph: Math.random() * 6.283,
        sp: 0.5 + Math.random() * 1.7,
        ch: Math.random() < 0.32 ? '*' : '.',
        a0: 0.30 + Math.random() * 0.55,
        up: 2.5 + Math.random() * 6.5
      });
    }
  }

  /* ---------- 尺寸 ---------- */
  function measure() {
    var w = page.clientWidth;
    /* [v49a] 画布高度：从天蓝延伸区的上沿延长到它的底部。
       旧值是 blueExt.offsetTop，正好卡在天蓝区上沿 → 整个天蓝区都是纯 CSS 色块。 */
    var h;
    if (blueExt) {
      /* 一直铺到天蓝区最底部（不自行截断，避免和 CSS 渐变之间出现色差缝）。
         “底下留一截”由 .page2-blue-extension 自己的渐变负责：
         它底部 78%~100% 是不透明天蓝，自然把画布盖住。 */
      h = blueExt.offsetTop + blueExt.offsetHeight;
    } else {
      h = page.clientHeight;
    }
    if (!w || !h || h < 120) return false;
    if (ready && w === W && h === H) return true;
    W = w; H = h;
    /* [v49e] 上限从 2 降到 1.5：2x 的 780x1814 画布纹理是 5.4MB，
       安卓 WebView 滚动时重传这块大纹理很容易掉帧。
       1.5x 对 ASCII 点阵画质几乎无损（本来就是 7px 网格）。 */
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    /* [v49a] 把精确像素高同步给遮罩层，两边不可能再错开几 px 露白 */
    host.style.setProperty('--p2-jelly-h', H + 'px');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* [v49e] 治第一次进页面二短暂黑屏：alpha:false 画布改尺寸即被清成不透明黑，
       而第一帧 render 未跑，切过来会先看到一块黑。这里立刻先铺同系渐变。 */
    paintBaseNow();
    ctx.font = '700 ' + (CELL * 1.05).toFixed(1) + 'px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
    cols = Math.ceil(W / CELL);
    rows = Math.ceil(H / CELL);
    dens = new Float32Array(cols * rows);
    hz = new Float32Array(cols * rows);
    ccol = new Uint8Array(cols * rows);
    rnd = new Float32Array(cols * rows);
    for (var i = 0; i < rnd.length; i++) rnd[i] = Math.random();
    seedJellies();
    seedStars();
    ready = true;
    return true;
  }

  /* ---------- 物理：收缩喷水 → 舒张滑行 ---------- */
  function respawn(j) {
    /* 从左侧、按自己那条纵向带进场，然后一路斜向右上。
       track=1 的起步再往左挪一段，同带两只不会追尾叠在一起。 */
    var band = typeof j.band === 'number' ? j.band : 0;
    var sp0;
    if (j.lane === 1) {
      /* 擦边的那只：贴着右边界往上浮，伞一大半在屏幕外，只露左边一角 */
      j.laneX = W + j.r * (0.16 + Math.random() * 0.14);
      j.x = j.laneX;
      j.y = H + j.r * (1.55 + Math.random() * 0.5);
      j.ang = 1.5708;
      sp0 = 10 + Math.random() * 4;
    } else {
      j.x = -j.r * 1.45 - (j.track ? W * (0.10 + Math.random() * 0.08) : 0);
      j.y = H * ((band + 0.5) / 4 + (Math.random() - 0.5) * 0.09);
      j.ang = 0.30 + (band % 2) * 0.10 + Math.random() * 0.04;
      sp0 = 12 + Math.random() * 6;
    }
    j.enterT = 0;                       /* 入场计时：透明度从0长起来，不闪一下蹦出来 */
    j.enterDur = 0.9 + Math.random() * 0.5;
    j.vx = Math.cos(j.ang) * sp0;
    j.vy = -Math.sin(j.ang) * sp0;
    j.s = Math.random() * 0.6;
    j.phase = 1;
    j.dc = 0.95 + Math.random() * 0.30;
    j.dr = 1.50 + Math.random() * 0.60;
    j.homeY = Math.min(H - j.r * 0.55, Math.max(j.r * 1.05, j.y));
  }
  function stepJelly(j, dt, t) {
    var ca = Math.cos(j.ang), sa = Math.sin(j.ang);
    if (j.phase === 1) {
      j.s += dt / j.dc;
      if (j.s >= 1) { j.s = 1; j.phase = 0; }
      /* 喷水沿身体朝向：斜着窜出去 */
      var push = 260 * dt;
      j.vx += ca * push;
      j.vy -= sa * push;
    } else {
      j.s -= dt / j.dr;
      if (j.s <= 0) {
        j.s = 0; j.phase = 1;
        j.dc = 0.95 + Math.random() * 0.30;
        j.dr = 1.50 + Math.random() * 0.60;
      }
    }
    var damp = Math.exp(-dt * 0.40);
    j.vx *= damp;
    j.vy *= damp;
    /* 水流摆动，但大方向始终是右上 */
    j.vx += Math.sin(t * 0.34 + j.ph) * 2.0 * dt;
    j.vy += Math.cos(t * 0.29 + j.ph2) * 1.6 * dt;
    /* 缓慢把速度拉回朝向 */
    var sp = Math.sqrt(j.vx * j.vx + j.vy * j.vy) || 1;
    j.vx += (ca * sp - j.vx) * 0.55 * dt;
    j.vy += (-sa * sp - j.vy) * 0.55 * dt;
    sp = Math.sqrt(j.vx * j.vx + j.vy * j.vy);
    var max = 26;
    if (sp > max) { j.vx *= max / sp; j.vy *= max / sp; }
    j.ss = j.s * j.s * (3 - 2 * j.s);
    if (j.enterT !== undefined && j.enterT < j.enterDur) j.enterT += dt;
    j.x += j.vx * dt;
    j.y += j.vy * dt;
    if (j.lane === 1) {
      /* 擦边的那只：贴住右边界往上浮，不往右漂走 */
      j.vx *= 0.12;
      j.x += (j.laneX - j.x) * Math.min(1, dt * 0.8);
    }
    /* 伞完全游出去（连触手）才回收，见下面的边界判断。 */
    /* 等整只（包括拖在后面的触手）完全离开画布才回收。
       以前是伞尖刚碰到边线就 respawn，看起来就是"头一碰边整只消失"。 */
    if (j.x - j.r * 1.40 > W) respawn(j);
    else if (j.y + j.r * 1.95 < 0) respawn(j);
    else if (j.y - j.r * 1.35 > H) respawn(j);
    /* 游到中央光晕后面 -> 虚化 */
    var gx = W * 0.5, gy = H * 0.42;
    var gr = W * 0.40;
    var dx = j.x - gx, dy = (j.y - gy) * 0.9;
    var d = Math.sqrt(dx * dx + dy * dy) / gr;
    j.haze = d >= 1 ? 0 : (1 - d);
  }
  /* 边缘渐显：水母越靠近屏幕边，整体越淡。这样进出场是一寸寸透出来，
     而不是伞一碰到边线就凭空冒出一个头。
     屏中心 = 1，伞心正好在边界 = 0.5，伞心在屏外 1.15r = 0。 */
  function edgeFadeOf(j) {
    var em = j.r * 1.15;
    var fx = 1, fy = 1;
    if (j.x < 0) fx = 1 + j.x / em; else if (j.x > W) fx = 1 - (j.x - W) / em;
    if (j.y < 0) fy = 1 + j.y / em; else if (j.y > H) fy = 1 - (j.y - H) / em;
    var ef = fx < fy ? fx : fy;
    if (ef < 0) ef = 0; if (ef > 1) ef = 1;
    return ef * ef * (3 - 2 * ef);
  }
  /* ---------- 画水母（写入密度/颜色网格） ---------- */
  function paintJelly(j, t) {
    curHaze = j.haze;
    var _entF = 1;
    if (j.enterT !== undefined && j.enterT < j.enterDur) {
      var ep = j.enterT / j.enterDur;
      _entF = ep * ep * (3 - 2 * ep);
    }
    curFade = _entF * edgeFadeOf(j);
    var s = (j.ss === undefined) ? j.s : j.ss;   /* 呼吸走 smoothstep，两头不急停，才不会一夹一夹 */
    /* 伞盖是半球壳：宽 : 高 约 2 : 1，收缩时变窄变高，舒张时变宽变扁 */
    var rx = j.r * 1.02 * (1 - 0.17 * s);
    var ry = j.r * 0.74 * (1 + 0.30 * s) * (j.flat || 1);
    var cx = j.x, cy = j.y;
    var a = j.alpha * (1 - 0.15 * j.haze);
    var soft = j.haze > 0.50 ? j.haze : 0;
    var trailX = -j.vx * 0.09;
    var trailY = -j.vy * 0.03;
    /* topL..botL 是伞壳（从伞顶到伞缘），伞壳以下留空，只有口腕和触手垂下来 */
    var topL = -ry * 0.95, botL = ry * 0.35;
    /* 身体朝右上倾：局部 -y 就是伞顶朝向 */
    var th = (Math.PI * 0.5 - j.ang) * 0.30 + (s - 0.5) * 0.14;   /* 呼吸时伞体跟着点头，倾角随笔一摆 */
    var cs = Math.cos(th), sn = Math.sin(th);

    function halfWidth(u, lx) {
      var hw;
      /* 半球壳：顶部圆拱往下张开，伞缘外翻成荷叶边（波浪褶） */
      if (u < 0.60) {
        var t = u / 0.60;
        /* 原来顶部是 0.44 宽的平头，伞顶像被压平的一块饼；改成圆拱 */
        hw = 0.035 + 0.965 * Math.pow(Math.sin(t * 1.5708), 0.42);
      } else {
        var t3 = (u - 0.60) / 0.40;
        var tooth = Math.abs(Math.sin(((lx || 0) / (rx * 0.90)) * 4.6 + j.ph * 1.7));
        hw = 1.0 + (0.02 + 0.07 * tooth) * t3 * t3;
      }
      hw *= 1 + 0.012 * Math.sin(u * 3.2 + j.ph);
      return rx * Math.max(hw, 0.03);
    }
    /* 一条须的波浪：沿长度积攒方向角，形成真正的行波（相位随长度往前走），
       越往尾端摆幅越大；收缩时整条被甩直一点，舒张时软下来。 */
    function strand(bx, by0, len, seg, amp, sp, ph, w0, kind, softAmt, t, s, fan) {
      fan = fan || 0;
      var steps = Math.max(6, Math.round(len / (CELL * 0.72)));
      var ds = len / steps;
      var ph0 = t * sp + ph;
      var ampE = amp * (0.90 + 0.50 * s);   /* 收缩时更弯＝蜷起来，舒张时松下去 */
      var px = bx, py = by0;
      for (var i = 0; i <= steps; i++) {
        var p = i / steps;
        var w1 = Math.sin(p * seg * 3.2 - ph0 * 1.7) * (0.30 + 0.70 * p);
        var w2 = Math.sin(p * seg * 5.6 - ph0 * 2.6 + ph * 1.7) * (0.08 + 0.34 * p);
        var ang = (w1 * 1.18 + w2 * 0.30) * ampE;   /* 0 弧度 = 伞缘正下方，弯曲量就是偏角 */
        /* 整条缓慢摇曳：没有这一项，行波再细也像挂在钩子上的面条 */
        ang += 0.26 * Math.pow(p, 1.30) * Math.sin(t * 0.58 + ph * 1.15);
        if (i > 0) { px += Math.sin(ang) * ds; py += Math.cos(ang) * ds; }
        var lx2 = px + fan * Math.pow(p, 1.5);
        var wx = cx + lx2 * cs - py * sn;
        var wy = cy + lx2 * sn + py * cs;
        var ww = w0 * (1 - Math.pow(p, 1.5) * 0.68);
        if (softAmt > 0) addSoft(wx, wy, ww, soft, kind);
        else addAt((wx / CELL) | 0, (wy / CELL) | 0, ww, kind);
      }
    }
    var glLx = rx * 0.02 * Math.sin(j.ph2);
    /* 受光带：贴着伞顶的一条横向弧，不是正圆（正圆亮斑＝蛋黄） */
    var glLy = topL + (botL - topL) * 0.22;
    var glR = rx * 0.66;

    var span = Math.max(rx * 1.35, (botL - topL) * 1.30);
    var x0 = Math.floor((cx - span) / CELL), x1 = Math.ceil((cx + span) / CELL);
    var y0 = Math.floor((cy - span) / CELL), y1 = Math.ceil((cy + span) / CELL);
    for (var gy = y0; gy <= y1; gy++) {
      var py = gy * CELL + CELL * 0.5;
      for (var gx = x0; gx <= x1; gx++) {
        var px = gx * CELL + CELL * 0.5;
        var ddx = px - cx, ddy = py - cy;
        var lx = ddx * cs + ddy * sn;
        var ly = -ddx * sn + ddy * cs;
        var u = (ly - topL) / (botL - topL);
        if (u < -0.05 || u > 1.06) continue;
        var uu = u < 0 ? 0 : (u > 1 ? 1 : u);
        var hw2 = halfWidth(uu, lx);
        var ax = Math.abs(lx);
        if (ax > hw2 + CELL * 1.10) continue;
        if (ax > hw2) {
          var ri = gy * cols + gx;
          var rr = (ri >= 0 && ri < rnd.length) ? rnd[ri] : 0.7;
          if (rr > 0.50) addAt(gx, gy, 0.05 + 0.08 * (1 - uu), K_BELLP);
          continue;
        }
        var dEdge = (hw2 - ax) / CELL;
        var gdx = (lx - glLx) / glR, gdy = (ly - glLy) / (glR * 0.30);
        var gl = Math.exp(-(gdx * gdx + gdy * gdy) * 1.15);
        gl *= 0.80 - 0.34 * s;   /* 舒张时受光面摊开，收缩时高光收进去 */
        var v, kind;
        if (gl > 0.50) {
          v = 0.44 + 0.24 * gl;
          kind = K_GOLD;
        } else {
          v = 0.34 + 0.32 * (1 - Math.abs(uu * 2 - 0.70)) + 0.20 * gl;
          if (uu < 0.26) kind = K_BELL;
          else if (uu < 0.58) kind = K_BELLP;
          else kind = K_BELLD;
          /* 伞盖的褶：亮肋与暗肋交替，让伞面有起伏阴影 */
          var rib = Math.abs(Math.sin((lx / rx) * 6.0 + j.ph * 0.4));
          v *= 0.62 + (0.36 + 0.20 * s) * Math.pow(rib, 1.15);   /* 竖褶反差加大，收缩时褶更深，伞面才不像一块平铺的圆饼 */
          if (uu < 0.12) v += 0.12;
        }
        if (dEdge < CELL * 1.60 && uu > 0.04) {
          var rimT = 1 - dEdge / (CELL * 1.60);
          v = 0.66 + 0.34 * rimT;
          kind = (uu > 0.55) ? K_BELLD : K_BELL;
        }
        v *= (0.92 + 0.22 * s);
        /* 透光孔：伞面是半透明的，随机抽掉一部分密度，光就从这些洞里透出来 */
        var pk = gy * cols + gx;
        var pr = (pk >= 0 && pk < rnd.length) ? rnd[pk] : 0.5;
        if (pr < 0.22) v *= 0.60;
        else if (pr < 0.34) v *= 0.82;
        /* 伞头中下部的一团核心光：椭圆，不是竖条。
           中心随游动轻微漂移，呼吸时横向收窄、整团亮一档，
           形状跟着伞体变（收缩变圆变亮，舒张摊开变淡）。 */
        var cU = 0.74;                                        /* 0=伞顶 1=伞缘，落在伞壳中部偏下 */
        var cLy = topL + (botL - topL) * cU;
        var cLx = rx * 0.05 * Math.sin(j.ph2 * 1.7 + t * 0.42) * (0.65 + 0.55 * s);
        /* 光团：宽度约是原来的一半，高度更薄（横向 : 纵向 ≈ 3 : 1），
           一块隐约的扁椭圆，不是一口实心的蛋。 */
        var cRx = rx * (0.30 - 0.070 * s);
        var cRy = cRx * (0.33 - 0.035 * s);
        var qdx = (lx - cLx) / cRx, qdy = (ly - cLy) / cRy;
        var qd = qdx * qdx + qdy * qdy;
        /* 不规则：每格自带随机数把边界往里外推一点，边缘参差才像雾不是印上去的椭圆。 */
        var cRi = gy * cols + gx;
        var cJit = (cRi >= 0 && cRi < rnd.length) ? rnd[cRi] : 0.5;
        var qLimit = 0.74 + 0.58 * cJit;                     /* 边界 0.74~1.32，参差但不碎 */
        if (qd < qLimit && gx >= 0 && gy >= 0 && gx < cols && gy < rows) {
          var gg = Math.exp(-qd * 0.72);                       /* 衰减放缓 → 往外散一层 */
          var gv = 0.17 + 0.25 * gg;      /* 整团偏淡，靠“散”而不是靠实心亮块 */
          gv *= (0.88 + 0.24 * s);        /* 收缩时更亮 */
          var ri2 = cRi;
          if (ri2 >= 0 && ri2 < dens.length) {
            var gvv = gv * (0.80 + 0.20 * a) * (curFade < 1 ? curFade : 1);
            if (gvv > 1) gvv = 1;
            /* 注意：这里绕过了 addAt 的边界检查，所以上面必须自己挡 gx/gy。
               否则水母漂到屏幕外时 gx 变负，gy*cols+负gx 会落到上一行末尾，
               光团就被“折”到画面另一边。 */
            /* 这一格归光团所有：密度取较大者，色号强制金。
               必须 continue 掉，否则下面那句 addAt 会拿伞体的更高密度
               把色号盖回蓝色，光团就碎成一片麻点。 */
            if (gvv > dens[ri2]) dens[ri2] = gvv;
            ccol[ri2] = K_GLOW;
            hz[ri2] = curHaze > hz[ri2] ? curHaze : hz[ri2];
            continue;
          }
        }
        addAt(gx, gy, v * (0.80 + 0.20 * a), kind);
      }
    }
    /* 伞内星点 */
    for (var q = 0; q < j.sparksArr.length; q++) {
      var sk = j.sparksArr[q];
      var tw = Math.sin(t * sk.sp + sk.ph);
      if (tw < 0.45) continue;
      var du2 = 0.10 + 0.70 * (sk.oy * 0.5 + 0.5);
      var hwS = halfWidth(du2, sk.ox * rx * 0.45);
      var slx = sk.ox * hwS * 0.82;
      var sly = topL + (botL - topL) * du2;
      var sx = cx + slx * cs - sly * sn;
      var sy = cy + slx * sn + sly * cs;
      var sgx = (sx / CELL) | 0, sgy = (sy / CELL) | 0;
      addAt(sgx, sgy, 0.80 + 0.20 * tw, K_SPARK);
      /* 泛光：闪点周围一圈换成很淡的蓝白字符。
         这里要“强制”改 kind——如果只用 addAt，伞体本身的密度更高，会长不进来。 */
      if (tw > 0.82) {
        /* 只扩上下左右四格，密度压成稀疏点（对角全铺会糊成一片，显脏） */
        for (var hy2 = -1; hy2 <= 1; hy2++) {
          for (var hx2 = -1; hx2 <= 1; hx2++) {
            if (hx2 !== 0 && hy2 !== 0) continue;
            if (hx2 === 0 && hy2 === 0) continue;
            var hi2 = (sgy + hy2) * cols + (sgx + hx2);
            if (hi2 < 0 || hi2 >= ccol.length) continue;
            dens[hi2] = 0.13;
            ccol[hi2] = K_HALO;
          }
        }
      }
    }
    /* 伞缘短须一圈：紧贴荷叶边垂下来，带底色 */
    var NARM = 24;
    for (var nq = 0; nq < NARM; nq++) {
      var tq0 = nq / (NARM - 1);
      var sgn = tq0 * 2 - 1;
      var hwE = halfWidth(0.995, sgn * rx * 0.95);
      var edgeLx = sgn * hwE * 0.94;
      var shrink = 1 - 0.30 * Math.abs(sgn);
      var lenS = ry * (0.11 + 0.22 * shrink) * (0.80 + 0.40 * Math.abs(Math.sin(nq * 2.7 + j.ph))) * (1 - 0.24 * s);
      strand(edgeLx, botL + CELL * 0.10, lenS, 3.4, 0.88, 1.6 + 0.10 * nq, nq * 1.3 + j.ph2,
        0.40 * (1 - 0.26 * Math.abs(sgn)), K_RIM, 0, t, s);
    }
    /* 口腕 */
    for (var m = 0; m < j.arms.length; m++) {
      var arm = j.arms[m];
      var rlx = arm.ox * rx * 0.30;
      var rly = botL + CELL * 0.15;
      var aLen = ry * arm.len * 1.15 * (1 - 0.26 * s);
      strand(rlx, rly, aLen, 2.4, arm.amp * 6.2, arm.sp * 1.2, arm.ph,
        arm.w * 1.15, K_ORAL, 1, t, s, arm.ox * rx * 0.18);
    }
    /* 细触手：拖在身后（左下） */
    for (var k = 0; k < j.tents.length; k++) {
      var tn = j.tents[k];
      var rlx2 = tn.ox * 0.86 * rx;
      var rly2 = botL + CELL * 0.15;
      var len = ry * tn.len * 2.30 * (1 - 0.20 * Math.abs(tn.ox)) * (1 - 0.34 * s);
      var kind2 = tn.pink ? K_PINK : K_TENT;
      strand(rlx2 + trailX * 0.45, rly2, len, tn.seg * 1.15, tn.amp * 8.0, tn.sp, tn.ph,
        tn.w * 3.00 * a, kind2, 0, t, s, tn.ox * rx * 0.26);
    }
  }
  /* ---------- 各层 ---------- */
  /* [v49e] 只铺底色，不碰 dens/水母数据 */
  function paintBaseNow() {
    if (!ctx || !W || !H) return;
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.34, '#fbfdff');
    g.addColorStop(0.68, '#f3f9ff');
    g.addColorStop(0.88, '#eaf5ff');
    g.addColorStop(1, '#e2f0ff');
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  function drawBase() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.34, '#fbfdff');
    g.addColorStop(0.68, '#f3f9ff');
    g.addColorStop(0.88, '#eaf5ff');
    g.addColorStop(1, '#e2f0ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  function drawGlow() {
    /* 上半部光晕：只提亮、不压暗（source-over 白雾），保证整体是亮的 */
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    var cx = W * 0.5, cy = H * 0.38;
    var rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.80);
    rg.addColorStop(0, 'rgba(255,255,255,0.30)');
    rg.addColorStop(0.42, 'rgba(253,255,255,0.14)');
    rg.addColorStop(0.76, 'rgba(250,253,255,0.05)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    /* 底部往浅蓝延伸带：只在这里保留极轻的压深，才有层次 */
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    var bg = ctx.createLinearGradient(0, H * 0.68, 0, H);
    bg.addColorStop(0, 'rgba(255,255,255,0)');
    bg.addColorStop(0.55, 'rgba(232,246,255,0.42)');
    bg.addColorStop(1, 'rgba(236,248,255,0.72)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, H * 0.68, W, H * 0.32);
    ctx.restore();
  }

  function drawGrid() {
    var step = CELL;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(172,218,249,0.10)';
    ctx.beginPath();
    for (var x = 0; x <= W; x += step) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (var y = 0; y <= H; y += step) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    /* 每 4 格一条稍深的主线 */
    ctx.strokeStyle = 'rgba(160,212,247,0.13)';
    ctx.beginPath();
    for (var x2 = 0; x2 <= W; x2 += step * 4) { ctx.moveTo(x2 + 0.5, 0); ctx.lineTo(x2 + 0.5, H); }
    for (var y2 = 0; y2 <= H; y2 += step * 4) { ctx.moveTo(0, y2 + 0.5); ctx.lineTo(W, y2 + 0.5); }
    ctx.stroke();
  }
  function drawStars(t) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 ' + Math.round(CELL * 0.98) + 'px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
    var span = H + 60;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var yy = (s.y - t * s.up) % span;
      if (yy < 0) yy += span;
      yy -= 30;
      var tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
      var a = s.a0 * (0.22 + 0.78 * tw);
      var aa = a * 1.30; if (aa > 0.90) aa = 0.90;   /* 上浮的点：改高饱和蓝，浅蓝白点在白纸上根本看不见 */
      ctx.fillStyle = 'rgba(0,128,238,' + aa.toFixed(3) + ')';
      ctx.fillText(s.ch, s.x, yy);
    }
    ctx.restore();
  }
  /* 水母自身的晕染：淡蓝墨水面 + 中下部暖金带 + 星点 */
  /* 暖金光团的预渲染贴图：每帧 createRadialGradient 太贵（实测掉到 14fps），
     改成开机画一张 128x128 的径向渐变贴图，之后只用 drawImage 缩放。 */
  var _glowSprite = null;
  function glowSprite() {
    if (_glowSprite) return _glowSprite;
    var cc = document.createElement('canvas');
    cc.width = 128; cc.height = 128;
    var cg = cc.getContext('2d');
    var rg = cg.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, 'rgba(253,231,170,1)');
    rg.addColorStop(0.42, 'rgba(253,231,170,0.40)');
    rg.addColorStop(1, 'rgba(253,231,170,0)');
    cg.fillStyle = rg;
    cg.fillRect(0, 0, 128, 128);
    _glowSprite = cc;
    return cc;
  }
  function drawJellyGlow(t) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (var i = 0; i < jellies.length; i++) {
      var j = jellies[i];
      var s = j.s;
      var rx = j.r * 1.02 * (1 - 0.17 * s);
      var ry = j.r * 0.74 * (1 + 0.30 * s) * (j.flat || 1);
      var a = j.alpha * (1 - 0.22 * j.haze);
      var _ef = edgeFadeOf(j);
      if (j.enterT !== undefined && j.enterT < j.enterDur) _ef *= (j.enterT / j.enterDur);
      a *= _ef;
      /* 伞体：像淡水彩在纸上的洇开 */
      ctx.save();
      ctx.translate(j.x, j.y - ry * 0.18);
      ctx.scale(1, 0.92);
      var g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.14);
      g1.addColorStop(0, 'rgba(206,232,252,' + (0.30 * a).toFixed(3) + ')');
      g1.addColorStop(0.55, 'rgba(232,244,253,' + (0.14 * a).toFixed(3) + ')');
      g1.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g1;
      ctx.fillRect(-rx * 1.14, -rx * 1.14, rx * 2.28, rx * 2.28);
      ctx.restore();

      /* 中下部暖金色光带（收缩时更亮） */
      ctx.save();
      ctx.translate(j.x, j.y + ry * 0.10);
      ctx.scale(1, 0.55);
      var g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 0.95);
      g2.addColorStop(0, 'rgba(226,242,255,' + ((0.20 + 0.14 * s) * a).toFixed(3) + ')');
      g2.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(-rx * 0.95, -rx * 0.95, rx * 1.90, rx * 1.90);
      ctx.restore();
      /* 伞中下部的核心光团：和 ASCII 那团同一个位置、同一个横向椭圆。
         贴图 + drawImage，形状随呼吸变形（收缩时收窄、变亮）。 */
      var cw2 = rx * (0.60 - 0.14 * s);
      var ch2 = cw2 * (0.33 - 0.035 * s);
      ctx.save();
      ctx.globalAlpha = (0.16 + 0.22 * s) * a;
      /* 光晕中心与 ASCII 那团对齐：ly = topL + 0.74*(botL-topL) = +0.012*ry */
      ctx.drawImage(glowSprite(), j.x - cw2 * 0.5, j.y + ry * 0.012 - ch2 * 0.5, cw2, ch2);
      ctx.restore();
    }
    ctx.restore();

  }
  function drawChars(t) {
    var stp = (t * 1.1) | 0;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    var half = CELL * 0.5;
    var fontSize = Math.round(CELL + 0.6);
    ctx.font = '800 ' + fontSize + 'px "Courier New","DejaVu Sans Mono",monospace';
    var cellInset = CELL - 1;
    var curAlpha = -1;
    var lastSS = '';          /* 上一格的 fillStyle，相同则跳过赋值 */
    for (var gy = 0; gy < rows; gy++) {
      var py = gy * CELL + half;
      var rowOff = gy * cols;
      var pyFill = gy * CELL + 0.5;
      for (var gx = 0; gx < cols; gx++) {
        var idx = rowOff + gx;
        var v = dens[idx];
        if (v < 0.05) continue;
        var hzv = hz[idx];
        if (hzv > 0.15) v *= (1 - 0.20 * hzv);
        if (v < 0.05) continue;
        var kind = ccol[idx] || K_BELL;
        var fog = hzv > 0.62;
        var px = gx * CELL;
        /* 闪点：高饱和蓝的 * / +，不垫色块 */
        if (kind === K_SPARK) {
          ctx.fillStyle = 'rgb(0,110,255)';
          if (curAlpha !== 1) { ctx.globalAlpha = 1; curAlpha = 1; }
          ctx.fillText((rnd[idx] < 0.5) ? '*' : '+', px + half, py);
          lastSS = 'rgb(0,110,255)';
          continue;
        }
        /* ---- 密集区：彩色底块 + 字符 ---- */
        if (v >= 0.30 && !fog) {
          var aStep = (v * (ALPHA_STEPS - 1)) | 0;
          if (aStep >= ALPHA_STEPS) aStep = ALPHA_STEPS - 1;
          var ss = BG_STR[kind][aStep];
          if (ss !== lastSS) { ctx.fillStyle = ss; lastSS = ss; }
          ctx.fillRect(px + 0.5, pyFill, cellInset, cellInset);
          /* 选字符层级 */
          var ti = 0;
          for (var k = 1; k < TIERS.length; k++) if (v >= TIERS[k].min) ti = k;
          var tier = TIERS[ti];
          var charStr = tier.chars;
          var ci = (rnd[idx] * charStr.length) | 0;
          if (((idx + stp) & 7) === 0) ci = (ci + 1) % charStr.length;
          var rgb = RGBS[kind] || RGBS[K_BELL];
          if (rgb !== lastSS) { ctx.fillStyle = rgb; lastSS = rgb; }
          var al = 0.72 + 0.28 * v;
          if (al > 1) al = 1;
          var alQ = (al * 20) | 0;      /* 0.05 一档 */
          if (alQ !== curAlpha) { ctx.globalAlpha = alQ / 20; curAlpha = alQ; }
          ctx.fillText(charStr.charAt(ci), px + half, py);
        }
        /* ---- 稀疏边缘：只画字符 ---- */
        else {
          var ti2 = 0;
          for (var k2 = 1; k2 < TIERS.length; k2++) if (v >= TIERS[k2].min) ti2 = k2;
          var tier2 = TIERS[ti2];
          var charStr2 = tier2.chars;
          var ci2 = (rnd[idx] * charStr2.length) | 0;
          if (((idx + stp) & 11) === 0) ci2 = (ci2 + 1) % charStr2.length;
          var rgb2 = RGBS[kind] || RGBS[K_BELL];
          if (rgb2 !== lastSS) { ctx.fillStyle = rgb2; lastSS = rgb2; }
          var al2 = 0.58 + 0.40 * v;
          var alQ2 = (al2 * 20) | 0;
          if (alQ2 !== curAlpha) { ctx.globalAlpha = alQ2 / 20; curAlpha = alQ2; }
          ctx.fillText(charStr2.charAt(ci2), px + half, py);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawVignette() {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    var cx = W * 0.5, cy = H * 0.42;
    var vg = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.30, cx, cy, Math.max(W, H) * 0.95);
    vg.addColorStop(0, 'rgba(255,255,255,0)');
    vg.addColorStop(0.62, 'rgba(226,240,252,0.05)');
    vg.addColorStop(1, 'rgba(206,229,249,0.13)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    var side = ctx.createLinearGradient(0, 0, W, 0);
    side.addColorStop(0, 'rgba(212,233,250,0.10)');
    side.addColorStop(0.18, 'rgba(255,255,255,0)');
    side.addColorStop(0.82, 'rgba(255,255,255,0)');
    side.addColorStop(1, 'rgba(212,233,250,0.10)');
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  function separate() {
    var n = jellies.length;
    for (var i = 0; i < n; i++) {
      var a = jellies[i];
      for (var k = i + 1; k < n; k++) {
        var b = jellies[k];
        var dx = b.x - a.x, dy = b.y - a.y;
        var min = (a.r + b.r) * 1.04;
        var d2 = dx * dx + dy * dy;
        if (d2 > min * min) continue;
        var d = Math.sqrt(d2);
        if (d < 0.001) { dx = 1; dy = 0; d = 1; }
        var push = (min - d) * 0.5;
        var ux = dx / d, uy = dy / d;
        a.x -= ux * push; a.y -= uy * push;
        b.x += ux * push; b.y += uy * push;
        a.vx -= ux * push * 1.8; a.vy -= uy * push * 1.8;
        b.vx += ux * push * 1.8; b.vy += uy * push * 1.8;
      }
    }
  }
  function render(dt, t) {
    if (!dens) return;
    dens.fill(0);
    ccol.fill(0);
    hz.fill(0);
    sparks.length = 0;
    for (var i = 0; i < jellies.length; i++) stepJelly(jellies[i], dt, t);
    separate();
    for (var i2 = 0; i2 < jellies.length; i2++) paintJelly(jellies[i2], t);
    drawBase();
    drawGlow();
    drawGrid();
    drawStars(t);
    drawChars(t);
    drawJellyGlow(t);
    drawVignette();
    syncFrost();
  }

  /* ---------- [v49c] 导航栏镜像：拷“被顶栏盖住的那段” ---------- */
  function syncFrost() {
    if (!frostCtx || !topbar) return;
    var bh = Math.round(topbar.getBoundingClientRect().height);
    if (bh <= 0) return;
    var bw = Math.round(page.clientWidth || W);
    if (!bw || !bh) return;
    if (frostW !== bw || frostH !== bh) {
      frostW = bw; frostH = bh;
      frostCanvas.width = Math.round(bw * dpr);
      frostCanvas.height = Math.round(bh * dpr);
      frostCanvas.style.width = bw + 'px';
      frostCanvas.style.height = bh + 'px';
    }
    /* 源区域：必须跟着滚动走。顶栏是 fixed 贴在视口顶，水母层却是 absolute
       跟着页面滚。页面下滚 S 像素后，被顶栏盖住的就是画布的 [S, S+bh) 这一段。
       S = -(page 顶端相对视口的偏移)，夹在画布范围内。 */
    var pageTop = page.getBoundingClientRect().top;
    var scrollOffset = -pageTop;
    if (scrollOffset < 0) scrollOffset = 0;
    var maxOffset = Math.max(0, H - bh);
    if (scrollOffset > maxOffset) scrollOffset = maxOffset;
    var srcY = Math.round(scrollOffset * dpr);
    var sh = Math.min(Math.round(bh * dpr), canvas.height - srcY);
    if (sh <= 0) return;
    frostCtx.setTransform(1, 0, 0, 1, 0, 0);
    frostCtx.clearRect(0, 0, frostCanvas.width, frostCanvas.height);
    frostCtx.drawImage(canvas, 0, srcY, canvas.width, sh, 0, 0, frostCanvas.width, sh);
  }

  /* ---------- 循环 ---------- */
  var raf = null, lastTs = 0, acc = 0;
  /* [ticket23-perf] 页面二刚入场的那一小段先把主线程让出来。
     票根的三张齿边遮罩 + 入场位移 + 这个画布的 ASCII 重绘挤在同一秒里，
     手机上就是肉眼可见的一顿。水母晚 600ms 醒，人眼几乎察觉不到，
     但入场动画能整段跑顺。 */
  var wasLive = false, liveAt = 0, warmPainted = false;
  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (!lastTs) lastTs = ts;
    var dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (dt > 0.1) dt = 0.1;
    var live = ready && !document.hidden && page.classList.contains('is-visible');
    if (live && !wasLive) liveAt = ts;
    wasLive = live;
    if (!live) return;
    if (ts - liveAt < 120) return;   /* [iosfix2] 首帧已由 boot 同步补画，让路期从 600ms 收到 120ms */
    /* [v49d] 滚动期间完全停画：画布不再每帧重绘，合成器只需要把已有纹理
       平移一下，这是治上下拖动闪白的关键一刀。
       顶栏镜像仍然要刷（它要跟着滚动换源区域），但它只是一块 390×53 的小图，
       一次 drawImage 的量，不构成负担。停手 160ms 后 is-scrolling 摘掉，
       动画从原来的时间轴平滑接上。 */
    if (page.classList.contains('is-scrolling')) {
      /* 滚动中连镜像都不刷（CSS 已把它藏起来），整帧零工作量 */
      acc = 0;
      return;
    }
    acc += dt;
    if (acc < 1 / 30) return;
    time += acc;
    var step = acc;
    acc = 0;
    render(step, time);
  }
  function boot() {
    if (reduced) {
      if (measure()) render(0.016, 1.2);
      return;
    }
    if (!measure()) return;
    /* [iosfix2] 第一次进页面二时，画布尺寸刚设好、而 loop 还有 600ms 的让路期，
       这段时间画布上只剩 CSS 兜底的那层浅蓝渐变 —— 看着就是“先是白的一片，
       水母过一会儿才冒出来”。这里在 measure 之后同步补画一整帧（含水母，
       seedJellies 撒的点本来就在画面内），切过去的瞬间就已经有画面了。 */
    if (!warmPainted) {
      warmPainted = true;
      try { render(0.016, 0.30); } catch (e) {}
    }
    if (!raf) raf = requestAnimationFrame(loop);
  }

  /* 调试出口：只在控制台用，不参与渲染 */
  window.__p2Jelly = {
    dens: function () { return dens; },
    kinds: function () { return ccol; },
    size: function () { return { cols: cols, rows: rows, W: W, H: H, ready: ready }; },
    kick: function (i) { var j = jellies[i | 0]; if (j) respawn(j); return i; },   /* 调试：强制重生 */
    jellies: function () {
      return jellies.map(function (j) {
        return {
          x: Math.round(j.x), y: Math.round(j.y), r: Math.round(j.r),
          vx: Math.round(j.vx * 10) / 10, vy: Math.round(j.vy * 10) / 10,
          s: Math.round(j.s * 100) / 100, phase: j.phase,
          haze: Math.round(j.haze * 100) / 100,
          ss: j.ss, enterT: j.enterT, enterDur: j.enterDur
        };
      });
    },
    draw: function (t) { render(0.016, t || 2); }
  };

  try {
    new MutationObserver(function () { boot(); })
      .observe(page, { attributes: true, attributeFilter: ['class'] });
  } catch (e) {}
  if (window.ResizeObserver) {
    try { new ResizeObserver(function () { boot(); }).observe(page); } catch (e) {}
  }
  window.addEventListener('resize', boot);
  window.addEventListener('orientationchange', function () { setTimeout(boot, 220); });
  document.addEventListener('visibilitychange', function () { lastTs = 0; });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
