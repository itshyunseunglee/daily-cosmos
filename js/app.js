/* ── Stars canvas ── */
(function () {
  const STAR_COUNT = 200;
  const canvas = document.getElementById('stars');
  const ctx    = canvas.getContext('2d');
  let stars    = [];
  let rafId    = null;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = Array.from({ length: STAR_COUNT }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() * 1.4 + 0.2,
      speed: Math.random() * 0.004 + 0.001,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function draw(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,215,255,${alpha})`;
      ctx.fill();
    });
    rafId = requestAnimationFrame(draw);
  }

  function start() { if (!rafId) rafId = requestAnimationFrame(draw); }
  function stop()  { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

  resize();
  // 리사이즈 디바운스: 창 조절 중 별 배열 반복 재생성 방지
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });
  // 탭 숨김 시 애니메이션 중지 → CPU 절약
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  start();
})();

/* ── Config 상수 (하드코딩 금지 — 여기서만 수정) ── */
const BASE     = 'https://api.nasa.gov/planetary/apod';
const LS_KEY   = 'nasa_apod_api_key';
const MIN_DATE = '1995-06-16';

const FADE_OUT_MS       = 150;         // 콘텐츠 fade-out 대기 시간 (CSS와 맞춤)
const PARTICLE_GAP_MS   = 80;          // 파티클 생성 최소 간격
const PARTICLE_TTL_MS   = 800;         // 파티클 수명
const PARTICLE_CHARS    = ['✦', '·', '⋆', '✧'];
const DL_DIRECT_MS      = 4000;        // 직접 fetch 타임아웃
const DL_PROXY_MS       = 8000;        // 프록시 fetch 타임아웃 (병렬 실행이라 넉넉하게)

// CORS 프록시 목록 — URL 함수 배열로 관리 (새 프록시 추가 시 여기만 수정)
const CORS_PROXIES = [
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://images.weserv.nl/?url=${url.replace(/^https?:\/\//, '')}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

const DL_SVG   = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v7M3.5 5.5l3 3 3-3M1 10h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const DL_LABEL = `${DL_SVG} Download Image`;

function getApiKey() {
  return localStorage.getItem(LS_KEY) || 'DEMO_KEY';
}

/* ── Element references ── */
const els = {
  loading:         document.getElementById('loading'),
  error:           document.getElementById('error-msg'),
  errorText:       document.getElementById('error-text'),
  content:         document.getElementById('apod-content'),
  dateInput:       document.getElementById('date-input'),
  displayDate:     document.getElementById('display-date'),
  mediaBadge:      document.getElementById('media-badge'),
  title:           document.getElementById('apod-title'),
  imageCard:       document.getElementById('image-card'),
  img:             document.getElementById('apod-img'),
  videoWrap:       document.getElementById('video-wrap'),
  video:           document.getElementById('apod-video'),
  copyrightStrip:  document.getElementById('copyright-strip'),
  copyrightText:   document.getElementById('copyright-text'),
  desc:            document.getElementById('apod-desc'),
  btnToday:        document.getElementById('btn-today'),
  btnRandom:       document.getElementById('btn-random'),
  btnPrev:         document.getElementById('btn-prev'),
  btnNext:         document.getElementById('btn-next'),
  lightbox:        document.getElementById('lightbox'),
  lightboxImg:     document.getElementById('lightbox-img'),
  lightboxClose:   document.getElementById('lightbox-close'),
  apiKeyModal:     document.getElementById('api-key-modal'),
  apiKeyInput:     document.getElementById('api-key-input'),
  btnSaveKey:      document.getElementById('btn-save-key'),
  btnUseDemo:      document.getElementById('btn-use-demo'),
  btnOpenKeyModal: document.getElementById('btn-open-key-modal'),
  btnErrorKey:     document.getElementById('btn-error-key'),
  imgError:        document.getElementById('img-error'),
  imgErrorLink:    document.getElementById('img-error-link'),
  btnDownload:     document.getElementById('btn-download'),
  nativeVideoWrap: document.getElementById('native-video-wrap'),
  nativeVideo:     document.getElementById('apod-native-video'),
  nativeSource:    document.getElementById('apod-native-source'),
  videoDirectLink: document.getElementById('video-direct-link'),
  scrollProgress:  document.getElementById('scroll-progress'),
};

/* ── 비디오 URL 분류 ── */
function classifyVideoUrl(url) {
  if (!url) return { type: 'unknown', embedUrl: null };

  // YouTube watch URL → embed (autoplay + mute: 브라우저 정책상 mute 필수)
  const ytWatch = url.match(/youtube\.com\/watch\?(?:.*&)?v=([\w-]+)/);
  const ytShort = url.match(/youtu\.be\/([\w-]+)/);
  if (ytWatch || ytShort) {
    const id = (ytWatch || ytShort)[1];
    return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}?rel=0&autoplay=1&mute=1` };
  }
  if (url.includes('youtube.com/embed/') || url.includes('youtube-nocookie.com/embed/')) {
    const sep = url.includes('?') ? '&' : '?';
    return { type: 'youtube', embedUrl: `${url}${sep}autoplay=1&mute=1` };
  }

  // Vimeo
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) {
    return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1&muted=1` };
  }

  // 직접 비디오 파일
  if (/\.(mp4|webm|ogv|mov)(\?|$)/i.test(url)) {
    return { type: 'direct', embedUrl: null };
  }

  return { type: 'iframe', embedUrl: url };
}

/* ── 날짜 유틸 ── */
function todayStr() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatDate(str) {
  return new Date(str + 'T12:00:00')
    .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// 기준 날짜에서 delta일 이동한 날짜 문자열 반환
function offsetDate(base, delta) {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

/* ── 날짜 이동 (화살표 버튼) ── */
const today = todayStr();

function stepDate(delta) {
  const newDate = offsetDate(els.dateInput.value || today, delta);
  if (newDate < MIN_DATE || newDate > today) return;
  els.dateInput.value = newDate;
  fetchAPOD(newDate);
}

function updateNavButtons() {
  const cur = els.dateInput.value;
  els.btnPrev.disabled = cur <= MIN_DATE;
  els.btnNext.disabled = cur >= today;
}

/* ── 랜덤 날짜 ── */
function randomDate() {
  const start = new Date(MIN_DATE + 'T12:00:00').getTime();
  const end   = new Date(today   + 'T12:00:00').getTime();
  const rand  = new Date(start + Math.random() * (end - start));
  return [
    rand.getFullYear(),
    String(rand.getMonth() + 1).padStart(2, '0'),
    String(rand.getDate()).padStart(2, '0'),
  ].join('-');
}

/* ── API Key modal ── */
function updateKeyButton() {
  const hasKey = localStorage.getItem(LS_KEY);
  els.btnOpenKeyModal.textContent = hasKey ? '🔑 My Key' : '🔑 API Key';
  els.btnOpenKeyModal.classList.toggle('has-key', !!hasKey);
}

function openKeyModal() {
  els.apiKeyInput.value = localStorage.getItem(LS_KEY) || '';
  els.apiKeyModal.classList.add('open');
  els.apiKeyInput.focus();
}

function closeKeyModal() {
  els.apiKeyModal.classList.remove('open');
}

function saveKey(key) {
  const trimmed = key?.trim();
  if (trimmed && trimmed !== 'DEMO_KEY') {
    localStorage.setItem(LS_KEY, trimmed);
  } else {
    localStorage.removeItem(LS_KEY);
  }
  updateKeyButton();
  closeKeyModal();
  fetchAPOD(els.dateInput.value);
}

els.btnOpenKeyModal.addEventListener('click', openKeyModal);
els.btnSaveKey.addEventListener('click', () => saveKey(els.apiKeyInput.value));
els.apiKeyInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveKey(els.apiKeyInput.value); });
els.btnUseDemo.addEventListener('click', () => saveKey(''));
els.apiKeyModal.addEventListener('click', e => { if (e.target === els.apiKeyModal) closeKeyModal(); });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeLightbox(); closeKeyModal(); }
});

/* ── Loading / Error ── */
function setLoading(on) {
  els.loading.classList.toggle('active', on);
  els.error.classList.remove('active');
  if (on) {
    els.content.classList.remove('active', 'fading-out');
  }
}

function showError(msg, isRateLimit = false) {
  els.loading.classList.remove('active');
  els.content.classList.remove('active');
  els.error.classList.add('active');
  els.errorText.textContent = msg;
  els.btnErrorKey.style.display = isRateLimit ? 'inline-block' : 'none';
}

els.btnErrorKey.addEventListener('click', openKeyModal);

/* ── APOD 응답 캐시 & 요청 취소 ── */
const apodCache   = new Map();   // date → data
let fetchController = null;

/* ── Fetch APOD (fade-out과 병렬 실행) ── */
async function fetchAPOD(date) {
  // 이전 in-flight 요청 취소
  fetchController?.abort();
  fetchController = new AbortController();
  const { signal } = fetchController;

  updateNavButtons();

  // fade-out 시작 (fetch와 동시에)
  const fadePromise = els.content.classList.contains('active')
    ? new Promise(resolve => {
        els.content.classList.remove('active');
        els.content.classList.add('fading-out');
        setTimeout(() => { els.content.classList.remove('fading-out'); resolve(); }, FADE_OUT_MS);
      })
    : Promise.resolve();

  setLoading(true);

  try {
    let data;

    if (apodCache.has(date)) {
      // 캐시 히트 → fade-out 끝날 때까지만 기다리고 바로 렌더
      await fadePromise;
      data = apodCache.get(date);
    } else {
      // 네트워크 fetch + fade-out 병렬 대기
      const apiUrl = `${BASE}?api_key=${getApiKey()}&date=${date}`;
      const [res] = await Promise.all([
        fetch(apiUrl, { signal }),
        fadePromise,
      ]);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 429) {
          const hint = getApiKey() === 'DEMO_KEY'
            ? 'Rate limit reached (30 req/hour on DEMO_KEY). Register a free personal key for 1,000 req/hour.'
            : 'API rate limit exceeded. Please wait a moment and try again.';
          throw Object.assign(new Error(hint), { isRateLimit: true });
        }
        throw new Error(err.msg || `HTTP ${res.status}`);
      }

      data = await res.json();
      apodCache.set(date, data);
    }

    renderAPOD(data);
    prefetchAdjacent(date);   // 이웃 날짜 백그라운드 prefetch

  } catch (e) {
    if (e.name === 'AbortError') return;   // 취소된 요청 → 무시
    showError(e.message, !!e.isRateLimit);
  }
}

/* ── 이웃 날짜 Prefetch (백그라운드) ── */
function prefetchAdjacent(date) {
  [-1, +1].forEach(delta => {
    const d = offsetDate(date, delta);
    if (d < MIN_DATE || d > today || apodCache.has(d)) return;
    fetch(`${BASE}?api_key=${getApiKey()}&date=${d}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) apodCache.set(d, data); })
      .catch(() => {});
  });
}

/* ── Render APOD ── */
function renderAPOD(data) {
  els.displayDate.textContent = formatDate(data.date);
  els.mediaBadge.textContent  = data.media_type === 'video' ? '▶ Video' : '📷 Image';
  els.title.textContent       = data.title;
  els.desc.textContent        = data.explanation;
  els.imgErrorLink.href       = data.hdurl || data.url;
  currentDownloadUrl          = data.hdurl || data.url;
  currentTitle                = data.title;

  // 저작권
  els.copyrightText.textContent    = data.copyright?.trim() ?? '';
  els.copyrightStrip.style.display = data.copyright ? 'inline-flex' : 'none';

  if (data.media_type === 'video') {
    els.imageCard.style.display       = 'none';
    els.videoWrap.style.display       = 'none';
    els.nativeVideoWrap.style.display = 'none';

    const { type, embedUrl } = classifyVideoUrl(data.url);
    if (type === 'direct') {
      els.nativeSource.src              = data.url;
      els.videoDirectLink.href          = data.url;
      els.nativeVideo.muted             = true;   // autoplay 정책: muted 필수
      els.nativeVideo.autoplay          = true;
      els.nativeVideo.load();
      els.nativeVideoWrap.style.display = 'block';
    } else {
      els.video.src               = embedUrl || data.url;
      els.videoWrap.style.display = 'block';
    }

  } else {
    // 비디오 → 이미지 전환 시 재생 정지
    els.video.src                     = '';
    els.videoWrap.style.display       = 'none';
    els.nativeSource.src              = '';
    els.nativeVideo.load();
    els.nativeVideoWrap.style.display = 'none';

    els.imageCard.style.display = 'block';
    els.imgError.style.display  = 'none';
    els.img.style.display       = 'block';

    const { url, hdurl } = data;
    els.img.alt = data.title;
    let sdFallbackDone = false;

    els.img.onload  = () => { setLoading(false); triggerKenBurns(); };
    els.img.onerror = () => {
      if (!sdFallbackDone && hdurl && hdurl !== url) {
        sdFallbackDone = true;
        els.img.src = url;           // HD 실패 → SD 폴백
      } else {
        els.img.style.display      = 'none';
        els.imgError.style.display = 'flex';
        setLoading(false);
      }
    };
    els.img.src = hdurl || url;

    // 텍스트는 이미지 로드 전에 먼저 표시
    els.loading.classList.remove('active');
    els.content.classList.add('active');
    return;
  }

  setLoading(false);
  els.content.classList.add('active');
}

/* ── Ken Burns ── */
function triggerKenBurns() {
  els.img.classList.remove('kb-play');
  void els.img.offsetWidth;   // reflow → 애니메이션 재시작
  els.img.classList.add('kb-play');
}

/* ── Download ── */
let currentDownloadUrl = '';
let currentTitle       = '';

// 타임아웃 포함 fetch 헬퍼
async function fetchWithTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const id   = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

function triggerBlobDownload(blob, filename) {
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

async function downloadImage() {
  if (!currentDownloadUrl) return;

  const btn  = els.btnDownload;
  const url  = currentDownloadUrl;
  const ext  = url.split('.').pop().split('?')[0].toLowerCase() || 'jpg';
  const name = `${currentTitle.replace(/[^\w\s]/g, '').trim().replace(/\s+/g, '_')}.${ext}`;

  btn.textContent = '⏳ Connecting…';
  btn.disabled    = true;
  const restore   = () => { btn.innerHTML = DL_LABEL; btn.disabled = false; };

  // 직접 fetch + 모든 프록시를 병렬 시도 → 첫 번째 성공 응답 획득
  const attempts = [
    fetchWithTimeout(url, { mode: 'cors' }, DL_DIRECT_MS),
    ...CORS_PROXIES.map(makeUrl => fetchWithTimeout(makeUrl(url), {}, DL_PROXY_MS)),
  ].map(p => p.then(r => r.ok ? r : Promise.reject(new Error('not ok'))));

  let res;
  try {
    res = await Promise.any(attempts);
  } catch {
    window.open(url, '_blank');
    restore();
    return;
  }

  // 스트리밍으로 받으면서 진행률 실시간 표시
  // content-length 있으면 "⏳ 45%", 없으면 "⏳ 1.2 MB"
  try {
    const contentLength = +res.headers.get('content-length') || 0;
    const reader        = res.body.getReader();
    const chunks        = [];
    let loaded          = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      btn.textContent = contentLength
        ? `⏳ ${Math.round(loaded / contentLength * 100)}%`
        : `⏳ ${(loaded / 1048576).toFixed(1)} MB`;
    }

    triggerBlobDownload(new Blob(chunks), name);
  } catch {
    window.open(url, '_blank');
  }

  restore();
}

els.btnDownload.addEventListener('click', e => { e.stopPropagation(); downloadImage(); });

/* ── Lightbox ── */
let swipeMoved = false;   // 스와이프 여부 추적 (lightbox 오픈 방지용)

els.imageCard.addEventListener('click', () => {
  if (swipeMoved) { swipeMoved = false; return; }      // 스와이프면 무시
  if (els.imgError.style.display === 'flex') return;   // 이미지 에러 상태면 무시
  if (!els.img.naturalWidth) return;                    // 이미지 미로드 상태면 무시
  els.lightboxImg.src = els.img.src;
  els.lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
});

function closeLightbox() {
  els.lightbox.classList.remove('open');
  els.lightboxImg.src = '';
  document.body.style.overflow = '';
}

els.lightboxClose.addEventListener('click', closeLightbox);
els.lightbox.addEventListener('click', e => { if (e.target === els.lightbox) closeLightbox(); });

/* ── 모바일 스와이프 네비게이션 (← 다음날 / → 이전날) ── */
let swipeStartX = 0;
const navWrapper = document.getElementById('media-nav-wrapper');

navWrapper.addEventListener('touchstart', e => {
  swipeStartX = e.touches[0].clientX;
  swipeMoved  = false;
}, { passive: true });

navWrapper.addEventListener('touchmove', e => {
  if (Math.abs(e.touches[0].clientX - swipeStartX) > 10) swipeMoved = true;
}, { passive: true });

navWrapper.addEventListener('touchend', e => {
  if (!swipeMoved) return;
  const dx = e.changedTouches[0].clientX - swipeStartX;
  if (Math.abs(dx) > 50) dx < 0 ? stepDate(+1) : stepDate(-1);
}, { passive: true });

/* ── Date controls ── */
els.dateInput.max   = today;
els.dateInput.value = today;

els.dateInput.addEventListener('change', () => { if (els.dateInput.value) fetchAPOD(els.dateInput.value); });
els.btnToday.addEventListener('click',  () => { els.dateInput.value = today; fetchAPOD(today); });
els.btnPrev.addEventListener('click',   () => stepDate(-1));
els.btnNext.addEventListener('click',   () => stepDate(+1));
els.btnRandom.addEventListener('click', () => {
  const date = randomDate();
  els.dateInput.value = date;
  fetchAPOD(date);
});

/* ── Scroll progress bar ── */
window.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  const pct = scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) * 100 : 0;
  els.scrollProgress.style.width = `${pct}%`;
}, { passive: true });

/* ── Cursor particles ── */
let lastParticleTime = 0;

document.addEventListener('mousemove', e => {
  const now = Date.now();
  if (now - lastParticleTime < PARTICLE_GAP_MS) return;
  lastParticleTime = now;

  const p = document.createElement('span');
  p.className   = 'cursor-particle';
  p.textContent = PARTICLE_CHARS[Math.floor(Math.random() * PARTICLE_CHARS.length)];
  p.style.cssText = `left:${e.clientX}px;top:${e.clientY}px`;
  document.body.appendChild(p);
  setTimeout(() => p.remove(), PARTICLE_TTL_MS);
});

/* ── Init ── */
updateKeyButton();
updateNavButtons();
fetchAPOD(today);
