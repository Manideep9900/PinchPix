// Central place that owns every DOM lookup and simple UI mutation,
// so the rest of the app never touches document.* directly.
export class UI {
  constructor() {
    this.videoEl = document.getElementById("webcam");
    this.canvas = document.getElementById("sceneCanvas");
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    this.stageEl = document.getElementById("stage");

    this.statusDot = document.getElementById("statusDot");
    this.statusText = document.getElementById("statusText");

    this.progressBadge = document.getElementById("progressBadge");
    this.progressText = document.getElementById("progressText");

    this.loadingOverlay = document.getElementById("loadingOverlay");
    this.loaderText = document.getElementById("loaderText");
    this.loaderRetry = document.getElementById("loaderRetry");

    this.errorBanner = document.getElementById("errorBanner");

    this.galleryStrip = document.getElementById("galleryStrip");
    this.galleryEmpty = document.getElementById("galleryEmpty");
    this.galleryCount = document.getElementById("galleryCount");
    this.downloadStripBtn = document.getElementById("downloadStripBtn");
    this.resetAllBtn = document.getElementById("resetAllBtn");
    this.stripCompleteMsg = document.getElementById("stripCompleteMsg");
  }

  setStatus(text) {
    this.statusText.textContent = text;
  }

  setStatusDotClass(className) {
    this.statusDot.className = className;
  }

  fitCanvasToWindow() {
    const vw = this.stageEl.clientWidth;
    const vh = this.stageEl.clientHeight;
    const videoAspect = this.canvas.width / this.canvas.height;
    const containerAspect = vw / vh;

    let cssWidth, cssHeight;
    if (containerAspect > videoAspect) {
      cssWidth = vw;
      cssHeight = vw / videoAspect;
    } else {
      cssHeight = vh;
      cssWidth = vh * videoAspect;
    }

    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
  }

  showLoaderPending(message) {
    this.loadingOverlay.classList.remove("hidden");
    this.loaderText.classList.remove("is-error");
    this.loaderText.textContent = message;
    this.loaderRetry.classList.add("hidden");
    this.errorBanner.classList.remove("visible");
  }

  showLoaderError(message) {
    this.loaderText.textContent = message;
    this.loaderText.classList.add("is-error");
    this.loaderRetry.classList.remove("hidden");
  }

  hideLoader() {
    this.loadingOverlay.classList.add("hidden");
  }

  showError(message) {
    this.errorBanner.textContent = message;
    this.errorBanner.classList.add("visible");
  }

  updateProgressBadge(visible, placedCount, totalCount, solved, extra = "") {
    if (!visible) {
      this.progressBadge.classList.remove("visible", "solved");
      return;
    }
    this.progressText.textContent = `${placedCount} / ${totalCount} pieces placed${extra}`;
    this.progressBadge.classList.add("visible");
    this.progressBadge.classList.toggle("solved", solved);
  }
}
