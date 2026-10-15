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
    image: 'page3-card-1.jpg',
    alt: '虚恋动态图片',
    href: 'https://www.kdocs.cn/l/cd1UnT68kBpa',
    stats: ['3,102', '1,240', '3.5万']

  },
  {
    key: 'sick-love',
    copy: '仅有你我二人的逃亡之旅，装作废人的共依存症。',
    tag: '拖累症',
    image: 'page3-card-2.jpg',
    alt: '病恋动态图片',
    href: 'https://www.kdocs.cn/l/cmvJAHDy9vap',
    stats: ['2,846', '986', '2.8万']
  },
  {
    key: 'dom-white-knight',
    copy: '你落的泪会有答案。别害怕、到我这来。',
    tag: '輕吻、指引與愛',
    image: 'page3-card-3.jpg',
    alt: 'Dom/白骑士动态图片',
    href: 'https://www.kdocs.cn/l/cjNLuDIhMVdb',
    stats: ['4,173', '1,506', '4.2万']
  },
  {
    key: 'sub-lower',
    copy: '除了你与明天我还能去往哪里。',
    tag: '輕咬、淚水與愛',
    image: 'page3-card-4.jpg',
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
  if (id === 'page3') schedulePage3Preload();
  page.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
  const video = page.querySelector('video[data-poster]');
  if (video) {
    if (!video.poster) video.poster = video.getAttribute('data-poster');
    if (video.preload !== 'metadata') video.preload = 'metadata';
  }
}
function showPage(id, { resetScroll = true } = {}) {
  document.querySelectorAll('.welcome-view, .page-view').forEach(page => page.classList.toggle('is-visible', page.id === id));
  wakePage(id);
  document.querySelectorAll('.bottom-nav a').forEach(link => link.classList.toggle('selected', link.dataset.page === id));
  const secondaryPage = id !== 'welcomePage';
  siteBody.classList.toggle('page2-active', id === 'page2');
  siteBody.classList.toggle('page4-active', id === 'page4');
  document.querySelector('.bottom-nav').hidden = !secondaryPage;
  document.querySelector('.music-bar').hidden = !secondaryPage;
  if (resetScroll) window.scrollTo({ top: 0, behavior: 'instant' });
  history.replaceState(null, '', id === 'welcomePage' ? '#welcome' : `#${id}`);
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
  return ['page2', 'page3', 'page4'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'welcomePage';
}

window.addEventListener('hashchange', () => showPage(pageFromHash()));
window.addEventListener('pageshow', event => {
  const expectedPage = pageFromHash();
  const visiblePage = document.querySelector('.welcome-view.is-visible, .page-view.is-visible');
  const isHistoryRestore = event.persisted || performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
  // Keep the browser-restored page and scroll position when returning from an external link.
  if (!visiblePage || visiblePage.id !== expectedPage) {
    showPage(expectedPage, { resetScroll: !isHistoryRestore });
  }
  tryResumeAudio();
});

showPage(pageFromHash(), { resetScroll: false });
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
  window.addEventListener('site:intro-done', function () {
    fired = false;
    requestAnimationFrame(triggerP1);
  });
})();

// 页面切换入场动效
(function () {
  var pages = [...document.querySelectorAll('.welcome-view, .page-view')];
  pages.forEach(function (el) {
    var busy = false;
    new MutationObserver(function () {
      if (busy) return;
      if (!el.classList.contains('is-visible')) return;
      busy = true;
      el.classList.remove('is-entering');
      void el.offsetWidth;
      el.classList.add('is-entering');
      window.setTimeout(function () {
        el.classList.remove('is-entering');
        window.setTimeout(function () { busy = false; }, 0);
      }, 520);
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
  });
})();

// Bottom nav 滑动指示条
(function () {
  var nav = document.querySelector('.bottom-nav');
  if (!nav) return;
  var indicator = document.createElement('div');
  indicator.className = 'bottom-nav-indicator';
  indicator.style.opacity = '0';
  nav.appendChild(indicator);
  function updateIndicator() {
    var active = nav.querySelector('a.selected');
    if (!active) { indicator.style.opacity = '0'; return; }
    var navRect = nav.getBoundingClientRect();
    var rect = active.getBoundingClientRect();
    indicator.style.opacity = '1';
    indicator.style.left = (rect.left - navRect.left) + 'px';
    indicator.style.width = rect.width + 'px';
  }
  new MutationObserver(updateIndicator).observe(nav, { attributes: true, attributeFilter: ['class'], subtree: true });
  window.addEventListener('resize', updateIndicator);
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
    items.forEach(function (el, i) {
      window.setTimeout(function () { el.classList.add('is-revealed'); }, i * 70);
    });
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
  closeBtn.textContent = '×';
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
      hintEl.classList.add('show');
      return;
    }
    index += 1;
    window.setTimeout(type, index === 1 ? 520 : 240);
  }
  titleEl.classList.add('is-typing');
  window.setTimeout(type, 420);

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
