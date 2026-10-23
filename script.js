const audio = document.getElementById('site-audio');
const songButtons = [...document.querySelectorAll('.music-btn[data-song]')];
const pauseButton = document.querySelector('.pause-btn');
const musicToggle = document.querySelector('.music-toggle');
const musicControls = document.querySelector('.music-controls');
const siteBody = document.body;
const musicBar = document.querySelector('.music-bar');
const bottomNav = document.querySelector('.bottom-nav');
let hasUserInteracted = false;
let userPausedAudio = false;
let playAttempt = 0;
let pendingAudioPlay = null;

// Viewport sizing is handled by CSS units.

function setAudioPlayingState() {
  siteBody.classList.remove('audio-blocked', 'audio-paused');
  musicBar.classList.add('is-playing');
  musicBar.classList.remove('is-paused');
  pauseButton.textContent = 'Ⅱ';
  pauseButton.setAttribute('aria-label', '暂停音乐');
}

function setAudioPausedState() {
  siteBody.classList.add('audio-paused');
  musicBar.classList.remove('is-playing');
  musicBar.classList.add('is-paused');
  pauseButton.textContent = '▶';
  pauseButton.setAttribute('aria-label', '继续播放音乐');
}

function startAudio() {
  if (!audio.src || userPausedAudio || pendingAudioPlay) return;
  const attempt = ++playAttempt;
  const promise = audio.play();
  pendingAudioPlay = promise;
  if (!promise || typeof promise.then !== 'function') {
    pendingAudioPlay = null;
    return;
  }
  promise.then(() => {
    // An old request must never pause a newer track or resume request.
    if (attempt !== playAttempt) return;
    if (userPausedAudio) audio.pause();
    else setAudioPlayingState();
  }).catch(() => {
    if (attempt === playAttempt && !userPausedAudio && hasUserInteracted) {
      siteBody.classList.add('audio-blocked');
    }
  }).finally(() => {
    if (pendingAudioPlay === promise) pendingAudioPlay = null;
  });
}

function tryResumeAudio() {
  if (!hasUserInteracted || userPausedAudio || !audio.src || !audio.paused) return;
  startAudio();
}
const tracks = {
  '3363498728': 'https://music.163.com/song/media/outer/url?id=3363498728.mp3',
  '3435222249': 'https://music.163.com/song/media/outer/url?id=3435222249.mp3'
};
let activeSong = '3363498728';

function playSong(id) {
  activeSong = id;
  userPausedAudio = false;
  ++playAttempt;
  pendingAudioPlay = null;
  audio.pause();
  audio.src = tracks[id];
  audio.load();
  songButtons.forEach(button => button.classList.toggle('active', button.dataset.song === id));
  setAudioPlayingState();
  startAudio();
}

function pauseAudio() {
  userPausedAudio = true;
  ++playAttempt;
  pendingAudioPlay = null;
  audio.pause();
  setAudioPausedState();
}

function resumeAudio() {
  userPausedAudio = false;
  if (!audio.src) audio.src = tracks[activeSong];
  setAudioPlayingState();
  startAudio();
}

songButtons.forEach(button => button.addEventListener('click', () => {
  hasUserInteracted = true;
  playSong(button.dataset.song);
}));
musicToggle.addEventListener('click', () => {
  const expanded = musicToggle.getAttribute('aria-expanded') !== 'true';
  musicToggle.setAttribute('aria-expanded', String(expanded));
  musicToggle.setAttribute('aria-label', expanded ? '收起音乐控制' : '展开音乐控制');
  musicControls.hidden = !expanded;
  musicBar.classList.toggle('is-collapsed', !expanded);
});

pauseButton.addEventListener('click', () => {
  hasUserInteracted = true;
  if (userPausedAudio) resumeAudio();
  else pauseAudio();
});

['pointerdown', 'touchstart', 'keydown'].forEach(type => {
  window.addEventListener(type, event => {
    hasUserInteracted = true;
    if (event.target.closest?.('.music-bar')) return;
    tryResumeAudio();
  }, { once: false, passive: true });
});

// Layout follows the viewport through CSS units.

document.querySelectorAll('.page-link').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  showPage('page2');
  if (!audio.src) playSong(activeSong);
}));

document.querySelectorAll('.bottom-nav a').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  showPage(link.dataset.page);
}));

const page2RevealItems = [...document.querySelectorAll('.page2-reveal')];
const page2RevealObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('is-revealed');
  });
}, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }) : null;

let page2RevealTimer;

page2RevealItems.forEach(item => {
  if (page2RevealObserver) page2RevealObserver.observe(item);
  else item.classList.add('is-revealed');
});

const page3Posts = [
  {
    key: 'virtual-love',
    copy: '我们拉勾头抵着头发小小的誓，于是时间有了柔软的刻度。',
    tag: '心髒鑰匙',
    image: 'page3-card-1-sm.webp',
    alt: '虚恋动态图片',
    href: 'https://www.kdocs.cn/l/cd1UnT68kBpa',
    stats: ['3,102', '1,240', '3.5万']

  },
  {
    key: 'sick-love',
    copy: '仅有你我二人的逃亡之旅，装作废人的共依存症。',
    tag: '拖累症',
    image: 'page3-card-2-sm.webp',
    alt: '病恋动态图片',
    href: 'https://www.kdocs.cn/l/cmvJAHDy9vap',
    stats: ['2,846', '986', '2.8万']
  },
  {
    key: 'dom-white-knight',
    copy: '你落的泪会有答案。别害怕、到我这来。',
    tag: '輕吻、指引與愛',
    image: 'page3-card-3-sm.webp',
    alt: 'Dom/白骑士动态图片',
    href: 'https://www.kdocs.cn/l/cjNLuDIhMVdb',
    stats: ['4,173', '1,506', '4.2万']
  },
  {
    key: 'sub-lower',
    copy: '除了你与明天我还能去往哪里。',
    tag: '輕咬、淚水與愛',
    image: 'page3-card-4-sm.webp',
    alt: 'Sub/下位动态图片',
    href: 'https://www.kdocs.cn/l/cjUHbxuOjRaM',
    stats: ['1,927', '734', '2.1万']
  }
  ];
/* page3 的四张动态图不在首屏 HTML 里，首次点击才开始下载。Safari 在 img.src 变更后会保留旧画面，
   直到新图下载并解码完成——切换时"闪一下上一张"就是这么来的。
   进页面后趁空闲把它们预拉进缓存并解码，切换就变成同步的，中间没有等待窗口。 */
const page3ImageCache = new Map();
function preloadPage3Images() {
  page3Posts.forEach(post => {
    if (page3ImageCache.has(post.image)) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = post.image;
    if (typeof img.decode === 'function') img.decode().catch(() => {});
    page3ImageCache.set(post.image, img);
  });
}
function preloadPage3Tiles() {
  ['page3-tile-rain-sm.webp', 'page3-tile-wings-sm.webp', 'page3-tile-lily-sm.webp', 'page3-tile-eye-sm.webp', 'page3-tile-rain-back-sm.webp'].forEach(function (src) {
    var im = new Image();
    im.decoding = 'async';
    im.src = src;
    if (typeof im.decode === 'function') im.decode().catch(function () {});
  });
}
function schedulePage3Preload() {
  const run = () => preloadPage3Images();
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 1500 });
  else window.setTimeout(run, 600);
}
function setPage3Post(post) {
  const copy = document.getElementById('page3-post-copy');
  if (!copy || !post) return;
  copy.textContent = post.copy;
  document.getElementById('page3-post-tag').textContent = post.tag;
  const image = document.getElementById('page3-post-image');
  image.src = post.image;
  image.alt = post.alt;
  document.getElementById('page3-post-link').href = post.href;
  ['page3-reposts', 'page3-comments', 'page3-likes'].forEach((id, index) => {
    document.getElementById(id).textContent = post.stats[index];
  });
  document.querySelectorAll('.page3-tabs a').forEach(tab => {
    const active = tab.hash === `#${post.key}`;
    tab.classList.toggle('is-active', active);
    if (active) tab.setAttribute('aria-current', 'true');
    else tab.removeAttribute('aria-current');
  });
}

document.querySelectorAll('.page3-tabs a').forEach((tab, index) => {
  tab.addEventListener('click', event => {
    event.preventDefault();
    setPage3Post(page3Posts[index]);
  });
});

/* 按需加载：切到某页时才唤醒该页的图片与视频，首屏不再被其他页抢带宽 */
function wakePage(id) {
  const page = document.getElementById(id);
  if (!page) return;
  if (id === 'page3') { preloadPage3Tiles(); schedulePage3Preload(); }
  page.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
  /* [ios8] 逐张 decode 已停用：在 iOS 上会与开屏动画抢主线程 */
  const video = page.querySelector('video[data-poster]');
  if (video) {
    if (!video.poster) video.poster = video.getAttribute('data-poster');
    if (video.preload !== 'metadata') video.preload = 'metadata';
  }
}
/* 进站空闲时就把 page3 那排缩略图解码好：首次点进第三页不再有解码先后差 */
(function () {
  var started = false;
  var run = function () { if (started) return; started = true; preloadPage3Tiles(); };
  var kick = function () { window.setTimeout(function () {
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 2500 });
    else run();
  }, 1200); };
  if (window.__introDone) kick();
  else window.addEventListener('site:intro-done', kick, { once: true });
  window.setTimeout(run, 8000);
})();
/* ===== [ios-perf2026-10-23] 图片提前解码 =====
   iOS Safari 的解码发生在「这张图第一次要画出来」的那一帧，而且默认在主线程同步做，
   于是翻页 / 滚动时那一帧特别长 —— 看起来就是图片卡一下。
   img.decode() 让 WebKit 把解码放到后台线程，真正要显示时直接贴纹理。
   只在图已经开始下载（loading 已置 eager 或已 complete）时调用，不会额外拉流量。 */
function warmDecodeImages(root) {
  if (!root || !root.querySelectorAll) return;
  var list = root.querySelectorAll('img[src]');
  var i = 0;
  function idle(fn) {
    if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 900 });
    else window.setTimeout(fn, 120);
  }
  function step() {
    if (i >= list.length) return;
    var img = list[i++];
    if (img && typeof img.decode === 'function' && (img.complete || img.loading === 'eager')) {
      img.decode().catch(function () {});
    }
    idle(step);
  }
  idle(step);
}
/* 开屏结束后趁空闲把第二页的图先下载并预解码：第二页是主入口，
   里面那几张 150~230KB 的 jpg 如果等到点进去才开始下载 + 解码，iOS 上就是一下明显卡顿。
   一次只处理一张、空闲时进行，不抢首屏带宽。 */
(function () {
  /* [ios8] 预取已停用：原逻辑把第二页 14 张图改成 eager 再 decode，
     会在开屏刚结束那几秒堆出一批并发请求，iOS 上卡顿+个别图加载失败。 */
  return;
  var done = false;
  var run = function () {
    if (done) return;
    var page = document.getElementById('page2');
    if (!page) return;
    done = true;
    /* 一次只放行一张：先置 eager 再 decode，下次空闲再做下一张。
       否则 14 张图同时开下载、同时解码，反而是新的卡顿源。 */
    var list = page.querySelectorAll('img[src]');
    var i = 0;
    var step = function () {
      if (i >= list.length) return;
      var img = list[i++];
      if (img.loading === 'lazy') img.loading = 'eager';
      if (typeof img.decode === 'function') img.decode().catch(function () {});
      if ('requestIdleCallback' in window) window.requestIdleCallback(step, { timeout: 1500 });
      else window.setTimeout(step, 120);
    };
    step();
  };
  var kick = function () {
    window.setTimeout(function () {
      if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 });
      else run();
    }, 1400);
  };
  if (window.__introDone) kick();
  else window.addEventListener('site:intro-done', kick, { once: true });
  window.setTimeout(run, 9000);  /* 兜底：开屏一直没走完也不会一直不预热 */
})();
/* [note16 2026-10-23] 页面一 → 页面二转场：蓝幕扫过 + 页内错峰入场。
   只在「从首屏点进第二页」时播；从第三/四页切回不播，免得每次翻页都要等一道幕。 */
var p2EnterTimer = 0, p2VeilEl = null;
/* [note19 2026-10-23] 幕先吞掉页面一，铺满后才真正换页。
   原来是先换页再起幕，幕从底部往上升的这段时间（约218ms）上半屏露的是已经切过去的第二页，
   看起来就是「内容闪一下、白幕才追上来」。 */
var P2_SWITCH_DELAY = 200; /* 比盖满（218ms）早一点开始逐帧盯幕，盖满后一帧就换页，白屏不停留 */
var P2_STAGE_DELAY = 120; /* 退幕起手先静止的那段：票根台在它结束、幕开始上退的那一拍浮起 */
var P2_VEIL_COVER_MS = 218; /* 升幕动画时长：跑满即 translateY(0)，整屏盖死 */
var p2EnterSeq = 0, p2SwitchTimer = 0, p2StageTimer = 0;
function playPage2Enter() {
  var page = document.getElementById('page2');
  if (!page) return;
  page.classList.remove('is-p2-entering');
  if (!p2VeilEl) {
    p2VeilEl = document.createElement('div');
    p2VeilEl.className = 'p2-enter-veil';
    p2VeilEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(p2VeilEl);
  }
  window.clearTimeout(p2EnterTimer);
  window.clearTimeout(p2StageTimer);
  p2VeilEl.classList.remove('is-revealing');
  p2VeilEl.classList.remove('is-covering');
  void p2VeilEl.offsetWidth;
  p2VeilEl.classList.add('is-covering');
  /* [note20] 转场拆成两段：先把幕升满（盖死整屏），等页面真的换完了再揭开。
     原来是一段动画里含着揭幕时间点：主线程一卡，揭幕就跑到切页前面去，
     那 125ms 的停窗根本挡不住真机几百毫秒的首帧卡顿，于是白幕还没盖住就露出第二页。 */
  p2EnterTimer = window.setTimeout(function () {
    /* 兜底：3s 还没进揭幕（切页被打断又没人收尾），自己撤，别把整站盖死 */
    if (p2VeilEl && p2VeilEl.classList.contains('is-covering')) startVeilReveal();
  }, 3000);
}
/* 幕已经盖死整屏、第二页也切完了 —— 到这里才开始揭开，退幕时露出的必定是第二页 */
function startVeilReveal() {
  if (!p2VeilEl) return;
  p2VeilEl.classList.remove('is-covering');
  void p2VeilEl.offsetWidth;
  p2VeilEl.classList.add('is-revealing');
  window.clearTimeout(p2StageTimer);
  /* [note19/20] 票根台跟着幕的时间轴走：退幕静止期一结束就浮起，JS 调度，不挂 CSS delay */
  p2StageTimer = window.setTimeout(function () {
    var p2page = document.getElementById('page2');
    if (!p2page) return;
    void p2page.offsetWidth;
    p2page.classList.add('is-p2-entering');
  }, P2_STAGE_DELAY);
  window.clearTimeout(p2EnterTimer);
  p2EnterTimer = window.setTimeout(function () {
    var p2page = document.getElementById('page2');
    if (p2page) p2page.classList.remove('is-p2-entering');
    if (p2VeilEl) p2VeilEl.classList.remove('is-revealing');
  }, 900);
}
function showPage(id, { resetScroll = true /* [ioscall] skipP2Enter 已废弃，保留入参兼容旧调用 */ } = {}) {
  /* _iOS_NO_P2_VEIL [iosfix2026-10-23]
     首屏 → 第二页不再走「白幕扫过 + 票根台错峰浮起」那套转场。
     原来会先起一道满屏白幕（白底 + 克莱因蓝竖线纸纹）从下往上盖死整页，
     盖满之后才换页、再退幕。真机上主线程一被排版/解码堵住，
     白幕会在屏幕上多停好几百毫秒 —— 就是「点进去先看到一整屏空白竖线纸」。
     现在和第三页、第四页、私信页保持一致：只靠 is-visible 变化触发
     page-enter 淡入（460ms），让第二页自己慢慢浮现。
     旧的 playPage2Enter / startVeilReveal 函数和 .p2-enter-veil 样式都留着，
     以后想恢复这套转场，把下面一行取消注释再在后面 return 即可。
     // playPage2Enter(); */
  /* [iosfix3] 票根台的「缓缓浮现」原来挂在退幕回调里（is-p2-entering），
     白幕拆掉之后这个类就没人加了，票根于是硬生生砸出来。
     这里必须抢在 is-visible 之前挂上：元素还处在 display:none 时动画不运行，
     等它真的显示出来就从关键帧 0%（透明）开始，票根第一帧就是透明的，不会出现
     「先完整显示 120ms 再突然变透明」的闪。 */
  const p2StageEl = document.getElementById('page2');
  if (p2StageEl) {
    window.clearTimeout(p2StageTimer);
    p2StageEl.classList.remove('is-p2-entering');
    if (id === 'page2') {
      void p2StageEl.offsetWidth;
      p2StageEl.classList.add('is-p2-entering');
      p2StageTimer = window.setTimeout(() => p2StageEl.classList.remove('is-p2-entering'), 1150);
    }
  }
  document.querySelectorAll('.welcome-view, .page-view').forEach(page => page.classList.toggle('is-visible', page.id === id));
  /* [opt2026-10-23 b2] lazy -> eager is handled inside wakePage(); no second DOM pass here */
  wakePage(id);
  try { window.dispatchEvent(new CustomEvent('site:page', { detail: { id: id } })); } catch (err) {}
  if (id === 'page3' && window.__warmRain) setTimeout(window.__warmRain, 1500);   /* 克莱尔修：等第三页入场动画走完再备雨 */
  document.querySelectorAll('.bottom-nav a').forEach(link => link.classList.toggle('selected', link.dataset.page === id));
  const secondaryPage = !['welcomePage', 'dmPage'].includes(id);
  siteBody.classList.toggle('page2-active', id === 'page2');
  siteBody.classList.toggle('dm-active', id === 'dmPage');
  siteBody.classList.toggle('page4-active', id === 'page4');
  document.querySelector('.bottom-nav').hidden = !secondaryPage;
  document.querySelector('.music-bar').hidden = !secondaryPage;
  if (resetScroll) window.scrollTo({ top: 0, behavior: 'instant' });
  const pageHash = id === 'welcomePage' ? '#welcome' : (id === 'dmPage' ? '#message' : `#${id}`);
  /* file:// 下 replaceState 会抛 SecurityError(origin 为 null), 必须包住;
     否则 showPage 在这行中断, 页面就卡在开屏、点击全无反应 */
  try { history.replaceState(null, '', pageHash); } catch (err) {}

  // [perf] 暂停非当前页的动画。原写法按 [style*="animation"] 找元素，但页面里没有元素带内联
  // animation，等于空转（2026-10-22 修正）：改成给非当前页挂 page-paused，由 CSS 统一暂停。
  document.querySelectorAll('.welcome-view, .page-view').forEach(page => {
    page.classList.toggle('page-paused', page.id !== id);
  });

  if (id === 'page2') {
    page2RevealItems.forEach(item => item.classList.remove('is-revealed'));
    window.clearTimeout(page2RevealTimer);
    page2RevealTimer = window.setTimeout(() => page2RevealItems.forEach(item => item.classList.add('is-revealed')), 40);
    const gallery = document.querySelector('.gallery-grid');
    gallery.classList.remove('reveal-now');
    void gallery.offsetWidth;
    gallery.classList.add('reveal-now');
    const p2Gallery = document.querySelector('.page2-image-gallery');
    if (p2Gallery) {
      p2Gallery.classList.remove('reveal-now');
      void p2Gallery.offsetWidth;
      p2Gallery.classList.add('reveal-now');
    }
  }
}

audio.addEventListener('playing', () => {
  if (userPausedAudio) {
    audio.pause();
    return;
  }
  setAudioPlayingState();
});
audio.addEventListener('pause', () => {
  if (userPausedAudio) setAudioPausedState();
});
audio.addEventListener('error', () => {
  if (hasUserInteracted) siteBody.classList.add('audio-blocked');
});
audio.addEventListener('ended', () => {
  if (!userPausedAudio) playSong(activeSong === '3363498728' ? '3435222249' : '3363498728');
});

function pageFromHash() {
  const hash = location.hash.slice(1);
  if (hash === 'message') return 'dmPage';
  return ['page2', 'page3', 'page4'].includes(hash) ? hash : 'welcomePage';
}

window.addEventListener('hashchange', () => showPage(pageFromHash()));
/* 开屏 / 刷新一律从头开始：丢掉 URL 里残留的 #message，回到个人介绍页 */
function resetToIntro(force) {
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch (err) {}
  const current = document.querySelector('.welcome-view.is-visible, .page-view.is-visible');
  if (!force && current && current.id === 'welcomePage') return;
  showPage('welcomePage', { resetScroll: false });
}
window.addEventListener('pageshow', () => {
  resetToIntro(false);
  tryResumeAudio();
});

resetToIntro(true);
playSong(activeSong);

/* ===== MOTION ENHANCEMENTS ===== */

// P1 首屏入场：监听 welcomePage 获得 is-visible 时触发
(function () {
  const welcome = document.getElementById('welcomePage');
  if (!welcome) return;
  let fired = false;
  function triggerP1() {
    if (fired) return;
    fired = true;
    document.body.classList.remove('p1-loaded');
    void document.body.offsetWidth;
    document.body.classList.add('p1-loaded');
  }
  if (welcome.classList.contains('is-visible')) {
    requestAnimationFrame(triggerP1);
  } else {
    new MutationObserver(function (_, obs) {
      if (welcome.classList.contains('is-visible')) {
        requestAnimationFrame(triggerP1);
        obs.disconnect();
      }
    }).observe(welcome, { attributes: true, attributeFilter: ['class'] });
  }
  // 开屏结束之后再播一次，让首屏跟着点击一起进场
  /* [opt2026-10-23] 首屏入场前先让头图/头像/动态图解码完，
     否则入场动画的第一两帧会撞上进行中的解码，出现“起步一顿”。
     最多等 220ms，不让动画整体推迟。 */
  function whenHeroDecoded(cb) {
    var done = false;
    function fire() { if (done) return; done = true; cb(); }
    window.setTimeout(fire, 220);
    var imgs = [].slice.call(document.querySelectorAll('#welcomePage img'));
    if (!window.Promise) { fire(); return; }
    Promise.all(imgs.map(function (im) {
      return (im.decode ? im.decode() : Promise.resolve()).catch(function () {});
    })).then(function () { window.requestAnimationFrame(fire); });
  }
  window.addEventListener('site:intro-done', function () {
    fired = false;
    whenHeroDecoded(function () { window.requestAnimationFrame(triggerP1); });
  });
})();

// 页面切换入场动效
(function () {
  var pages = [...document.querySelectorAll('.welcome-view, .page-view')];
  pages.forEach(function (el) {
    var busy = false;
    function hasVisibleToken(value) {
      return /(^|\s)is-visible(?:\s|$)/.test(value || '');
    }
    new MutationObserver(function (records) {
      if (window.__lilyFlashback) return;
      if (busy) return;
      if (!el.classList.contains('is-visible')) return;
      /* 只响应 is-visible 的增删。滚动、导航加深、暂停等 class 变化
         不能重新播放整页 opacity 入场动画，否则会出现整屏白闪。 */
      var visibilityChanged = records.some(function (record) {
        return hasVisibleToken(record.oldValue) !== el.classList.contains('is-visible');
      });
      if (!visibilityChanged) return;
      busy = true;
      el.classList.remove('is-entering');
      void el.offsetWidth;
      el.classList.add('is-entering');
      window.setTimeout(function () {
        el.classList.remove('is-entering');
        window.setTimeout(function () { busy = false; }, 0);
      }, 520);
    }).observe(el, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  });
})();

// Bottom nav 滑动指示条
(function () {
  var nav = document.querySelector('.bottom-nav');
  if (!nav) return;
  var indicator = document.createElement('div');
  indicator.className = 'bottom-nav-indicator';
  nav.appendChild(indicator);
  function updateIndicator() {
    var active = nav.querySelector('a.selected');
    if (!active) {
      indicator.classList.remove('is-on');
      return;
    }
    var navRect = nav.getBoundingClientRect();
    var rect = active.getBoundingClientRect();
    if (!rect.width) { indicator.classList.remove('is-on'); return; }
    indicator.style.left = (rect.left - navRect.left) + 'px';
    indicator.style.width = rect.width + 'px';
    indicator.classList.add('is-on');
  }
  /* 克莱尔修：指示条自己也在 nav 里面，updateIndicator 给它加/去 class 又会触发这个观察器，
     classList.add 就算 class 没变也会产生一条变动记录 → 无限循环，主线程永远卡死（开屏点不动、字体来不及渲染）。
     现在只认 <a> 的变动，指示条自己的变动不算。 */
  new MutationObserver(function (recs) {
    for (var i = 0; i < recs.length; i++) {
      if (recs[i].target !== indicator) { updateIndicator(); return; }
    }
  }).observe(nav, { attributes: true, attributeFilter: ['class'], subtree: true });
  window.addEventListener('resize', updateIndicator);
  window.addEventListener('pageshow', updateIndicator);
  updateIndicator();
})();

// P3 reveal：进入时依次显示
(function () {
  var p3 = document.getElementById('page3');
  if (!p3) return;
  var items = [...p3.querySelectorAll('.page3-profile, .page3-subscribe, .page3-highlights, .page3-url, .page3-tabs, .page3-post')];
  items.forEach(function (el) { el.classList.add('p3-reveal-item'); });
  var wasVisible = false;
  function revealP3() {
    /* 同一帧全部亮起：之前按 i*70ms 错开，导致首屏各块（尤其缩略图那排）看起来快慢不一 */
    items.forEach(function (el) { el.classList.add('is-revealed'); });
  }
  function syncP3() {
    var visible = p3.classList.contains('is-visible');
    if (visible && !wasVisible) {
      revealP3();
    } else if (!visible && wasVisible) {
      items.forEach(function (el) { el.classList.remove('is-revealed'); });
    }
    wasVisible = visible;
  }
  new MutationObserver(syncP3).observe(p3, { attributes: true, attributeFilter: ['class'] });
  syncP3();
})();
/* P3 卡面翻转 + RAIN v11：代码雨（歌词字符、蓝白渐变、落到底端渐渐变短）
   一次 draw call：字符图集 + 柔光图集 + 歌词句表纹理，全在 fragment shader 里算完。 */
(function () {
  var p3 = document.getElementById('page3');
  if (!p3) return;
  var cards = [].slice.call(p3.querySelectorAll('.page3-highlight'));
  if (!cards.length) return;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = null, gl = null, prog = null, buf = null;
  var texGlyph = null, texGlow = null, texPhrase = null;
  var rainOn = false, rafId = 0;
  var _time = 0, _last = 0;
  var _resizeBound = false;
  var uni = {};

  /* 歌词句表：每束字念一句，短的已经拼长 */
  var PHRASES = [
    '大丈夫僕が居るから',
    '大丈夫朝は来るから',
    '大丈夫僕が行くから',
    '其方で待ってて見えないようにして',
    '言えない夜指定言い換えよう酔う重点',
    '救命有頂天騙し騙しゴール進展',
    '今宵は貴女鬼さん此方へ',
    '大丈夫夜は明けるよ傍に居るから',
    '後ろは見ないで泣きたい感じで',
    '会いたい感じで言えないのNo融点',
    '醜態有頂天苦し紛れオール人生',
    'とんだ災難秘密は此方で',
    '愛してくれと言わないわそっと抱き締めて',
    '夢の中で見る明日が廻ル廻ル廻ル廻ル',
    '廻ル続ケルねぇ大丈夫',
    '明日は見ないで金で買ってる悦びだって',
    'まして消えゆく佳き日日だって',
    'どうして人より劣るんだって惨め憐れで嘆いても',
    'いつかなくなるあなたにだっていつかなくなるあたしにだって',
    '期待を込めて生きてる今世みんな2人を望んでる',
    '今日は行くから僕だけ見ていて',
    '大丈夫傍に居るから',
  ];
  var PHRASE_W = 32, PHRASE_ROWS = 24;

  /* 字符集：歌词里出现的全部字，补齐到 144 个正好铺满 12x12 图集 */
  var GLYPHS = '大丈夫僕が居るから朝は来行く其方で待って見えないようにし言夜指定換酔重点救命有頂天騙ゴール進展今宵貴女鬼さん此へ明け傍後ろ泣きた感じ会のNo融醜態苦紛れオ人生とだ災難秘密愛わそ抱締め夢中日廻続ケねぇ金買悦びま消ゆ佳どり劣惨憐嘆もつあ期を込世み2望大丈夫僕が居るから朝は来行く其方で待って見';

  var VS = [
    '#version 300 es',
    'in vec2 aPos;',
    'void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }'
  ].join('\n');

  var FS = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D uGlyph;
uniform sampler2D uGlow;
uniform sampler2D uPhrase;
uniform vec2 uRes;
uniform float uTime;
uniform float uPlen[24];

float hash21(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

const float GN = 12.0;
const float ROWS = 44.0;

void main(){
  float charH = uRes.y / ROWS;
  float charW = charH * 0.74;
  float colF = floor(gl_FragCoord.x / charW);
  float rowF = floor((uRes.y - gl_FragCoord.y) / charH);

  vec2 sv = vec2(colF * 1.37 + 3.0, 11.3);
  float seed = hash21(sv);
  /* 不是每一列都有雨，留出空白才有一束束的感觉 */
  if (seed > 0.74) { outColor = vec4(0.0); return; }

  float trailLen = 16.0 + 30.0 * hash21(sv + 3.1);
  float speed    = 5.0 + 10.0 * hash21(sv + 7.7);

  /* head 从屏幕上方外侧一路走到下方外侧，走完一整程才回到起点。
     行程里留出 2 倍束长，才能让束尾慢慢追上来。 */
  float span  = ROWS + 2.0 * trailLen + 6.0;
  float headY = mod(uTime * speed + seed * 211.0, span) - trailLen;

  /* 头越过底边后，束尾跟着上移：整束一点点变短，而不是一碰边就整串消失 */
  float below = max(0.0, headY - ROWS);
  float len   = trailLen - below;
  if (len <= 1.0) { outColor = vec4(0.0); return; }

  float hy = min(headY, ROWS + 1.0);
  float d  = hy - rowF;
  if (d < 0.0 || d > len) { outColor = vec4(0.0); return; }

  /* 束内随机空洞，让它不连续 */
  if (hash21(vec2(colF, rowF) + 77.0) > 0.965) { outColor = vec4(0.0); return; }

  float k = clamp(d / len, 0.0, 1.0);
  float inten = pow(1.0 - k, 1.70);

  /* 刚出现的头 与 即将消失的尾，两个字都是白的 */
  float headGlow = smoothstep(3.15, 0.0, d);
  float tailGlow = smoothstep(len - 3.30, len - 0.30, d);
  /* 整束快消失时整体再压一层，收尾干净 */
  float lifeFade = smoothstep(0.0, 6.0, len);

  /* 这一列念哪一句歌词 */
  float pi = floor(hash21(sv + 5.5) * 22.0);
  float plen = uPlen[int(pi)];
  if (plen < 1.0) { outColor = vec4(0.0); return; }
  float phOff = floor(hash21(sv + 9.1) * plen);
  float ci = mod(rowF + phOff, plen);
  float idx = floor(texture(uPhrase, vec2((ci + 0.5) / 32.0, (pi + 0.5) / 24.0)).r * 255.0 + 0.5);

  float gx = mod(idx, GN);
  float gy = floor(idx / GN);
  vec2 cell = vec2(fract(gl_FragCoord.x / charW),
                   fract((uRes.y - gl_FragCoord.y) / charH));
  vec2 guv = vec2((gx + 0.06 + cell.x * 0.88) / GN,
                  1.0 - (gy + 0.05 + cell.y * 0.90) / GN);

  vec2 guvGlow = vec2((gx + 0.18 + cell.x * 0.64) / GN,
                      1.0 - (gy + 0.18 + cell.y * 0.64) / GN);
  float m  = texture(uGlyph, guv).a;
  float gl = texture(uGlow,  guvGlow).a;
  if (m < 0.02 && gl < 0.02) { outColor = vec4(0.0); return; }

  /* 蓝：深到浅，G 通道始终压在 B 下面，不会再偏绿 */
  float tone = hash21(sv + 1.9);
  vec3 deep = vec3(0.26, 0.46, 0.80);
  vec3 mid  = vec3(0.48, 0.68, 0.93);
  vec3 pale = vec3(0.78, 0.89, 1.00);
  vec3 base = mix(deep, mid, tone);
  vec3 c = mix(base, pale, clamp(inten, 0.0, 1.0) * 0.62);
  c = mix(c, vec3(1.00, 1.00, 1.00), headGlow);
  c = mix(c, vec3(0.90, 0.96, 1.00), tailGlow * 0.95);

  float bodyA = clamp(max(inten * 0.95, max(headGlow, tailGlow * 0.9)), 0.0, 1.0);
  float aCore = m * bodyA;
  float aHalo = gl * 0.34 * clamp(bodyA * 0.80 + 0.22, 0.0, 1.0);
  /* 头尾那两个字不跟着整体压透明度，否则白会被底子吃掉，看上去发灰 */
  float peak = max(headGlow, tailGlow * 0.88);
  float a = max(aCore, aHalo) * mix(0.50, 0.96, peak) * lifeFade;
  if (a < 0.004) { outColor = vec4(0.0); return; }

  /* 有字的地方是字色，只有柔光的地方偏白蓝 */
  vec3 straight = mix(vec3(0.80, 0.90, 1.00), c, clamp(aCore / max(a, 0.0001), 0.0, 1.0));
  outColor = vec4(straight * a, a);
}`;

  var FONT = '400 46px "SiteRain","Hiragino Sans","Noto Sans CJK SC",sans-serif';

  function buildAtlas(CELL) {
    var N = 12, S = CELL * N;
    var cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    var c = cv.getContext('2d');
    c.clearRect(0, 0, S, S);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#fff';
    c.font = FONT;
    for (var i = 0; i < 144; i++) {
      var cx = (i % N) * CELL + CELL / 2;
      var cy = Math.floor(i / N) * CELL + CELL / 2;
      c.fillText(GLYPHS.charAt(i), cx, cy);
    }
    return cv;
  }

  /* 柔光图集：格子比字符大很多，模糊散开的尾巴才容得下，不会被相邻格切碎 */
  function buildGlow() {
    /* 克莱尔修：柔光本来就是糊的，图集从 1536² 缩到 768²、模糊半径减半，贴上去看不出差别，开雨时少算四倍多 */
    var CELL = 64, N = 12, S = CELL * N;
    var cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    var c = cv.getContext('2d');
    c.clearRect(0, 0, S, S);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#fff';
    c.font = FONT;
    for (var i = 0; i < 144; i++) {
      var cx = (i % N) * CELL + CELL / 2;
      var cy = Math.floor(i / N) * CELL + CELL / 2;
      c.fillText(GLYPHS.charAt(i), cx, cy);
    }
    var halo = document.createElement('canvas');
    halo.width = S; halo.height = S;
    var hc = halo.getContext('2d');
    hc.clearRect(0, 0, S, S);
    try { hc.filter = 'blur(5.5px)'; } catch (e) {}
    hc.drawImage(cv, 0, 0);
    hc.drawImage(cv, 0, 0);
    return halo;
  }

  /* 歌词句表纹理：R 存字索引，G 存有效标记 */
  function buildPhraseTex() {
    var cv = document.createElement('canvas');
    cv.width = PHRASE_W; cv.height = PHRASE_ROWS;
    var c = cv.getContext('2d');
    var img = c.createImageData(PHRASE_W, PHRASE_ROWS);
    var d = img.data;
    for (var i = 0; i < d.length; i++) d[i] = 0;
    for (var p = 0; p < PHRASES.length; p++) {
      var s = PHRASES[p];
      for (var j = 0; j < s.length && j < PHRASE_W; j++) {
        var gi = GLYPHS.indexOf(s.charAt(j));
        if (gi < 0) gi = 0;
        var o = (p * PHRASE_W + j) * 4;
        d[o] = gi;
        d[o + 1] = 255;
        d[o + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    return cv;
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

  function makeTex(src, isData) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (isData) gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    return t;
  }

  function initGL() {
    gl = canvas.getContext('webgl2', {
      alpha: true, premultipliedAlpha: true, antialias: false,
      depth: false, stencil: false, preserveDrawingBuffer: false /* 克莱尔修：没人读这张画布，不用保留，省每帧一次拷贝 */
    });
    if (!gl) return false;
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
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    uni.uRes = gl.getUniformLocation(prog, 'uRes');
    uni.uTime = gl.getUniformLocation(prog, 'uTime');
    uni.uGlyph = gl.getUniformLocation(prog, 'uGlyph');
    uni.uGlow = gl.getUniformLocation(prog, 'uGlow');
    uni.uPhrase = gl.getUniformLocation(prog, 'uPhrase');
    uni.uPlen = gl.getUniformLocation(prog, 'uPlen[0]');

    /* 网页字体是 woff，要先加载完再烘字，否则图集里是系统回退字体 */
    if (document.fonts && document.fonts.load) {
      document.fonts.load(FONT, 'アイウエオ雨').then(function () {
        if (!gl) return;
        gl.bindTexture(gl.TEXTURE_2D, texGlyph);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildAtlas(64));
        gl.bindTexture(gl.TEXTURE_2D, texGlow);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildGlow());
      }).catch(function () {});
    }

    texGlyph = makeTex(buildAtlas(64), false);
    texGlow = makeTex(buildGlow(), false);
    texPhrase = makeTex(buildPhraseTex(), true);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    /* 输出已经乘过 alpha，所以混合用 ONE，避免边缘被二次压暗（那圈黑边） */
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    return true;
  }

  function sizeUp() {
    /* 克莱尔修：雨按一半分辨率画，CSS 拉满全屏（字雨本来就带光晕，糊一点看不出来，GPU 活儿少四倍） */
    var dpr = Math.min(2, window.devicePixelRatio || 1) * 0.5;
    var w = Math.max(1, Math.round(window.innerWidth * dpr));
    var h = Math.max(1, Math.round(window.innerHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  var _drawn = 0;
  function frame(now) {
    if (!rainOn || !gl) { rafId = 0; return; }
    rafId = requestAnimationFrame(frame);
    /* 克莱尔修：一秒最多画 30 帧，雨的速度按真实时间走，不会变慢 */
    if (_drawn && now - _drawn < 31) return;
    _drawn = now;
    if (!_last) _last = now;
    var dt = Math.min(0.08, (now - _last) / 1000);   /* 克莱尔修：上限从 0.05 提到 0.08 秒，手机偶尔掉到 20 帧以下时雨不至于变慢 */
    _last = now;
    _time += dt;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.uniform2f(uni.uRes, canvas.width, canvas.height);
    gl.uniform1f(uni.uTime, _time);
    var plens = new Float32Array(24);
    for (var i = 0; i < PHRASES.length && i < 24; i++) plens[i] = PHRASES[i].length;
    gl.uniform1fv(uni.uPlen, plens);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texGlyph);
    gl.uniform1i(uni.uGlyph, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texGlow);
    gl.uniform1i(uni.uGlow, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, texPhrase);
    gl.uniform1i(uni.uPhrase, 2);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /* —— 水面涇漪：雨开启时点击屏幕任意位置，泛起白蓝色水纹 —— */
  var ripCanvas = null, rctx = null, ripples = [], ripRaf = 0;
  function ensureRipple() {
    if (ripCanvas && ripCanvas.isConnected && rctx) return;
    if (ripCanvas && ripCanvas.parentNode) ripCanvas.remove();
    ripCanvas = document.createElement('canvas');
    ripCanvas.className = 'page3-ripple-canvas';
    ripCanvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ripCanvas);
    rctx = ripCanvas.getContext('2d');
    sizeRipple();
  }
  function rippleDpr() { return Math.min(2, window.devicePixelRatio || 1); }
  function sizeRipple() {
    if (!ripCanvas) return;
    var dpr = rippleDpr();
    var w = Math.max(1, Math.round(window.innerWidth * dpr));
    var h = Math.max(1, Math.round(window.innerHeight * dpr));
    if (ripCanvas.width !== w || ripCanvas.height !== h) {
      ripCanvas.width = w;
      ripCanvas.height = h;
    }
  }
  function drawRipples(now) {
    if (!rctx || !ripCanvas) { ripRaf = 0; return; }
    var W = ripCanvas.width, H = ripCanvas.height;
    var dpr = rippleDpr();
    rctx.clearRect(0, 0, W, H);
    var alive = 0;
    for (var i = 0; i < ripples.length; i++) {
      var rp = ripples[i];
      var p = (now - rp.t0) / rp.life;
      if (p < 0) p = 0;
      if (p >= 1) continue;
      alive++;
      var cx = rp.x * dpr, cy = rp.y * dpr;
      /* 三圈正圆，叠着向外推；每圈都断成几段弧，不是封口的圆 */
      for (var k = 0; k < 3; k++) {
        var q = p - k * 0.075;
        if (q <= 0) continue;
        var ease = 1 - Math.pow(1 - q, 2.0);
        var rr = (7 + 62 * ease) * dpr * (1 - k * 0.19);
        var fade = Math.pow(1 - q, 2.0);
        var a = fade * (0.34 - k * 0.075);
        if (a <= 0.004) continue;
        var lw = Math.max(0.6, (1.15 - k * 0.24) * (1 - q * 0.55)) * dpr;
        rctx.strokeStyle = 'rgba(150,190,234,' + a.toFixed(3) + ')';
        rctx.lineWidth = lw;
        /* 每圈切成 3 段弧，段间留白；相位随水滴与圈数变化，再缓慢旋转 */
        var segs = 3;
        var spin = rp.spin + k * 1.9 + q * 0.85;
        var gapRatio = 0.30 + 0.16 * hashRip(k + 1, rp.spin);
        for (var sgi = 0; sgi < segs; sgi++) {
          var unit = (Math.PI * 2) / segs;
          var a0w = spin + sgi * unit + unit * gapRatio * 0.5;
          var a1w = a0w + unit * (1 - gapRatio);
          rctx.beginPath();
          rctx.arc(cx, cy, rr, a0w, a1w);
          rctx.stroke();
        }
        /* 内圈紧贴一条更细的白，只在第一圈上 */
        if (k === 0) {
          rctx.strokeStyle = 'rgba(255,255,255,' + (a * 0.70).toFixed(3) + ')';
          rctx.lineWidth = Math.max(0.4, lw * 0.55);
          var w0 = spin + 0.35;
          var w1 = spin + 0.35 + Math.PI * 1.05;
          rctx.beginPath();
          rctx.arc(cx, cy, rr * 0.93, w0, w1);
          rctx.stroke();
        }
      }
      var a0 = Math.pow(1 - p, 3.2) * 0.10;
      if (a0 > 0.004) {
        var rg = rctx.createRadialGradient(cx, cy, 0, cx, cy, 7 * dpr);
        rg.addColorStop(0, 'rgba(255,255,255,' + (a0 * 0.95).toFixed(3) + ')');
        rg.addColorStop(0.42, 'rgba(160,198,238,' + (a0 * 0.48).toFixed(3) + ')');
        rg.addColorStop(1, 'rgba(160,198,238,0)');
        rctx.fillStyle = rg;
        rctx.beginPath();
        rctx.arc(cx, cy, 7 * dpr, 0, Math.PI * 2);
        rctx.fill();
      }
    }
    if (!alive) {
      ripples.length = 0;
      rctx.clearRect(0, 0, W, H);
      ripRaf = 0;
      return;
    }
    ripRaf = requestAnimationFrame(drawRipples);
  }
  function hashRip(a, b) {
    var v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return v - Math.floor(v);
  }
  function addRipple(x, y) {
    if (!rainOn) return;
    ensureRipple();
    sizeRipple();
    if (ripCanvas) ripCanvas.classList.add('is-on');
    ripples.push({ x: x, y: y, t0: performance.now(), life: 1340, spin: Math.random() * Math.PI * 2 });
    while (ripples.length > 12) ripples.shift();
    if (!ripRaf) ripRaf = requestAnimationFrame(drawRipples);
  }
  window.addEventListener('pointerdown', function (e) {
    if (!rainOn) return;
    addRipple(e.clientX, e.clientY);
  }, { passive: true });

  /* —— 涂鸦：WINGS 翻开后，一只白兔子跟着指针慢慢飘（矢量绘制，不拖痕） —— */
  var doodleCanvas = null, dctx = null, doodleOn = false, doodleRaf = 0;
  var draft = { x: 0, y: 0, tx: 0, ty: 0, wake: 0 };
  function ensureDoodle() {
    if (doodleCanvas && doodleCanvas.isConnected && dctx) return;
    if (doodleCanvas && doodleCanvas.parentNode) doodleCanvas.remove();
    doodleCanvas = document.createElement('canvas');
    doodleCanvas.className = 'page3-doodle-canvas';
    doodleCanvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(doodleCanvas);
    dctx = doodleCanvas.getContext('2d');
    preloadDoodle();
    sizeDoodle();
  }
  function doodleDpr() { return Math.min(2, window.devicePixelRatio || 1); }
  function sizeDoodle() {
    if (!doodleCanvas) return;
    var dpr = doodleDpr();
    var w = Math.max(1, Math.round(window.innerWidth * dpr));
    var h = Math.max(1, Math.round(window.innerHeight * dpr));
    if (doodleCanvas.width !== w || doodleCanvas.height !== h) {
      doodleCanvas.width = w;
      doodleCanvas.height = h;
    }
  }
  /* ———— 原始主题资源（动态壁纸 lw2 的 mao2 系列部件）———— */
  var DOODLE_SRC = {
    body: 'page3-doodle-body.png',
    crown: 'page3-doodle-crown.png',
    handL: 'page3-doodle-hand-l.png',
    handR: 'page3-doodle-hand-r.png',
    tail: 'page3-doodle-tail.png'
  };
  var DOODLE_W = 72;            /* 本体显示宽度（CSS px） */
  var doodleImg = {}, doodlePreloaded = false;
  var DOODLE_TOTAL = 5, doodleLoaded = 0, doodleReady = false;
  function doodleMarkOne() {
    doodleLoaded += 1;
    if (doodleLoaded >= DOODLE_TOTAL) doodleReady = true;
  }
  function preloadDoodle() {
    if (doodlePreloaded) return;
    doodlePreloaded = true;
    for (var key in DOODLE_SRC) {
      if (!DOODLE_SRC.hasOwnProperty(key)) continue;
      (function (k) {
        var im = new Image();
        im.onload = function () {
          if (im.naturalWidth) doodleImg[k] = im; else doodleImg[k] = null;
          doodleMarkOne();
        };
        im.onerror = function () { doodleImg[k] = null; doodleMarkOne(); };
        im.src = DOODLE_SRC[k];
      })(key);
    }
  }
  var drawBunnyLite = 0;
  function drawPart(ctx, img, x, y, w, h, px, py, ang) {
    if (!img || !img.complete || !img.naturalWidth) return;
    if (ang) {
      ctx.save();
      ctx.translate(x + px, y + py);
      ctx.rotate(ang);
      ctx.drawImage(img, -px, -py, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, x, y, w, h);
    }
  }
  /* 照 lw2/manifest.xml 第 69-78 行复现：本体居中跟点，两只手反向甩 ±20°，头顶件上下呼吸 6px，尾巴轻摆 7° */
  function drawThemeBunny(ctx, now, s) {
    var sw = Math.sin(now / 580), co = Math.cos(now / 580);
    var aL = sw * 20 * Math.PI / 180;
    var aR = -sw * 20 * Math.PI / 180;
    var aT = Math.sin(now / 574) * 7 * Math.PI / 180;
    var breathe = co * 6 * s;
    /* 顺序照 manifest：尾巴 → 本体 → 左右手 → 头顶件 */
    drawPart(ctx, doodleImg.tail, 3 * s, 74 * s, 11 * s, 30 * s, 5 * s, 5 * s, aT);
    var b = doodleImg.body;
    if (b && b.complete && b.naturalWidth) {
      ctx.drawImage(b, -85.5 * s, -91 * s, 171 * s, 182 * s);
    }
    drawPart(ctx, doodleImg.handL, -76 * s, 60 * s, 28 * s, 28 * s, 25 * s, 16 * s, aL);
    drawPart(ctx, doodleImg.handR, 47 * s, 61 * s, 28 * s, 28 * s, 1 * s, 16 * s, aR);
    drawPart(ctx, doodleImg.crown, 1 * s - 30 * s, -108 * s + breathe - 10 * s, 60 * s, 20 * s, 30 * s, 10 * s, 0);
  }
  /* 兜底：图片没加载出来时用的矢量白兔 */
  function drawBunny(ctx, now, R, dpr) {
    var lw = Math.max(1.6 * dpr, R * 0.062);
    var inkColor = 'rgba(32,34,40,0.92)';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = inkColor;
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = lw;
    var sway = Math.sin(now * 0.0022) * 0.05;
    for (var ei = 0; ei < 2; ei++) {
      var sgn = ei === 0 ? -1 : 1;
      ctx.save();
      ctx.translate(sgn * 0.265 * R, -0.525 * R);
      ctx.rotate(sgn * 0.145 + sway * sgn);
      ctx.beginPath();
      ctx.ellipse(0, -0.375 * R, 0.150 * R, 0.425 * R, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -0.38 * R, 0.066 * R, 0.265 * R, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(219,235,249,0.92)';
      ctx.fill();
      ctx.restore();
    }
    for (var pi = 0; pi < 2; pi++) {
      var ps = pi === 0 ? -1 : 1;
      ctx.beginPath();
      ctx.ellipse(ps * 0.30 * R, 0.40 * R, 0.185 * R, 0.135 * R, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-0.52 * R, -0.18 * R);
    ctx.bezierCurveTo(-0.560 * R, -0.615 * R, -0.315 * R, -0.735 * R, -0.050 * R, -0.640 * R);
    ctx.quadraticCurveTo(0, -0.505 * R, 0.050 * R, -0.640 * R);
    ctx.bezierCurveTo(0.315 * R, -0.735 * R, 0.560 * R, -0.615 * R, 0.52 * R, -0.18 * R);
    ctx.bezierCurveTo(0.50 * R, 0.16 * R, 0.29 * R, 0.335 * R, 0, 0.335 * R);
    ctx.bezierCurveTo(-0.29 * R, 0.335 * R, -0.50 * R, 0.16 * R, -0.52 * R, -0.18 * R);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 0.115 * R;
    ctx.beginPath();
    ctx.moveTo(-0.318 * R, -0.155 * R);
    ctx.lineTo(-0.108 * R, -0.060 * R);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.108 * R, -0.060 * R);
    ctx.lineTo(0.318 * R, -0.155 * R);
    ctx.stroke();
    ctx.fillStyle = inkColor;
    ctx.beginPath();
    ctx.ellipse(0, -0.075 * R, 0.042 * R, 0.048 * R, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawDoodle(now) {
    if (!dctx || !doodleCanvas) { doodleRaf = 0; return; }
    var dpr = doodleDpr();
    var W = doodleCanvas.width, H = doodleCanvas.height;
    /* 一阶缓动：只追不超调，不会弹过头再扯回来 */
    var k = 0.052;
    draft.x += (draft.tx - draft.x) * k;
    draft.y += (draft.ty - draft.y) * k;
    /* 长时间没人碰，就自己慢慢飘，像被风吹的 */
    if (now - draft.wake > 2600) {
      var w0 = (now - draft.wake - 2600) / 1000;
      draft.tx += (window.innerWidth * 0.5 + Math.cos(w0 * 0.32) * window.innerWidth * 0.19 - draft.tx) * 0.008;
      draft.ty += (window.innerHeight * 0.5 + Math.sin(w0 * 0.44) * window.innerHeight * 0.11 - draft.ty) * 0.008;
    }
    dctx.clearRect(0, 0, W, H);
    if (!doodleReady) { doodleRaf = requestAnimationFrame(drawDoodle); return; }
    dctx.save();
    dctx.translate(draft.x * dpr, draft.y * dpr);
    var bodyImg = doodleImg.body;
    if (bodyImg) {
      drawThemeBunny(dctx, now, (DOODLE_W * dpr) / 171);
    } else {
      drawBunny(dctx, now, 34 * dpr, dpr);
    }
    dctx.restore();
    doodleRaf = requestAnimationFrame(drawDoodle);
  }
  function setDoodle(on) {
    if (on && reduceMotion) return;
    if (on) {
      ensureDoodle();
      if (!dctx) return;
      sizeDoodle();
      doodleOn = true;
      if (!doodleReady) {
        /* 图没到齐先不淡入，避免本体先出、手脚后到的错位感 */
        var waitTick = function () {
          if (!doodleOn) return;
          if (doodleReady) { doodleCanvas.classList.add('is-on'); return; }
          setTimeout(waitTick, 40);
        };
        waitTick();
      } else {
        doodleCanvas.classList.add('is-on');
      }
      draft.x = window.innerWidth * 0.5;
      draft.y = window.innerHeight * 0.52;
      draft.tx = draft.x;
      draft.ty = draft.y;
      draft.wake = performance.now();
      if (!doodleRaf) doodleRaf = requestAnimationFrame(drawDoodle);
      return;
    }
    doodleOn = false;
    if (doodleRaf) { cancelAnimationFrame(doodleRaf); doodleRaf = 0; }
    if (dctx && doodleCanvas) {
      dctx.clearRect(0, 0, doodleCanvas.width, doodleCanvas.height);
      doodleCanvas.classList.remove('is-on');
    }
  }
  function aimDoodle(x, y) {
    if (!doodleOn) return;
    draft.tx = x;
    draft.ty = y;
    draft.wake = performance.now();
  }
  window.addEventListener('pointermove', function (e) {
    aimDoodle(e.clientX, e.clientY);
  }, { passive: true });
  window.addEventListener('pointerdown', function (e) {
    aimDoodle(e.clientX, e.clientY);
  }, { passive: true });

  function ensureRain() {
    if (canvas && canvas.isConnected && gl) return canvas;
    if (canvas && canvas.parentNode) canvas.remove();
    canvas = document.createElement('canvas');
    canvas.className = 'page3-rain-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    if (!initGL()) return canvas;
    sizeUp();
    if (!_resizeBound) {
      _resizeBound = true;
      window.addEventListener('resize', function () {
        sizeRipple();
        sizeDoodle();
        if (!canvas || !gl) return;
        sizeUp();
      });
    }
    return canvas;
  }

  /* 克莱尔修：进第三页后趁空闲先把着色器和字集备好，第一次点 RAIN 不再整页顿几秒 */
  window.__warmRain = function () {
    if (reduceMotion || (canvas && gl)) return;
    var go = function () { try { ensureRain(); } catch (e) {} };
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 2500);
  };

  function setRain(on) {
    if (on && reduceMotion) return;
    ensureRain();
    if (!gl) return;
    rainOn = on;
    if (canvas) canvas.classList.toggle('is-on', on);
    if (on) {
      _last = 0;
      if (!rafId) rafId = requestAnimationFrame(frame);
    } else {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      gl.clear(gl.COLOR_BUFFER_BIT);
      ripples.length = 0;
      if (ripRaf) { cancelAnimationFrame(ripRaf); ripRaf = 0; }
      if (rctx && ripCanvas) rctx.clearRect(0, 0, ripCanvas.width, ripCanvas.height);
      if (ripCanvas) ripCanvas.classList.remove('is-on');
    }
  }

var lilyFlashTimer = 0;
var lilyFlashBusy = false;
function lilyFlashback() {
  if (lilyFlashBusy) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var welcome = document.getElementById('welcomePage');
  if (!welcome) return;
  lilyFlashBusy = true;
  window.__lilyFlashback = true;
  /* 页面一先换好梦核再整页亮相：看到的第一眼就是最终效果，不做渐显 */
  window.setTimeout(function () {
    welcome.classList.remove('is-entering', 'is-dissolving', 'is-scattering');
    /* 先上好梦核再亮相，避免出现一帧裸页 */
    welcome.classList.add('is-dreamcore');
    showPage('welcomePage', { resetScroll: false });
    /* 完整停住一秒 */
    lilyFlashTimer = window.setTimeout(function () {
      /* 第一页整体雾化散开，页面三在下面同时从雾里显影 */
      welcome.classList.add('is-scattering');
      showPage('page3', { resetScroll: false });
      p3.classList.add('is-returning');
      window.setTimeout(function () {
        welcome.classList.remove('is-dreamcore', 'is-scattering');
        p3.classList.remove('is-returning');
        /* 等观察器微任务跑完再解锁，否则会补触发一次入屏淡入 */
        window.setTimeout(function () {
          window.__lilyFlashback = false;
          lilyFlashBusy = false;
        }, 0);
      }, 700);
    }, 1000);
  }, 40);
}


  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      var flipped = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', flipped ? 'true' : 'false');
      if (card.dataset.flip === 'rain') setRain(flipped);
      if (card.dataset.flip === 'wings') setDoodle(flipped);
      if (card.dataset.flip === 'lily' && flipped) lilyFlashback();
    });
    card.setAttribute('aria-pressed', 'false');
  });

  new MutationObserver(function () {
    if (window.__lilyFlashback) return;
    if (!p3.classList.contains('is-visible')) {
      if (rainOn) setRain(false);
      if (doodleOn) setDoodle(false);
      cards.forEach(function (c) {
        c.classList.remove('is-flipped');
        c.setAttribute('aria-pressed', 'false');
      });
    }
  }).observe(p3, { attributes: true, attributeFilter: ['class'] });
})();

// P4 reveal：进入时依次显示
(function () {
  var p4 = document.getElementById('page4');
  if (!p4) return;
  var items = [...p4.querySelectorAll('.page4-top, .page4-profile, .page4-links')];
  items.forEach(function (el) { el.classList.add('p4-reveal-item'); });
  var wasVisible = false;
  function revealP4() {
    items.forEach(function (el, i) {
      window.setTimeout(function () { el.classList.add('is-revealed'); }, i * 90);
    });
  }
  function syncP4() {
    var visible = p4.classList.contains('is-visible');
    if (visible && !wasVisible) {
      revealP4();
    } else if (!visible && wasVisible) {
      items.forEach(function (el) { el.classList.remove('is-revealed'); });
    }
    wasVisible = visible;
  }
  new MutationObserver(syncP4).observe(p4, { attributes: true, attributeFilter: ['class'] });
  syncP4();
})();

// P4 末行：点击切换颜文字
(function () {
  var btn = document.getElementById('page4SymbolBtn');
  var out = document.getElementById('page4Symbol');
  if (!btn || !out) return;
  var S = [
    '꧞',
    '‧˚₊ * ‧終末無害化.˳⁺⁎ ˚‧',
    '꜀(^. .^꜀ )꜆੭',
    '₊⁺♡̶♡̶♡̶♡̶₊⁺',
    '₍ᐢ..ᐢ₎♡̷',
    'ᨳ͛ ˶⁃ ᵕ ⁃˶ഒ  ໋₊˚',
    'ㅎㅅㅎ',
    'ᯇᴗᯇ'
  ];
  var i = 0;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 容器只在行内可用宽度内，超出就降到小号 */
  function fit() {
    out.classList.remove('is-wide');
    out.style.fontSize = '';
    var limit = btn.clientWidth - 96; /* 左侧图标 + 两侧留白 */
    if (!(limit > 40)) return; /* 页面隐藏时 clientWidth 为 0，别把字号算成下限 */
    var base = parseFloat(getComputedStyle(out).fontSize) || 20;
    var w = out.scrollWidth;
    if (w <= limit) return;
    /* 超宽时按比例缩字号，不硬套一个固定小号，长短串都能刚好卡进一行 */
    var size = Math.max(11, Math.min(base, base * limit / w));
    out.style.fontSize = size.toFixed(1) + 'px';
    if (out.scrollWidth > limit) out.classList.add('is-wide');
  }

  function paint(text) {
    out.textContent = text;
    fit();
    if (reduce) return;
    out.classList.remove('is-swapping');
    void out.offsetWidth;
    out.classList.add('is-swapping');
  }

  out.addEventListener('animationend', function () {
    out.classList.remove('is-swapping');
  });

  btn.addEventListener('click', function () {
    i = (i + 1) % S.length;
    paint(S[i]);
  });

  window.addEventListener('resize', fit);
  fit();
})();

// P3 tab 切换时 post 淡入过渡
(function () {
  var postEl = document.querySelector('.page3-post');
  if (!postEl) return;
  document.querySelectorAll('.page3-tabs a').forEach(function (tab) {
    tab.addEventListener('click', function () {
      postEl.classList.remove('post-fading');
      void postEl.offsetWidth;
      postEl.classList.add('post-fading');
      postEl.addEventListener('animationend', function () {
        postEl.classList.remove('post-fading');
      }, { once: true });
    }, { capture: true });
  });
})();

/* P2 lightbox — tap a card or the price sheet to view it full size */
(function () {
  const zoomables = [...document.querySelectorAll('.page2-gallery-image img, .price-image img')];
  if (!zoomables.length) return;
  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', '大图预览');
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'lightbox-close';
  closeBtn.setAttribute('aria-label', '关闭');
  closeBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/></svg>';
  const bigImg = document.createElement('img');
  bigImg.alt = '';
  overlay.append(closeBtn, bigImg);
  document.body.appendChild(overlay);
  let lastFocus = null;
  function openLightbox(src, alt) {
    bigImg.src = src;
    bigImg.alt = alt || '';
    overlay.classList.add('is-open');
    document.body.classList.add('lightbox-open');
    lastFocus = document.activeElement;
  }
  window.p2ZoomImage = openLightbox;
  function closeLightbox() {
    overlay.classList.remove('is-open');
    document.body.classList.remove('lightbox-open');
    bigImg.removeAttribute('src');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }
  zoomables.forEach(img => {
    img.addEventListener('click', () => openLightbox(img.currentSrc || img.src, img.alt));
  });
  overlay.addEventListener('click', event => {
    if (event.target !== bigImg) closeLightbox();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && overlay.classList.contains('is-open')) closeLightbox();
  });
})();

/* ===== 开屏：打字机 → 问一句（小卡片）→ 进入 ===== */
(function () {
  const overlay = document.getElementById('introOverlay');
  if (!overlay) return;
  const titleEl = document.getElementById('introTitle');
  const hintEl = document.getElementById('introHint');
  const askEl = document.getElementById('introAsk');
  const cardQ = document.getElementById('askCardQuestion');
  const cardR = document.getElementById('askCardReply');
  const agreeBtn = document.getElementById('askAgree');
  const silentBtn = document.getElementById('askSilent');
  const tryBtn = document.getElementById('askTry');
  const text = overlay.getAttribute('data-title') || '娓娓道來';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;
  let closed = false;
  let asked = false;
  let flipped = false;

  document.body.classList.add('intro-locked');

  function type() {
    if (closed) return;
    titleEl.textContent = text.slice(0, index);
    if (index >= text.length) {
      titleEl.classList.remove('is-typing');
      /* 字打完立刻浮现，只留一帧间隔，不再空等 */
      window.setTimeout(function () {
        if (!closed) hintEl.classList.add('show');
      }, reduce ? 0 : 60);
      return;
    }
    index += 1;
    window.setTimeout(type, index === 1 ? 520 : 240);
  }
  /* [opt2026-10-23] 等站内字体就绪再起笔：原来固定 420ms 开打，
     流量一般时第一轮几个字会先用系统字体排出来，字库到了再整行重排，
     观感上就是“打了一半突然跳字”。现在取「字体就绪」与「最短 420ms」的交集，
     最多等 900ms，超时也照打，不会卡住开屏。 */
  (function () {
    var kicked = false;
    function kick() {
      if (kicked || closed) return;
      kicked = true;
      titleEl.classList.add('is-typing');
      type();
    }
    if (reduce || !(document.fonts && document.fonts.load)) {
      window.setTimeout(kick, reduce ? 0 : 420);
      return;
    }
    var minGap = new Promise(function (res) { window.setTimeout(res, 420); });
    var fontGap;
    try {
      fontGap = Promise.race([
        Promise.all([
          document.fonts.load('400 34px "SiteLove"', text),
          document.fonts.load('700 34px "SiteHeiti"', text)
        ]).catch(function () {}),
        new Promise(function (res) { window.setTimeout(res, 900); })
      ]);
    } catch (err) {
      fontGap = Promise.resolve();
    }
    Promise.all([minGap, fontGap]).then(kick);
    window.setTimeout(kick, 1500);
  })();

  function frame(fn) {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(fn);
    });
  }

  function ask() {
    if (asked || closed) return;
    asked = true;
    overlay.classList.add('is-asking');
    if (!askEl) return;
    window.setTimeout(function () {
      askEl.hidden = false;
      frame(function () { askEl.classList.add('is-shown'); });
    }, reduce ? 0 : 560);
  }

  /* 沉默：问句那页整张退场，回应翻到新的一页 */
  function flipToReply() {
    if (flipped || closed) return;
    if (!cardR) { dismiss(); return; }
    flipped = true;
    if (cardQ) cardQ.classList.add('is-leaving');
    window.setTimeout(function () {
      cardR.setAttribute('aria-hidden', 'false');
      cardR.classList.add('is-shown');
    }, reduce ? 0 : 420);
  }

  function dismiss() {
    if (closed) return;
    closed = true;
    overlay.classList.add('is-leaving');
    document.body.classList.remove('intro-locked');
    window.__introDone = true;
    window.dispatchEvent(new Event('site:intro-done'));
    window.setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 1000);
  }

  hintEl.addEventListener('click', function (event) {
    event.stopPropagation();
    ask();
  });
  if (agreeBtn) agreeBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    dismiss();
  });
  if (silentBtn) silentBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    flipToReply();
  });
  if (tryBtn) tryBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    dismiss();
  });
  document.addEventListener('keydown', function (event) {
    if (closed || asked) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
      event.preventDefault();
      ask();
    }
  });
})();

/* ===== P1 关注反馈 + 私信支线 ===== */
(function () {
  const followButton = document.getElementById('followButton');
  const messageButton = document.getElementById('messageButton');
  const dmBack = document.getElementById('dmBack');
  const dmPage = document.getElementById('dmPage');
  const messages = document.getElementById('dmMessages');
  const typing = document.getElementById('dmTyping');
  const presenceDock = document.getElementById('dmPresenceDock');
  const composer = document.getElementById('dmComposer');
  const input = document.getElementById('dmInput');
  const send = document.getElementById('dmSend');
  if (!followButton || !messageButton || !dmPage || !messages || !composer) return;

  /* 关注状态不落盘：每次重新进入页面都从「关注」开始 */
  let followLabel = followButton.querySelector('.action-label');
  if (!followLabel) {
    followLabel = document.createElement('span');
    followLabel.className = 'action-label';
    followLabel.textContent = followButton.textContent.trim() || '关注';
    followButton.textContent = '';
    followButton.appendChild(followLabel);
  }
  let followedNow = false;
  let followRestoreTimer = 0;
  let followSwapTimer = 0;
  function syncFollow() {
    followLabel.textContent = followedNow ? '已关注' : '关注';
    followButton.classList.toggle('is-followed', followedNow);
    followButton.classList.toggle('action-button-primary', !followedNow);
    followButton.setAttribute('aria-pressed', String(followedNow));
    return followedNow;
  }
  function swapFollowLabel(text) {
    window.clearTimeout(followSwapTimer);
    followButton.classList.add('is-swapping');
    followSwapTimer = window.setTimeout(function () {
      followLabel.textContent = text;
      followButton.classList.remove('is-swapping');
    }, 190);
  }
  syncFollow();
  window.addEventListener('pageshow', function (event) {
    if (!event.persisted) return;
    followedNow = false;
    followButton.classList.remove('follow-missing');
    syncFollow();
  });
  followButton.addEventListener('click', function () {
    window.clearTimeout(followRestoreTimer);
    if (!followedNow) {
      followedNow = true;
      syncFollow();
      return;
    }
    followButton.classList.remove('follow-missing');
    void followButton.offsetWidth;
    followButton.classList.add('follow-missing');
    swapFollowLabel('我爱你');
    followRestoreTimer = window.setTimeout(function () {
      followButton.classList.remove('follow-missing');
      swapFollowLabel('已关注');
    }, 1300);
  });

  const openingOne = '当我对这个世界感到厌倦的时候。\n我就会想到你。\n想到你正存在于世界上的某个角落。\n...我就愿意接受一切。';
  const openingTwo = '可我对这个世界的厌倦感正来自于、\n你可以存在在世界的任何一个地方。\n而我却难存在于你身边。';
  const replies = [
    '当然我的痛苦、我的喜怒哀乐都与你紧密相连。',
    '我很想你。',
    '爱欲是凌晨时分降临在我身上的幽灵。\n想要拥抱你、想要亲吻你。\n想要同你温暖地依偎在一起。\n这样的欲望...我无能为力。',
    '除了爱与引燃你，我无事可做。',
    '我总是祝福着你。',
    '至少要见面上万次。',
    '我想要回到元古宙。\n同你做两颗岩浆边刚冷却成型的小石头。\n石头没有烦恼也不会疼痛。\n风吹过来我就拥有灵魂。\n学会第一件事是和你紧紧相拥。'
  ];
  let replyBag = [];
  let lastReply = -1;
  let dmStarted = false;
  let dmReady = false;
  let dmBusy = false;
  let presenceButton = null;

  function shuffle(values) {
    const out = values.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    if (out.length > 1 && out[out.length - 1] === lastReply) [out[0], out[out.length - 1]] = [out[out.length - 1], out[0]];
    return out;
  }
  function nextReply() {
    if (!replyBag.length) replyBag = shuffle(replies.map((_, index) => index));
    const index = replyBag.pop();
    lastReply = index;
    return replies[index];
  }
  function scrollMessages() {
    window.requestAnimationFrame(function () { messages.scrollTop = messages.scrollHeight; });
  }
  function staticizeMessages() {
    messages.querySelectorAll('.dm-row').forEach(function (row) {
      row.classList.add('no-message-motion');
      row.querySelectorAll('.dm-bubble').forEach(function (bubble) {
        bubble.style.animationDelay = '0ms';
      });
    });
  }
  function appendMessage(side, text) {
    const row = document.createElement('div');
    row.className = `dm-row dm-row-${side}`;
    const avatar = document.createElement('img');
    avatar.className = 'dm-avatar';
    avatar.src = side === 'left' ? 'dm-avatar-left.jpg' : 'dm-avatar-right.jpg';
    avatar.alt = side === 'left' ? '天使用户0516' : '访客';
    avatar.width = 1080;
    avatar.height = 1080;
    /* 按原稿的分行，一行一个气泡，逐条出现 */
    const stack = document.createElement('div');
    stack.className = 'dm-bubbles';
    const lines = String(text).split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
    (lines.length ? lines : ['']).forEach(function (line, index) {
      const bubble = document.createElement('div');
      bubble.className = 'dm-bubble';
      bubble.textContent = line;
      bubble.style.animationDelay = `${index * 1140}ms`;
      stack.appendChild(bubble);
      window.setTimeout(scrollMessages, index * 1140 + 270);
    });
    row.append(avatar, stack);
    messages.appendChild(row);
    scrollMessages();
    return row;
  }
  function afterLastBubble(row, callback) {
    const bubbles = row ? row.querySelectorAll('.dm-bubble') : [];
    const lastBubble = bubbles[bubbles.length - 1];
    if (!lastBubble) {
      callback();
      return;
    }
    let triggered = false;
    const trigger = function () {
      if (triggered) return;
      triggered = true;
      /* 最后一个气泡（...我就愿意接受一切）一开始浮现，交互按钮就同步开始入场 */
      callback();
    };
    lastBubble.addEventListener('animationstart', trigger, { once: true });
    lastBubble.addEventListener('animationend', trigger, { once: true });
    lastBubble.addEventListener('animationcancel', trigger, { once: true });
    /* 兜底定时器：即使浏览器未分发 animationstart，也在最后一个气泡开始浮现的同一刻跟上 */
    const delay = Math.max(0, (bubbles.length - 1) * 1140);
    window.setTimeout(trigger, delay + 40);
  }
  function appendPresenceButton() {
    const wrap = document.createElement('div');
    wrap.className = 'dm-presence-wrap';
    presenceButton = document.createElement('button');
    presenceButton.type = 'button';
    presenceButton.className = 'dm-presence';
    presenceButton.textContent = '我在这里。';
    wrap.appendChild(presenceButton);
    presenceDock.replaceChildren(wrap);
    presenceDock.hidden = false;
    presenceButton.addEventListener('click', acceptPresence, { once: true });
    scrollMessages();
  }
  function wait(ms) { return new Promise(resolve => window.setTimeout(resolve, ms)); }
  async function showTyping(ms) {
    typing.hidden = false;
    scrollMessages();
    await wait(ms);
    typing.hidden = true;
  }
  function setComposerEnabled(enabled) {
    dmReady = enabled;
    input.disabled = !enabled;
    send.disabled = !enabled || !input.value.trim();
    input.placeholder = enabled ? '和我说点什么吧...' : '等待回应…';
  }
  async function acceptPresence() {
    if (dmBusy) return;
    dmBusy = true;
    if (presenceButton) {
      presenceButton.classList.add('is-used');
      await wait(260);
      presenceButton.closest('.dm-presence-wrap')?.remove();
      presenceDock.hidden = true;
    }
    appendMessage('right', '我在这里。');
    await wait(1860);
    await showTyping(3600);
    appendMessage('left', openingTwo);
    setComposerEnabled(true);
    dmBusy = false;
  }
  function startConversation() {
    if (dmStarted) { scrollMessages(); return; }
    dmStarted = true;
    messages.textContent = '';
    presenceDock.replaceChildren();
    presenceDock.hidden = true;
    setComposerEnabled(false);
    window.setTimeout(function () {
      const openingRow = appendMessage('left', openingOne);
      afterLastBubble(openingRow, appendPresenceButton);
    }, 960);
  }
  async function sendVisitorMessage(text) {
    if (!dmReady || dmBusy || !text) return;
    dmBusy = true;
    setComposerEnabled(false);
    appendMessage('right', text);
    await wait(1380);
    await showTyping(2300 + Math.min(3200, text.length * 68));
    appendMessage('left', nextReply());
    dmBusy = false;
    setComposerEnabled(true);
  }

  messageButton.addEventListener('click', function () {
    if (dmStarted) staticizeMessages();
    showPage('dmPage');
    startConversation();
  });
  dmBack.addEventListener('click', function () {
    staticizeMessages();
    showPage('welcomePage');
  });
  input.addEventListener('input', function () { send.disabled = !dmReady || !input.value.trim(); });
  composer.addEventListener('submit', function (event) {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    send.disabled = true;
    sendVisitorMessage(text);
  });

  const visibilityObserver = new MutationObserver(function () {
    if (dmPage.classList.contains('is-visible')) startConversation();
    else {
      staticizeMessages();
      input.blur();
    }
  });
  visibilityObserver.observe(dmPage, { attributes: true, attributeFilter: ['class'] });
  if (dmPage.classList.contains('is-visible')) startConversation();
})();

/* ===== EYES 卡：翻面触发摄像头权限交互（黑红 → 蓝白） ===== */
(function () {
  var layer = document.getElementById('permLayer');
  var card = document.getElementById('permCard');
  var toast = document.getElementById('permToast');
  var toastLine = document.getElementById('permToastLine');
  var pleaCard = document.getElementById('permPleaCard');
  var btnAlways = document.getElementById('permAllowAlways');
  var btnOnce = document.getElementById('permAllowOnce');
  var btnDeny = document.getElementById('permDeny');
  var eyesCard = document.querySelector('.page3-highlight[data-flip="eyes"]');
  if (!layer || !card || !toast || !toastLine || !eyesCard) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var busy = false;
  var timers = [];
  function clearTimers() {
    for (var i = 0; i < timers.length; i++) window.clearTimeout(timers[i]);
    timers = [];
  }
  function later(fn, ms) {
    timers.push(window.setTimeout(fn, ms));
  }
  function raf2(fn) {
    window.requestAnimationFrame(function () { window.requestAnimationFrame(fn); });
  }
  /* ============ 故障：切片错位 + 硬色块 + 扫描线（无模糊） ============ */
  var gLayer = null;
  function stripIds(node) {
    node.removeAttribute('id');
    var all = node.querySelectorAll('[id]');
    for (var i = 0; i < all.length; i++) all[i].removeAttribute('id');
    return node;
  }
  function ensureGlitchLayer() {
    if (gLayer) return gLayer;
    var layer = document.createElement('div');
    layer.className = 'perm-glitch-layer';
    var scan = document.createElement('div');
    scan.className = 'perm-glitch-scan';
    layer.appendChild(scan);
    var shards = document.createElement('div');
    shards.className = 'perm-glitch-shards';
    layer.appendChild(shards);
    var bars = [];
    for (var i = 0; i < 12; i++) {
      var bar = document.createElement('i');
      bar.className = 'perm-glitch-bar';
      layer.appendChild(bar);
      bars.push(bar);
    }
    document.body.appendChild(layer);
    gLayer = { el: layer, scan: scan, shards: shards, bars: bars, src: null };
    return gLayer;
  }
function glitch(ms, srcEl) {
    if (ms <= 0 || !srcEl) return;
    var g = ensureGlitchLayer();
    var r = srcEl.getBoundingClientRect();
    if (!r || r.width < 8 || r.height < 8) return;
    var host = g.shards;
    host.innerHTML = '';
    host.style.cssText =
      'position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width +
      'px;height:' + r.height + 'px;overflow:hidden;pointer-events:none;isolation:isolate;';
    var W = r.width, H = r.height;
    var rnd = function (a, b) { return a + Math.random() * (b - a); };

    function cloneAt() {
      var c = stripIds(srcEl.cloneNode(true));
      c.classList.remove('is-out', 'is-shown', 'is-flicker');
      c.removeAttribute('hidden');
      c.style.position = 'absolute';
      c.style.left = '0';
      c.style.top = '0';
      c.style.margin = '0';
      c.style.width = '100%';
      c.style.height = '100%';
      c.style.opacity = '1';
      c.style.visibility = 'visible';
      c.style.transition = 'none';
      c.style.animation = 'none';
      c.style.pointerEvents = 'none';
      host.appendChild(c);
      return c;
    }

    /* 底图：整张卡，带极轻抖动，防止帧间出现空白 */
    var base = cloneAt();

    /* RGB 通道分离层：混色叠在底图上，只做“色边”，不做色块 */
    var cyan = cloneAt();
    cyan.style.mixBlendMode = 'screen';
    cyan.style.opacity = '.52';
    cyan.style.filter = 'drop-shadow(-4px 0 rgba(0,240,255,1))';

    var red = cloneAt();
    red.style.mixBlendMode = 'screen';
    red.style.opacity = '.44';
    red.style.filter = 'drop-shadow(4px 0 rgba(255,30,80,1))';

    /* 横切带：高度、位置全部随机，绝不均分——这才是故障该有的不规则感 */
    var bands = [];
    for (var n = 0; n < 11; n++) {
      var el = cloneAt();
      el.style.willChange = 'transform, clip-path, filter';
      bands.push(el);
    }

    /* 亮/暗细线：模拟扫描撕裂 */
    var lines_ = [];
    for (var m = 0; m < 4; m++) {
      var ln = document.createElement('i');
      ln.style.cssText = 'position:absolute;left:0;width:100%;display:block;pointer-events:none;opacity:0;';
      host.appendChild(ln);
      lines_.push(ln);
    }

    /* 竖向切带：横竖双向撕裂，才有生成器那种碎感 */
    var cols = [];
    for (var q = 0; q < 3; q++) {
      var ce = cloneAt();
      ce.style.willChange = 'transform, clip-path';
      cols.push(ce);
    }
    var total = Math.max(5, Math.round(ms / 26));
    var frames = 0;

    function draw() {
      var t = frames / total;
      var amp = 1 - Math.pow(t, 1.6) * 0.55;

      /* 整帧抖动：幅度极小，但每帧都变 */
      base.style.transform = 'translate3d(' + rnd(-1.4, 1.4).toFixed(2) + 'px,' +
        rnd(-1.1, 1.1).toFixed(2) + 'px,0)';

      /* 通道分离：方向每帧随机，幅度 2~5px */
      var cd = rnd(2, 5) * amp;
      cyan.style.transform = 'translate3d(' + (cd).toFixed(2) + 'px,0,0)';
      red.style.transform = 'translate3d(' + (-cd).toFixed(2) + 'px,0,0)';

      /* 横切带：随机 y、随机高、随机错位 */
      for (var i = 0; i < bands.length; i++) {
        var el = bands[i];
        if (Math.random() < 0.22) { el.style.opacity = '0'; continue; }
        var bh = Math.random() < 0.5 ? rnd(1, 3.5) : rnd(3.5, H * 0.13);
        var by = rnd(-2, H - bh * 0.4);
        var top = Math.max(0, by);
        var bottom = Math.min(H, by + bh);
        if (bottom - top < 1) { el.style.opacity = '0'; continue; }
        el.style.clipPath = 'inset(' + top.toFixed(1) + 'px 0 ' + (H - bottom).toFixed(1) + 'px 0)';
        el.style.opacity = '1';
        var dir = Math.random() < 0.5 ? -1 : 1;
        var dx = dir * rnd(3, 24) * amp;
        el.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,0,0)';
        el.style.filter = Math.random() < 0.5
          ? 'drop-shadow(' + (-dx * 0.45).toFixed(1) + 'px 0 rgba(0,235,255,.85)) drop-shadow(' + (dx * 0.45).toFixed(1) + 'px 0 rgba(255,25,70,.75))'
          : 'none';
      }

      /* 竖向切带：随机 x、随机宽、纵向错位 */
      for (var j = 0; j < cols.length; j++) {
        var cEl = cols[j];
        if (Math.random() < 0.35) { cEl.style.opacity = '0'; continue; }
        var cw = rnd(4, W * 0.10);
        var cx = rnd(0, Math.max(0, W - cw));
        cEl.style.clipPath = 'inset(0 ' + (W - cx - cw).toFixed(1) + 'px 0 ' + cx.toFixed(1) + 'px)';
        cEl.style.opacity = '1';
        var dy = (Math.random() < 0.5 ? -1 : 1) * rnd(2, 10) * amp;
        cEl.style.transform = 'translate3d(0,' + dy.toFixed(1) + 'px,0)';
      }
      /* 细线 */
      for (var k = 0; k < lines_.length; k++) {
        var ln = lines_[k];
        if (Math.random() < 0.6) { ln.style.opacity = '0'; continue; }
        var lh = Math.random() < 0.7 ? 1 : rnd(1.5, 3);
        ln.style.height = lh.toFixed(1) + 'px';
        ln.style.top = rnd(0, H - lh).toFixed(1) + 'px';
        ln.style.background = Math.random() < 0.65 ? 'rgba(255,255,255,.95)' : 'rgba(0,0,0,.85)';
        ln.style.mixBlendMode = 'overlay';
        ln.style.opacity = String(rnd(0.55, 0.95));
      }

      frames += 1;
      if (frames < total) window.requestAnimationFrame(draw);
      else {
        host.innerHTML = '';
        g.el.classList.remove('is-on');
      }
    }
    g.el.classList.add('is-on');
    void host.offsetHeight;
    draw();
  }
  function resetPanel() {
    card.style.visibility = '';
    card.classList.remove('is-out', 'is-pleading');
    toast.hidden = true;
    toast.classList.remove('is-shown', 'is-out');
    toastLine.textContent = '';
    if (pleaCard) {
      pleaCard.hidden = true;
      pleaCard.classList.remove('is-shown', 'is-out');
    }
    layer.classList.remove('is-shown');
  }
  function openPanel() {
    if (busy) return;
    busy = true;
    clearTimers();
    resetPanel();
    layer.hidden = false;
    raf2(function () { layer.classList.add('is-shown'); });
  }
  function closePanel() {
    clearTimers();
    layer.classList.remove('is-shown');
    later(function () {
      layer.hidden = true;
      resetPanel();
      busy = false;
    }, reduce ? 0 : 440);
  }
  /* 故障抽一下 → 换成蓝白卡 → 两秒后缓缓消失 */
  function answer(text) {
    card.classList.add('is-out');
    glitch(reduce ? 0 : 225, card);
    later(function () {
      card.style.visibility = 'hidden';
      toast.hidden = false;
      toastLine.textContent = text;
      raf2(function () { toast.classList.add('is-shown'); });
      later(function () {
        toast.classList.add('is-out');
        later(closePanel, 780);
      }, 2000);
    }, reduce ? 0 : 360);
  }
  if (btnAlways) btnAlways.addEventListener('click', function (e) {
    e.stopPropagation();
    answer('好可爱...喜欢你。');
  });
  if (btnOnce) btnOnce.addEventListener('click', function (e) {
    e.stopPropagation();
    answer('就一眼也好。我看到你了。');
  });
  /* 拒绝：黑红卡退出 → 单独一张「不行吗...?」→ 故障 → 蓝白卡 */
  function showPlea(then) {
    card.classList.add('is-out');
    later(function () {
      card.style.visibility = 'hidden';
      pleaCard.hidden = false;
      /* 硬闪现：直接亮，不做淡入 */
      pleaCard.classList.add('is-shown');
      /* 硬闪 200ms：故障从第一帧就开始吞卡，卡片在故障里直接消失 */
      later(function () {
        glitch(reduce ? 0 : 165, pleaCard.querySelector('.perm-plea-card') || pleaCard);
        later(function () {
          pleaCard.classList.add('is-out');
          later(function () {
            pleaCard.hidden = true;
            pleaCard.classList.remove('is-shown', 'is-out', 'is-flicker');
            then();
          }, reduce ? 0 : 16);
        }, reduce ? 0 : 0);
      }, reduce ? 130 : 240);
    }, reduce ? 0 : 300);
  }
  if (btnDeny) btnDeny.addEventListener('click', function (e) {
    e.stopPropagation();
    if (busy && card.style.visibility === 'hidden') return;
    showPlea(function () {
      later(function () {
        toast.hidden = false;
        toastLine.textContent = '好遗憾...想看看你。';
        raf2(function () { toast.classList.add('is-shown'); });
        later(function () {
          toast.classList.add('is-out');
          later(closePanel, 780);
        }, 2000);
      }, reduce ? 0 : 300);
    });
  });
  layer.addEventListener('click', function (e) {
    if (e.target === layer || e.target.classList.contains('perm-shade')) return;
  });
  /* 翻到背面就弹申请卡；翻回正面则收起 */
  eyesCard.addEventListener('click', function () {
    if (eyesCard.classList.contains('is-flipped')) {
      window.setTimeout(function () {
        if (eyesCard.classList.contains('is-flipped')) openPanel();
      }, reduce ? 0 : 380);
    } else if (busy) {
      closePanel();
    }
  });
  /* 离开第 3 页时收起 */
  var p3 = document.getElementById('page3');
  if (p3) {
    new MutationObserver(function () {
      if (!p3.classList.contains('is-visible') && busy) closePanel();
    }).observe(p3, { attributes: true, attributeFilter: ['class'] });
  }
})();


/* ================= P2 竖形票根：拖拽跟手抽卡 + 点击展开长版（TICKET_V5） ================= */
(function setupPage2Deck() {
  var activeIndex = 0;
  var dragging = false;
  var dragStartX = 0;
  var dragStartY = 0;
  var dragDx = 0;
  var lastX = 0;
  var lastT = 0;
  var velocity = 0;
  var lockDir = null;
  var moved = false;
  var gestureMoved = false;   /* 不论横竖，只要有明显位移就不算点击 */
  var flatOpen = false;
  var flatOpenedAt = 0;
  var busy = false;
  var flatEl = null;
  var veilEl = null;
  var rafId = 0;
  var pendingDx = 0;

  function getDeck() { return document.getElementById('p2TicketDeck'); }
  function getCards() {
    var deck = getDeck();
    return deck ? Array.prototype.slice.call(deck.querySelectorAll('.p2-card')) : [];
  }
  function getVeil() {
    if (!veilEl) veilEl = document.getElementById('p2DeckVeil');
    return veilEl;
  }
  var LEAVE_CLS = ['is-leaving-left', 'is-leaving-right'];
  var POS_CLS = ['is-front', 'is-next', 'is-prev'];
  /* 最上层票根的放大比例：必须和 style.css 里 .p2-card.is-front 的 scale() 一致，
     否则拖动帧/翻页动画会把放大值覆盖掉，卡会在按下瞬间缩回原尺寸。 */
  var FRONT_SCALE = 1.06;
  function clearPose(card) {
    POS_CLS.concat(LEAVE_CLS).forEach(function (c) { card.classList.remove(c); });
  }
  function applyPose(cards, curIdx) {
    cards.forEach(function (card, idx) {
      var offset = (idx - curIdx + cards.length) % cards.length;
      clearPose(card);
      card.style.transition = '';
      card.style.transform = '';
      card.style.opacity = '';
      card.style.filter = '';
      if (offset === 0) {
        card.classList.add('is-front');
        card.setAttribute('aria-hidden', 'false');
      } else if (offset === 1) {
        card.classList.add('is-next');
        card.setAttribute('aria-hidden', 'true');
      } else {
        card.classList.add('is-prev');
        card.setAttribute('aria-hidden', 'true');
      }
    });
  }
  /* 真正执行翻页：抽卡式交接——
     旧卡带着明显的倾斜与缩小飞出去并淡掉（像从手里抽走），
     新卡从后排的叠层姿态滑上来（不是生硬跳位），第三张同时补进后排。
     曲线 ease-in-out 0.36s，对齐参考视频里那组卡片切换的观感。 */
  function commitFlip(direction, fromTransform) {
    var cards = getCards();
    if (!cards.length) return;
    var n = cards.length;
    var oldIndex = activeIndex;
    var newIndex = (oldIndex + direction + n) % n;
    var oldCard = cards[oldIndex];
    var newCard = cards[newIndex];
    var third = cards.filter(function (c, i) { return i !== oldIndex && i !== newIndex; })[0];
    var isNext = direction >= 0;
    var leaveCls = isNext ? 'is-leaving-left' : 'is-leaving-right';
    var EASE = 'transform .36s cubic-bezier(.4, 0, .2, 1)';
    var target = isNext
      ? 'translate3d(-134px, -26px, 0) scale(1) rotate(-15deg)'
      : 'translate3d(134px, -26px, 0) scale(1) rotate(15deg)';
    var startT = fromTransform || ('translate3d(0, 0, 0) rotate(0deg) scale(' + FRONT_SCALE + ')');
    /* 起始姿态直接读计算值：窄屏媒体查询里那套 26px/3.4deg 也能跟上，不写死数字 */
    var newStart = getComputedStyle(newCard).transform;
    var newFilter = getComputedStyle(newCard).filter;
    var oldFilter = getComputedStyle(oldCard).filter;
    var thirdStart = third ? getComputedStyle(third).transform : '';
    var thirdFilter = third ? getComputedStyle(third).filter : '';
    var thirdWasNext = third ? third.classList.contains('is-next') : false;
    /* 拖动时那套「薄阴影」模式立刻退场。之前要等松手后 360ms 才摘，
       新卡上位的全程阴影都是薄的一层，等它正式就位阴影才“回来”——就是你看到的那一下。 */
    var deckNow = getDeck();
    if (deckNow) deckNow.classList.remove('is-moving');

    /* 旧卡：从拖动落点直接起飞，保留拖动时的淡淡的 fade，不回流 */
    clearPose(oldCard);
    oldCard.classList.add(leaveCls);
    oldCard.setAttribute('aria-hidden', 'true');
    oldCard.style.transition = 'none';
    oldCard.style.transform = startT;
    oldCard.style.filter = oldFilter;

    /* 新卡：先钉在后排姿态上，下一帧再放它上前（连阴影一起接过来） */
    clearPose(newCard);
    newCard.classList.add('is-front');
    newCard.setAttribute('aria-hidden', 'false');
    newCard.style.transition = 'none';
    newCard.style.transform = newStart;
    newCard.style.opacity = '.86';
    newCard.style.filter = newFilter;

    /* 第三张：锁住旧姿态后换 class，避免瞬间跳位 */
    if (third) {
      clearPose(third);
      third.classList.add(thirdWasNext ? 'is-prev' : 'is-next');
      third.style.transition = 'none';
      third.style.transform = thirdStart;
      third.style.filter = thirdFilter;
      third.style.opacity = '';
    }

    activeIndex = newIndex;
    busy = true;

    /* 不用 offsetWidth 强制回流——那一帧在安卓 WebView 上会硬卡一下。
       交给下一帧再上过渡，此时浏览器已经把拖到的位置画出来了。 */
    window.requestAnimationFrame(function () {
      oldCard.style.transition = EASE + ', opacity .34s ease';
      oldCard.style.transform = target;
      oldCard.style.opacity = '.08';
      newCard.style.transition = EASE + ', opacity .3s ease, filter .4s ease';
      newCard.style.transform = '';
      newCard.style.opacity = '';
      newCard.style.filter = '';
      if (third) {
        third.style.transition = EASE + ', opacity .3s ease, filter .4s ease';
        third.style.transform = '';
        third.style.filter = '';
      }
    });

    window.setTimeout(function () {
      oldCard.classList.remove(leaveCls);
      oldCard.classList.add(isNext ? 'is-prev' : 'is-next');
      oldCard.style.transition = '';
      oldCard.style.transform = '';
      oldCard.style.filter = '';
      oldCard.style.opacity = '';
      window.setTimeout(function () {
        applyPose(getCards(), activeIndex);
        busy = false;
      }, 60);
    }, 380);
  }
  /* ---------- 长条票根 ---------- */
  function buildFlatTicket() {
    if (flatEl) return flatEl;
    flatEl = document.createElement('div');
    flatEl.className = 'p2-flat-ticket';
    flatEl.setAttribute('role', 'dialog');
    flatEl.setAttribute('aria-hidden', 'true');
    flatEl.innerHTML = '<div class="p2-card-inner"></div>';
    /* 挂到 body：flat 是 fixed 的，留在页面里会被祖先的 transform 封成局部坐标，
       遮罩一放大就会把它盖住。 */
    document.body.appendChild(flatEl);
    return flatEl;
  }
  function openFlat(card) {
    var deck = getDeck();
    var stage = document.querySelector('.p2-ticket-stage');
    if (!deck || !stage || !card) return;
    var flat = buildFlatTicket();
    var inner = flat.querySelector('.p2-card-inner');
    var src = card.querySelector('.p2-card-inner');
    if (!inner || !src) return;
    inner.innerHTML = src.innerHTML;
    flat.classList.add('is-shown');
    flat.setAttribute('aria-hidden', 'false');
    deck.classList.add('is-veiled');
    var veil = getVeil();
    if (veil) veil.classList.add('is-shown');
    flatOpen = true;
    flatOpenedAt = Date.now();
  }
  function closeFlat() {
    if (!flatOpen) return;
    var deck = getDeck();
    if (flatEl) {
      flatEl.classList.remove('is-shown');
      flatEl.setAttribute('aria-hidden', 'true');
    }
    if (deck) deck.classList.remove('is-veiled');
    var veil = getVeil();
    if (veil) veil.classList.remove('is-shown');
    flatOpen = false;
  }
  /* ---------- 拖拽跟手（rAF 合帧 + 关闭阴影滤镜保证顺滑） ---------- */
  function paintDrag() {
    rafId = 0;
    if (!dragging) return;
    var cards = getCards();
    var front = cards[activeIndex];
    if (!front) return;
    var shift = Math.max(-170, Math.min(170, pendingDx));
    var deg = shift / 24;
    var fade = 1 - Math.min(0.4, Math.abs(shift) / 420);
    front.style.transform = 'translate3d(' + shift.toFixed(2) + 'px,' + (Math.abs(shift) / 40).toFixed(2) + 'px,0) rotate(' + deg.toFixed(2) + 'deg) scale(' + FRONT_SCALE + ')';
    front.style.opacity = fade.toFixed(3);
  }
  function onPointerDown(e) {
    if (flatOpen || busy) return;
    var deck = getDeck();
    if (!deck) return;
    var card = e.target.closest ? e.target.closest('.p2-card') : null;
    if (!card || !deck.contains(card)) return;
    dragging = true;
    moved = false;
    gestureMoved = false;
    lockDir = null;
    dragDx = 0;
    pendingDx = 0;
    velocity = 0;
    var pt = e.touches ? e.touches[0] : e;
    dragStartX = pt.clientX;
    dragStartY = pt.clientY;
    lastX = pt.clientX;
    lastT = performance.now();
  }
  function onPointerMove(e) {
    if (!dragging || flatOpen) return;
    var pt = e.touches ? e.touches[0] : e;
    var dx = pt.clientX - dragStartX;
    var dy = pt.clientY - dragStartY;
    if (!gestureMoved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) gestureMoved = true;
    if (!lockDir) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        /* [10/22 r2] 死区 8→5、比例 1.25→1.12：起手就跟你走，不再先“顿”一下才动。
           上下滚页仍然抢不走票根，因为横向必须压过纵向。 */
        lockDir = Math.abs(dx) > Math.abs(dy) * 1.12 ? 'h' : 'v';
      }
    }
    if (lockDir !== 'h') return;
    if (e.cancelable) e.preventDefault();
    if (!moved) {
      moved = true;
      var deckMv = getDeck();
      if (deckMv) deckMv.classList.add('is-moving');
      var cards0 = getCards();
      var front0 = cards0[activeIndex];
      if (front0) {
        front0.style.transition = 'none';
        front0.style.willChange = 'transform';
      }
    }
    dragDx = dx;
    var now = performance.now();
    var dt = now - lastT;
    if (dt > 0) velocity = (pt.clientX - lastX) / dt;
    lastX = pt.clientX;
    lastT = now;
    pendingDx = dx;
    if (!rafId) rafId = window.requestAnimationFrame(paintDrag);
  }
  function settleBack(front, cards) {
    if (front) {
      front.style.transition = 'transform .3s cubic-bezier(.22,1,.36,1), opacity .3s ease';
      front.style.transform = '';
      front.style.opacity = '';
      window.setTimeout(function () {
        front.style.transition = '';
        front.style.filter = '';
        front.style.willChange = '';
      }, 320);
    }
    applyPose(cards, activeIndex);
  }
  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
    if (flatOpen) return;
    var cards = getCards();
    var front = cards[activeIndex];
    var threshold = 40;
    var fast = Math.abs(velocity) > 0.55 && Math.abs(dragDx) > 16;
    var shouldFlip = moved && (Math.abs(dragDx) > threshold || fast);
    if (shouldFlip && front) {
      var keep = front.style.transform;
      if (!keep) {
        /* 快速轻扫时 rAF 可能还没把拖动帧画出来，位置就在 dragDx 里。
           不补这一下，卡会从原位“顿”一下再飞。 */
        var sh = Math.max(-170, Math.min(170, dragDx));
        keep = 'translate3d(' + sh.toFixed(1) + 'px,' + (Math.abs(sh) / 40).toFixed(1) + 'px,0) rotate(' + (sh / 24).toFixed(2) + 'deg) scale(' + FRONT_SCALE + ')';
      }
      front.style.filter = '';
      front.style.willChange = '';
      commitFlip(dragDx < 0 ? 1 : -1, keep);
    } else if (moved) {
      settleBack(front, cards);
    } else if (!gestureMoved) {
      /* 向上/向下滚页后手指抬起时也落在这里：不算点击，不展横版 */
      var card = e.target.closest ? e.target.closest('.p2-card') : null;
      var shot = e.target.closest ? e.target.closest('.p2-zoom') : null;
      if (shot) {
        /* 点到图：放大看图，不展开横版票根 */
        if (typeof window.p2ZoomImage === 'function') {
          window.p2ZoomImage(shot.getAttribute('data-zoom-src') || shot.currentSrc || shot.src, shot.alt);
        }
      }
      /* [v20]按你说的，取消「点文字弹横版票根」这套设定：
         现在竖版票根上任何位置都不会再弹出横版长条票，
         点图片依旧只走大图预览。 */
    }
    dragDx = 0;
    pendingDx = 0;
    velocity = 0;
    moved = false;
    lockDir = null;
    var deckEnd = getDeck();
    if (deckEnd) window.setTimeout(function () { deckEnd.classList.remove('is-moving'); }, 360);
  }
  function bindDeck() {
    var deck = getDeck();
    if (!deck || deck.dataset.bound === '1') return;
    deck.dataset.bound = '1';
    deck.addEventListener('touchstart', onPointerDown, { passive: true });
    deck.addEventListener('touchmove', onPointerMove, { passive: false });
    deck.addEventListener('touchend', onPointerUp, { passive: true });
    deck.addEventListener('touchcancel', onPointerUp, { passive: true });
    deck.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
  }
  /* 点击长条外部 / 遮罩 → 收起（含刚打开瞬间的误触保护） */
  document.addEventListener('click', function (e) {
    if (!flatOpen) return;
    if (Date.now() - flatOpenedAt < 400) return;
    if (flatEl && flatEl.contains(e.target)) return;
    closeFlat();
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeFlat();
  });
  window.p2FlipTicket = commitFlip;
  window.p2CloseFlat = closeFlat;
  function init() {
    var cards = getCards();
    if (!cards.length) return;
    applyPose(cards, activeIndex);
    bindDeck();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();



/* 克莱尔修：切到别的 app / 标签页时给 body 挂 is-hidden-tab，CSS 里所有动画跟着暂停，回来接着动 */
document.addEventListener('visibilitychange', function () {
  document.body.classList.toggle('is-hidden-tab', document.hidden);
});

/* ===== [v49a] 页面二布局尺：顶栏高度 + 票根居中 =====
   做两件事：
   1) 把固定顶栏的真实高度写进 --p2-topbar-h，让 .p2-viewport 的顶部让位永远准确
      （安全区、窄屏字体变化都会改变这个值，写死 60px 会偏）。
   2) 把「顶栏以下、底部导航以上」的可视高度写进 --p2-stage-h，
      让 .p2-ticket-stage 吃满这段空间，再由 flex 居中 → 不滑动时票根上下左右都居中。
   只在页面二可见时计算；用 rAF 合并重算，避免 resize/滚动时反复布局。 */
(function () {
  var page = document.getElementById('page2');
  if (!page) return;
  var bar = page.querySelector('.p2-topbar');
  var vp = page.querySelector('.p2-viewport');
  var stage = page.querySelector('.p2-ticket-stage');
  var nav = document.querySelector('.bottom-nav');
  if (!vp || !stage) return;

  function setVar(el, name, val) {
    if (!el) return;
    el.style.setProperty(name, val + 'px');
  }

  function layout() {
    if (!page.classList.contains('is-visible')) return;
    var barH = bar ? Math.round(bar.getBoundingClientRect().height) : 0;
    setVar(vp, '--p2-topbar-h', barH);

    /* 可视高度 = 视口高 - 顶栏 - 底部导航 - viewport 自身下 padding */
    var navH = 0;
    if (nav && !nav.hidden) {
      var nr = nav.getBoundingClientRect();
      if (nr.height > 0) navH = Math.round(nr.height);
    }
    var vh = window.innerHeight || document.documentElement.clientHeight;
    /* stage 上下各有 18px padding，min-height 已含 box-sizing:border-box，直接给总高。
       [fix-v49a] 不能再减 24（viewport 的底部 padding）：那会让展台底边离底部导航
       还差 24px，居中中心就比真实可见区高 12px。给足 = 可见区精确高度。 */
    var stageH = vh - barH - navH;
    if (stageH < 200) stageH = 200;       /* 安全下限，避免竖屏极短时把票根压扁 */
    /* deck 本身 470px + stage 上下 padding 36px，别小于这个，否则会溢出挤压 */
    var deckH = page.querySelector('.p2-ticket-deck');
    var need = deckH ? deckH.getBoundingClientRect().height + 36 : 0;
    if (stageH < need) stageH = need;
    setVar(stage, '--p2-stage-h', Math.round(stageH));
  }

  var raf = 0;
  function schedule() {
    if (raf) return;
    raf = window.requestAnimationFrame(function () { raf = 0; layout(); });
  }

  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', function () { setTimeout(schedule, 200); });
  window.addEventListener('hashchange', schedule);
  if (window.ResizeObserver) {
    try { new ResizeObserver(schedule).observe(page); } catch (e) {}
  }
  /* 顶栏/底部导航字体、安全区变化也会影响高度 */
  schedule();
  window.addEventListener('load', schedule);
  setTimeout(schedule, 300);
  window.__p2Layout = layout;   /* 调试用 */
})();

/* ===== [ticket23] 页面二滚动触发：横版票根弹出 + 撕下才退出 =====
   改动要点（2026-10-23）：
   1. 点遮罩、按 Esc 都不再关闭——只有把左侧票根撕下来，这张明信片才算取走。
   2. 撕票是唯一出口：拖过齿孔线松手 / 点一下票根，票根掀起、飘出、随票面一起淡出。
   3. 弹层挂到 body，脱离 page2 的滚动与 transform 容器。
   4. 动效只走 transform / opacity，去掉逐字 blur 与 backdrop-filter，安卓 WebView 不再掉帧。 */
(function () {
  var reveal = document.getElementById('p2PostcardReveal');
  var ticket = document.getElementById('p2PostcardTicket');
  var stub = document.getElementById('p2PostcardStub');
  var page = document.getElementById('page2');
  if (!reveal || !ticket || !stub || !page) return;
  /* ---------- 预热：票面照片提前解码 ----------
   票根层现在常驻绘制（CSS 里 opacity:.001），入场只剩 transform/opacity，
   这里再把大图提前解码，避免第一次弹出来时那一帧在解码上卡住。 */
  var photo = ticket.querySelector('.pt-photo img');
  var warmed = false;
  function warmPhoto() {
    if (warmed) return;
    warmed = true;
    if (!photo) return;
    try {
      if (photo.decode) photo.decode().then(function () {}, function () {});
    } catch (e) {}
  }
  function watchWarm() {
    if (page.classList.contains('is-visible')) {
      window.setTimeout(warmPhoto, 200);
      return;
    }
    if (!window.MutationObserver) return;
    var mo = new MutationObserver(function () {
      if (!page.classList.contains('is-visible')) return;
      mo.disconnect();
      window.setTimeout(warmPhoto, 200);
    });
    mo.observe(page, { attributes: true, attributeFilter: ['class'] });
  }
  watchWarm();

  var revealedOnce = false;

  if (reveal.parentNode !== document.body) document.body.appendChild(reveal);

  function revealTicket() {
    if (revealedOnce || !page.classList.contains('is-visible')) return;
    revealedOnce = true;
    /* 上一次残留的退场类必须清干净，否则票根会以半透明/透明状态出场 */
    reveal.classList.remove('is-torn');
    ticket.style.opacity = '';
    document.querySelectorAll('#p2PostcardReveal .pt-caption').forEach(function (el) { el.style.opacity = ''; });
    /* 下一帧再加类，保证 transition 从初始态开始跑，不会一上来就跳到终态 */
    window.requestAnimationFrame(function () {
      reveal.classList.add('is-revealed');
      /* 保险：入场动画走完强行把票根置为不透明，规避 WebView 合成层残留 alpha。
         跑两次，防止入场过渡被主线程卡顿打断后停在半透明。 */
      var settle = function () {
        if (reveal.classList.contains('is-torn')) return;
        if (window.__ptTicket && window.__ptTicket.ensureSolid) window.__ptTicket.ensureSolid();
        else ticket.style.opacity = '1';
      };
      window.setTimeout(settle, 820);
      window.setTimeout(settle, 1800);
    });
  }

  function noteDownwardScroll(delta) {
    if (!page.classList.contains('is-visible') || revealedOnce) return;
    if (delta > 0) revealTicket();
  }

  /* 等手感停下来再弹：惯性还在跑的时候加弹层入场，两边抢帧，看起来就是「卡一下」。
     手停 130ms 后再把票根放出来，入场动画才完整跑得顺。 */
  var quietTimer = 0;
  function revealAfterScroll() {
    if (!page.classList.contains('is-visible') || revealedOnce) return;
    window.clearTimeout(quietTimer);
    quietTimer = window.setTimeout(function () {
      if (revealedOnce || !page.classList.contains('is-visible')) return;
      var y = window.scrollY || window.pageYOffset || 0;
      if (y > 18) revealTicket();
    }, 130);
  }
  window.addEventListener('wheel', revealAfterScroll, { passive: true });
  window.addEventListener('scroll', revealAfterScroll, { passive: true });

  window.addEventListener('keydown', function (event) {
    if (['ArrowDown', 'PageDown', 'End', ' '].indexOf(event.key) !== -1) noteDownwardScroll(1);
  }, { passive: false });

  /* 撕票交互已迁到 pt-tear.js（clip 几何 + 纸纤维 + 掉落物理） */

  /* 只留一个调试入口；遮罩与 Esc 不再作为退出口 */
  window.__p2PostcardReveal = revealTicket;
  /* 票根被撕掉后回到页面二：重新上膛——回到「还没下滑」的隐藏态，下滑时再出 */
  window.__p2TicketArm = function () {
    revealedOnce = false;
    reveal.classList.remove('is-torn', 'is-revealed');
    ticket.style.opacity = '';
    document.querySelectorAll('#p2PostcardReveal .pt-caption').forEach(function (el) { el.style.opacity = ''; });
  };
})();

/* ===== [nav 2026-10-22] 页面二顶部玻璃导航：下滚时加深一点点 =====
   只是给 #page2 挂一个 is-nav-scrolled 类，具体样式全在 style.css 里。
   用 passive + rAF 节流，滚动时不阻塞主线程；不在页面二时直接跳过。 */
(function () {
  var page = document.getElementById('page2');
  if (!page) return;
  var ticking = false;
  var scrollTimer = 0;
  function update() {
    ticking = false;
    if (!page.classList.contains('is-visible')) {
      page.classList.remove('is-nav-scrolled');
      return;
    }
    page.classList.toggle('is-nav-scrolled', (window.scrollY || window.pageYOffset || 0) > 8);
  }
  function onScroll() {
    /* [v49d] 滚动降载：滚动期间给 #page2 挂 is-scrolling，
       CSS 里借此把票根阴影降为轻量版本；停手 160ms 后恢复完整阴影。 */
    if (!page.classList.contains('is-scrolling')) page.classList.add('is-scrolling');
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(function () {
      page.classList.remove('is-scrolling');
    }, 160);
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  window.addEventListener('hashchange', function () { window.requestAnimationFrame(update); });
  update();
})();

/* ===== [v21.2 2026-10-23] 页面二 票根02：蓝色英文真弧度排列 =====
   不是整行 rotate 假装斜线。四行共用同一条波浪基线：
     W(x) = A1*sin(2*pi*(x-p)/L1) + A2*sin(2*pi*(x-p2)/L2)
   每一行再用自己的幅度系数微调（不破行距，不会互相压），
   每个字根据自己在曲线上那一小段的切线自己转角度，所以字本身是弯着走的。 */
(function () {
  /* [v21.3] 每行一组参数：a 振幅 / lr 主波长占自身字宽的比例 / ph 起始相位
     一行里基本走完一个完整周期，看得见「起-峰-谷-回落」，不是一条斜线。 */
  /* [v21.4 2026-10-23] 回到真正走弧线的那一版：主波长固定 116px、振幅 3.3，
     再叠一层 50px 的小谐波；每行只用自己的幅度系数（1.00 / 0.92 / 0.96 / 1.06）
     微调，行距始终 ≥ 8.3px，四行不会互相压住。 */
  /* [note12] 四行英文实际渲染宽只有 49-74px，而固定波长 116px 意味着每行只走
     0.4-0.6 个周期 —— 这是「看着像斜线」的真正原因。改成每行按自身长度归一到
     一个完整周期：首尾等高、中间起峰（或落谷），四行交错成 起-峰-谷-收 的弧。 */
  var LINE = [
    { a: 3.30, k: 1.00, ph: -1.50, fit: 1, rp: 0.50 },
    { a: 2.60, k: 1.00, ph:  1.30, fit: 1, rp: 0.50 },
    { a: 3.30, k: 0.96, ph: -1.20, fit: 1, rp: 0.50 },
    { a: 3.00, k: 1.00, ph:  1.00, fit: 1, rp: 0.50 }
  ];
  var WAVE_L = 116;
  var RIPPLE_A = 0.85;
  var RIPPLE_L = 50;
  /* 横向分布：四行交错贴左 / 贴右，整块把票面宽度铺开。 */
  var ALIGN = [
    { s: 'l', m: 12 },
    { s: 'r', m: 16 },
    { s: 'l', m: 26 },
    { s: 'r', m: 30 }
  ];
  var MAX_DEG = 13;
  function waveY(t, cfg, spanW) {
    /* [note12] fit=1 的行：波长直接等于「首字中心→末字中心」的距离，
       整行刚好走完一个完整周期 —— 首尾同一高度，中间抬起来（或压下去），
       这样短句也是弧，不是坡。细波也跟着缩到半个周期一档，免得跟主弧打架。 */
    var fit = cfg.fit && spanW > 20;
    var L = fit ? spanW : (cfg.L || WAVE_L);
    var RL = fit ? spanW * 0.5 : RIPPLE_L;
    var rp = (typeof cfg.rp === 'number') ? cfg.rp : RIPPLE_A;
    return cfg.a * cfg.k * Math.sin(2 * Math.PI * t / L + cfg.ph)
         + rp * Math.sin(2 * Math.PI * t / RL + cfg.ph * 1.7);
  }
  var wrap = document.querySelector('#page2 .p2-card.is-exist .p2-wave');
  if (!wrap) return;
  var spans = [].slice.call(wrap.children);
  var split_done = false;
  var retry = 0;
  var lastOk = 0;
  var poll = 0;
  function split() {
    spans.forEach(function (sp) {
      if (sp.getAttribute('data-wave') === '1') return;
      var txt = sp.textContent;
      sp.textContent = '';
      Array.prototype.forEach.call(txt, function (ch) {
        var i = document.createElement('i');
        i.textContent = ch === ' ' ? String.fromCharCode(160) : ch;
        sp.appendChild(i);
      });
      sp.setAttribute('data-wave', '1');
    });
    split_done = true;
  }
  function apply() {
    if (!split_done) split();
    var ok = 0;
    var cw = wrap.clientWidth || 225;
    spans.forEach(function (sp, li) {
      var a = ALIGN[li] || ALIGN[0];
      sp.style.right = 'auto';
      if (a.s === 'r') {
        sp.style.left = Math.max(0, cw - a.m - sp.offsetWidth) + 'px';
      } else {
        sp.style.left = a.m + 'px';
      }
    });
    spans.forEach(function (sp, li) {
      var cfg = LINE[li] || LINE[0];
      var chars = [].slice.call(sp.children);
      if (!chars.length) return;
      var ox = sp.offsetLeft;
      var xs = chars.map(function (c) { return ox + c.offsetLeft + c.offsetWidth / 2; });
      var spanW = xs[xs.length - 1] - xs[0];
      if (!(spanW > 12)) return;
      ok++;
      var ys = xs.map(function (x) { return waveY(x - xs[0], cfg, spanW); });
      chars.forEach(function (c, k) {
        var p = Math.max(0, k - 1);
        var q = Math.min(chars.length - 1, k + 1);
        var dx = xs[q] - xs[p];
        var deg = dx > 0.001 ? Math.atan((ys[q] - ys[p]) / dx) * 180 / Math.PI : 0;
        if (deg > MAX_DEG) deg = MAX_DEG;
        if (deg < -MAX_DEG) deg = -MAX_DEG;
        c.style.transform = 'translateY(' + ys[k].toFixed(2) + 'px) rotate(' + deg.toFixed(2) + 'deg)';
      });
    });
    /* Jellyfish 这个标签也沿同一条弧线走（字号 5.4px，幅度和转角都比四行英文更小） */
    var tag = wrap.parentNode ? wrap.parentNode.querySelector('.p2-jelly-tag') : null;
    if (tag) {
      if (tag.getAttribute('data-wave') !== '1') {
        var tt = tag.textContent;
        tag.textContent = '';
        Array.prototype.forEach.call(tt, function (ch) {
          var ci = document.createElement('i');
          ci.textContent = ch;
          ci.style.display = 'inline-block';
          ci.style.fontStyle = 'normal';
          tag.appendChild(ci);
        });
        tag.setAttribute('data-wave', '1');
      }
      var tcs = [].slice.call(tag.children);
      if (tcs.length > 2) {
        var txs = tcs.map(function (c) { return c.offsetLeft + c.offsetWidth / 2; });
        var tw = txs[txs.length - 1] - txs[0];
        if (tw > 4) {
          /* [note13] Jellyfish 只有 28px 宽，46px 波长同样只走到半个坡。
             跟英文四行一样按自身长度归一：整串刚好一个周期，两端齐平、中间抬起。 */
          var TL = Math.max(tw, 18);
          var tys = txs.map(function (x) {
            return 2.3 * Math.sin(2 * Math.PI * (x - txs[0]) / TL + 2.1);
          });
          tcs.forEach(function (c, k) {
            var p = Math.max(0, k - 1), q = Math.min(tcs.length - 1, k + 1);
            var dx = txs[q] - txs[p];
            var deg = dx > 0.001 ? Math.atan((tys[q] - tys[p]) / dx) * 180 / Math.PI : 0;
            if (deg > 18) deg = 18;
            if (deg < -18) deg = -18;
            c.style.transform = 'translateY(' + tys[k].toFixed(2) + 'px) rotate(' + deg.toFixed(2) + 'deg)';
          });
        }
      }
    }
    lastOk = ok;
    if (ok > 0 && poll) { window.clearInterval(poll); poll = 0; }
  }
  var rafId = 0;
  function schedule() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(function () { rafId = 0; apply(); });
  }

  /* 票根在首帧可能还没排版（display:none / 未进场），所以先用定时器反复试，
     成功一次就停；再挂 IntersectionObserver，票根重新进场时补一次。 */
  apply();
  var poll = window.setInterval(function () {
    apply();
    retry++;
    if (lastOk > 0 || retry > 60) { window.clearInterval(poll); poll = 0; }
  }, 200);
  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) apply(); });
    }, { threshold: 0.01 });
    io.observe(wrap);
    window.__p2WaveIO = io;
  }
  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('orientationchange', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  window.__p2Wave = apply;
})();

/* ==================================================================
   [opt2026-10-23] 空闲预热：首屏看够了再悄悄把后面几页的图取回缓存。
   目的：初次打开只看首页时，不把 4MB 图全下下来；但用户真去翻页时，
   图已经躺在缓存里，翻页体感是“瞬开”。
   ================================================================== */
(function () {
  var warmed = Object.create(null);
  var queue = [];
  var running = false;
  function idle(fn) {
    if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: 2500 });
    else window.setTimeout(fn, 1200);
  }
  function pump() {
    if (running) return;
    var src = queue.shift();
    if (!src) return;
    running = true;
    var im = new Image();
    im.decoding = 'async';
    im.onload = im.onerror = function () {
      running = false;
      idle(pump);
    };
    im.src = src;
    /* 兜底：某些 WebView 下 onload 可能不触发 */
    window.setTimeout(function () { if (running) { running = false; idle(pump); } }, 4000);
  }
  function warm(list, delay) {
    var add = function () {
      (list || []).forEach(function (src) {
        if (warmed[src]) return;
        warmed[src] = true;
        queue.push(src);
      });
      idle(pump);
    };
    if (delay) window.setTimeout(add, delay);
    else idle(add);
  }
  var P2 = ['page2-avatar.jpg', 'page2-ticket1.jpg?v=ident5', 't2-a.jpg?v=ident3',
            't2-b.jpg?v=ident3', 't2-c.jpg?v=ident3', 'jelly.png?v=j5'];
  var P3 = ['page3-banner-sm.webp', 'page3-tile-rain-sm.webp', 'page3-tile-wings-sm.webp',
            'page3-tile-lily-sm.webp', 'page3-tile-eye-sm.webp', 'page3-tile-rain-back-sm.webp',
            'lily-back.svg?v=32', 'page3-tile-eye-back-sm.webp'];
  var P4 = ['page4-flow-0-sm.webp?v=1', 'page4-flow-1-sm.webp?v=4', 'page4-flow-2-sm.webp?v=4',
            'page4-flow-3-sm.webp?v=4', 'page4-flow-4-sm.webp?v=4', 'page4-flow-5-sm.webp?v=4',
            'page4-tile-1-sm.webp', 'page4-tile-2-sm.webp', 'page4-tile-3-sm.webp',
            'page4-tile-4-sm.webp', 'page4-tile-5-sm.webp', 'page4-tile-6-sm.webp'];
  /* 开屏还在放的时候什么都不取，别和首屏抢带宽 */
  window.addEventListener('site:intro-done', function () { warm(P2, 600); });
  /* 用户一直停在开屏、或者没走完问答：6 秒后仍然预热第二页 */
  window.setTimeout(function () { warm(P2, 0); }, 6000);
  window.addEventListener('site:page', function (e) {
    var id = e && e.detail && e.detail.id;
    if (id === 'page2') warm(P3, 900);
    else if (id === 'page3') warm(P4, 900);
  });
})();
