/**
 * Video FPS & Resolution Display - Content Script
 * ページ内の動画要素を監視し、FPSと解像度をリアルタイム表示
 */

(function () {
  'use strict';

  const DEFAULT_SETTINGS = {
    enabled: true,
    position: 'top-right',
    textColor: '#00ff00'
  };

  const POSITION_STYLES = {
    'top-left': { top: '10px', left: '10px', right: 'auto', bottom: 'auto' },
    'top-right': { top: '10px', right: '10px', left: 'auto', bottom: 'auto' },
    'bottom-left': { bottom: '10px', left: '10px', right: 'auto', top: 'auto' },
    'bottom-right': { bottom: '10px', right: '10px', left: 'auto', top: 'auto' }
  };

  let overlay = null;
  let settings = { ...DEFAULT_SETTINGS };
  let videoTrackers = new Map();

  function createOverlay() {
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'video-fps-overlay';
    overlay.className = 'video-fps-overlay';
    overlay.innerHTML = '<div class="video-fps-content"><span class="video-fps-label">FPS: </span><span class="video-fps-value">--</span><br><span class="video-fps-label">解像度: </span><span class="video-fps-resolution">--</span></div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function updateOverlayStyle() {
    if (!overlay) return;

    const pos = POSITION_STYLES[settings.position] || POSITION_STYLES['top-right'];
    Object.assign(overlay.style, pos, {
      color: settings.textColor,
      display: settings.enabled ? 'block' : 'none'
    });
  }

  function updateOverlayContent(fps, width, height) {
    if (!overlay) return;

    const fpsEl = overlay.querySelector('.video-fps-value');
    const resEl = overlay.querySelector('.video-fps-resolution');

    if (fpsEl) fpsEl.textContent = fps !== null ? fps.toFixed(1) : '--';
    if (resEl) resEl.textContent = width && height ? `${width}×${height}` : '--';
  }

  const FPS_UPDATE_INTERVAL_MS = 500;  // 表示更新間隔
  const FPS_MEASURE_WINDOW_MS = 1000;  // FPS計測の集計窓
  const FPS_DISPLAY_MIN = 1;
  const FPS_DISPLAY_MAX = 240;

  function trackVideo(video) {
    if (videoTrackers.has(video)) return;

    const tracker = {
      frameCount: 0,
      windowStartTime: 0,
      windowStartFrames: 0,
      fps: 0,
      lastDisplayUpdate: 0,
      callbackId: null,
      rafId: null
    };

    function clampFPS(value) {
      if (value == null || !isFinite(value) || value < 0) return null;
      return Math.max(FPS_DISPLAY_MIN, Math.min(FPS_DISPLAY_MAX, Math.round(value * 10) / 10));
    }

    function updateDisplay() {
      if (!overlay || !settings.enabled) return;
      const now = performance.now();
      if (now - tracker.lastDisplayUpdate < FPS_UPDATE_INTERVAL_MS) return;
      tracker.lastDisplayUpdate = now;

      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      updateOverlayContent(tracker.fps, width, height);
    }

    function measureFPSWithRVFC(now, metadata) {
      const frames = metadata.presentedFrames;
      if (tracker.windowStartTime === 0) {
        tracker.windowStartTime = now;
        tracker.windowStartFrames = frames;
      }
      const elapsed = (now - tracker.windowStartTime) / 1000;
      if (elapsed >= FPS_MEASURE_WINDOW_MS / 1000) {
        const deltaFrames = frames - tracker.windowStartFrames;
        if (deltaFrames >= 0 && elapsed > 0) {
          tracker.fps = clampFPS(deltaFrames / elapsed);
        }
        tracker.windowStartTime = now;
        tracker.windowStartFrames = frames;
      }
      updateDisplay();
      tracker.callbackId = video.requestVideoFrameCallback(measureFPSWithRVFC);
    }

    function measureFPSWithRAF() {
      const quality = video.getVideoPlaybackQuality?.();
      const now = performance.now();
      const frames = quality?.totalVideoFrames ?? 0;

      if (tracker.windowStartTime === 0) {
        tracker.windowStartTime = now;
        tracker.windowStartFrames = frames;
      }
      const elapsed = (now - tracker.windowStartTime) / 1000;
      if (elapsed >= FPS_MEASURE_WINDOW_MS / 1000 && frames >= tracker.windowStartFrames) {
        const deltaFrames = frames - tracker.windowStartFrames;
        if (elapsed > 0) {
          tracker.fps = clampFPS(deltaFrames / elapsed);
        }
        tracker.windowStartTime = now;
        tracker.windowStartFrames = frames;
      }
      updateDisplay();
      tracker.rafId = requestAnimationFrame(measureFPSWithRAF);
    }

    function startTracking() {
      if (!video.videoWidth && !video.videoHeight) return;

      tracker.windowStartTime = 0;
      tracker.windowStartFrames = 0;

      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        tracker.callbackId = video.requestVideoFrameCallback(measureFPSWithRVFC);
      } else {
        tracker.rafId = requestAnimationFrame(measureFPSWithRAF);
      }
    }

    function stopTracking() {
      if (tracker.callbackId != null && 'cancelVideoFrameCallback' in HTMLVideoElement.prototype) {
        video.cancelVideoFrameCallback(tracker.callbackId);
        tracker.callbackId = null;
      }
      if (tracker.rafId != null) {
        cancelAnimationFrame(tracker.rafId);
        tracker.rafId = null;
      }
    }

    video.addEventListener('play', startTracking);
    video.addEventListener('pause', stopTracking);
    video.addEventListener('ended', stopTracking);
    video.addEventListener('loadedmetadata', () => {
      if (!video.paused) startTracking();
    });

    if (!video.paused) startTracking();
    videoTrackers.set(video, tracker);
  }

  function scanForVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach(trackVideo);
  }

  function init() {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
      settings = { ...DEFAULT_SETTINGS, ...stored };
      createOverlay();
      updateOverlayStyle();
      scanForVideos();
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.enabled) settings.enabled = changes.enabled.newValue;
    if (changes.position) settings.position = changes.position.newValue;
    if (changes.textColor) settings.textColor = changes.textColor.newValue;
    updateOverlayStyle();
  });

  const observer = new MutationObserver(() => scanForVideos());
  observer.observe(document.body, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
