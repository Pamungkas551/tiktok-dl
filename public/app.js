// Neubrutalism TikTok Downloader Frontend Logic
(() => {
  'use strict';

  // DOM Elements
  const form = document.getElementById('download-form');
  const urlInput = document.getElementById('tiktok-url');
  const btnPaste = document.getElementById('btn-paste');
  const btnClear = document.getElementById('btn-clear');
  const btnSubmit = document.getElementById('btn-submit');
  const btnRetry = document.getElementById('btn-retry');
  const btnReset = document.getElementById('btn-reset');

  // State Containers
  const stateEmpty = document.getElementById('state-empty');
  const stateLoading = document.getElementById('state-loading');
  const stateError = document.getElementById('state-error');
  const stateResult = document.getElementById('state-result');

  // Result Elements
  const resAvatar = document.getElementById('res-avatar');
  const resNickname = document.getElementById('res-nickname');
  const resUniqueId = document.getElementById('res-uniqueid');
  const resProvider = document.getElementById('res-provider');
  const resTitle = document.getElementById('res-title');
  const resVideoPlayer = document.getElementById('res-video-player');
  const resAudioPlayer = document.getElementById('res-audio-player');
  const videoWrapper = document.getElementById('video-preview-wrapper');
  const audioWrapper = document.getElementById('audio-preview-wrapper');
  const slideshowWrapper = document.getElementById('slideshow-wrapper');
  const slideshowGrid = document.getElementById('slideshow-grid');
  const slideCount = document.getElementById('slide-count');

  const btnDlHd = document.getElementById('btn-dl-hd');
  const btnDlSd = document.getElementById('btn-dl-sd');
  const btnDlMp3 = document.getElementById('btn-dl-mp3');

  const errorTitle = document.getElementById('error-title');
  const errorMessage = document.getElementById('error-message');
  const loadingStatusText = document.getElementById('loading-status-text');

  // History Elements
  const historySection = document.getElementById('history-section');
  const historyList = document.getElementById('history-list');
  const btnClearHistory = document.getElementById('btn-clear-history');

  const STORAGE_KEY = 'tiktok_dl_history_v1';

  // State Switcher
  function setState(state) {
    stateEmpty.classList.add('is-hidden');
    stateLoading.classList.add('is-hidden');
    stateError.classList.add('is-hidden');
    stateResult.classList.add('is-hidden');

    if (state === 'empty') stateEmpty.classList.remove('is-hidden');
    if (state === 'loading') stateLoading.classList.remove('is-hidden');
    if (state === 'error') stateError.classList.remove('is-hidden');
    if (state === 'result') stateResult.classList.remove('is-hidden');
  }

  // Loading Status Text Cycler
  let loadingInterval = null;
  const loadingMessages = [
    'Menghubungi server TikTok...',
    'Mengekstrak stream kualitas HD asli...',
    'Menyiapkan tautan tanpa watermark...',
    'Mengonfigurasi file audio MP3...'
  ];

  function startLoadingCycle() {
    let index = 0;
    loadingStatusText.textContent = loadingMessages[0];
    clearInterval(loadingInterval);
    loadingInterval = setInterval(() => {
      index = (index + 1) % loadingMessages.length;
      loadingStatusText.textContent = loadingMessages[index];
    }, 1800);
  }

  function stopLoadingCycle() {
    clearInterval(loadingInterval);
  }

  // Handle Clipboard Paste
  btnPaste.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          urlInput.value = text.trim();
          urlInput.focus();
        }
      } else {
        urlInput.focus();
      }
    } catch {
      urlInput.focus();
    }
  });

  // Handle Clear
  btnClear.addEventListener('click', () => {
    urlInput.value = '';
    urlInput.focus();
    stopPlayers();
    setState('empty');
  });

  function stopPlayers() {
    try {
      resVideoPlayer.pause();
      resVideoPlayer.removeAttribute('src');
      resVideoPlayer.load();
    } catch {}
    try {
      resAudioPlayer.pause();
      resAudioPlayer.removeAttribute('src');
      resAudioPlayer.load();
    } catch {}
  }

  // Process URL Submit
  async function processUrl(url) {
    if (!url || !url.trim()) {
      showError('URL KOSONG', 'Silakan tempel atau masukkan URL video TikTok.');
      return;
    }

    stopPlayers();
    setState('loading');
    startLoadingCycle();
    btnSubmit.disabled = true;

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url.trim() })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Gagal memproses URL TikTok');
      }

      displayResult(result.data, url.trim());
      saveToHistory(result.data);
      setState('result');
    } catch (err) {
      showError('GAGAL MEMPROSES', err.message || 'Terjadi kesalahan saat menghubungi server.');
    } finally {
      stopLoadingCycle();
      btnSubmit.disabled = false;
    }
  }

  // Display Result Data
  function displayResult(data, originalUrl) {
    // Creator Info
    resNickname.textContent = data.author?.nickname || 'TikTok Creator';
    resUniqueId.textContent = `@${data.author?.uniqueId || 'creator'}`;
    resProvider.textContent = `SERVER: ${String(data.provider || 'TIKWM').toUpperCase()}`;
    resTitle.textContent = data.title || 'Tanpa keterangan video';

    if (data.author?.avatar) {
      resAvatar.src = data.author.avatar;
    }

    // Video Player
    if (data.streams?.video) {
      videoWrapper.classList.remove('is-hidden');
      resVideoPlayer.src = data.streams.video;
    } else {
      videoWrapper.classList.add('is-hidden');
    }

    // Audio Player
    if (data.streams?.music) {
      audioWrapper.classList.remove('is-hidden');
      resAudioPlayer.src = data.streams.music;
    } else {
      audioWrapper.classList.add('is-hidden');
    }

    // Download Links
    if (data.downloads?.videoHd) {
      btnDlHd.href = data.downloads.videoHd;
      btnDlHd.classList.remove('is-hidden');
    } else {
      btnDlHd.classList.add('is-hidden');
    }

    if (data.downloads?.videoSd) {
      btnDlSd.href = data.downloads.videoSd;
      btnDlSd.classList.remove('is-hidden');
    } else {
      btnDlSd.classList.add('is-hidden');
    }

    if (data.downloads?.music) {
      btnDlMp3.href = data.downloads.music;
      btnDlMp3.classList.remove('is-hidden');
    } else {
      btnDlMp3.classList.add('is-hidden');
    }

    // Slideshow images (if any)
    slideshowGrid.innerHTML = '';
    if (Array.isArray(data.images) && data.images.length > 0) {
      slideshowWrapper.classList.remove('is-hidden');
      slideCount.textContent = data.images.length;

      data.images.forEach((imgUrl, idx) => {
        const item = document.createElement('div');
        item.className = 'slide-item';
        item.innerHTML = `
          <img src="${imgUrl}" alt="Slide foto ${idx + 1}" class="slide-img" loading="lazy">
          <a href="/api/download?url=${encodeURIComponent(imgUrl)}&filename=tiktok_slide_${idx + 1}.jpg" class="nb-btn btn-small btn-secondary" download>
            FOTO ${idx + 1}
          </a>
        `;
        slideshowGrid.appendChild(item);
      });
    } else {
      slideshowWrapper.classList.add('is-hidden');
    }
  }

  function showError(title, message) {
    errorTitle.textContent = title;
    errorMessage.textContent = message;
    setState('error');
  }

  // Form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    processUrl(urlInput.value);
  });

  // Retry & Reset buttons
  btnRetry.addEventListener('click', () => {
    processUrl(urlInput.value);
  });

  btnReset.addEventListener('click', () => {
    urlInput.value = '';
    urlInput.focus();
    stopPlayers();
    setState('empty');
  });

  // Keyboard navigation: Escape key closes players / resets error
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      stopPlayers();
    }
  });

  // Local Storage History Management
  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        historySection.classList.add('is-hidden');
        return;
      }
      const list = JSON.parse(raw);
      if (!Array.isArray(list) || list.length === 0) {
        historySection.classList.add('is-hidden');
        return;
      }

      historyList.innerHTML = '';
      list.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
          <div class="history-info">
            <span class="history-caption">${escapeHtml(item.title || 'TikTok Video')}</span>
            <span class="history-author">@${escapeHtml(item.author || 'creator')}</span>
          </div>
          <div class="history-actions">
            ${item.hdUrl ? `<a href="${item.hdUrl}" class="nb-btn btn-small btn-success" download>MP4 HD</a>` : ''}
            ${item.mp3Url ? `<a href="${item.mp3Url}" class="nb-btn btn-small btn-accent" download>MP3</a>` : ''}
          </div>
        `;
        historyList.appendChild(li);
      });

      historySection.classList.remove('is-hidden');
    } catch {
      historySection.classList.add('is-hidden');
    }
  }

  function saveToHistory(data) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];

      const newItem = {
        id: data.id,
        title: data.title || 'TikTok Video',
        author: data.author?.uniqueId || 'creator',
        hdUrl: data.downloads?.videoHd || null,
        mp3Url: data.downloads?.music || null,
        timestamp: Date.now()
      };

      // Filter duplicate ID
      list = list.filter((item) => item.id !== newItem.id);
      list.unshift(newItem);
      if (list.length > 5) list = list.slice(0, 5);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      loadHistory();
    } catch {}
  }

  btnClearHistory.addEventListener('click', () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      loadHistory();
    } catch {}
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Initialize
  loadHistory();
  setState('empty');
})();
