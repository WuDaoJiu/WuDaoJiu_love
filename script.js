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

function showPage(id, { resetScroll = true } = {}) {
  document.querySelectorAll('.welcome-view, .page-view').forEach(page => page.classList.toggle('is-visible', page.id === id));
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
