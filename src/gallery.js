import { STRIP_MAX_PHOTOS, STRIP_FILE_BORDER, STRIP_FILE_GAP, STRIP_FILE_BG } from "./constants.js";

const THUMB_WIDTH = 220;

// Owns the saved-snapshot strip: thumbnails, the "strip complete" message,
// and exporting everything as one stitched PNG.
export class Gallery {
  constructor(ui) {
    this.ui = ui;
    this.entries = [];
  }

  isStripFull() {
    return this.entries.length >= STRIP_MAX_PHOTOS;
  }

  add(snapshotCanvas) {
    if (this.isStripFull()) return;

    this.entries.push({ canvas: snapshotCanvas, time: Date.now() });
    this._renderThumb(snapshotCanvas, this.entries.length);
    this.ui.galleryCount.textContent = `${this.entries.length} / ${STRIP_MAX_PHOTOS}`;
    if (this.ui.galleryEmpty) this.ui.galleryEmpty.style.display = "none";

    if (this.isStripFull()) {
      this._showStripComplete();
    }
    this._updateDownloadAvailability();
  }

  reset() {
    this.entries = [];
    this.ui.galleryStrip.innerHTML = "";
    this.ui.galleryCount.textContent = `0 / ${STRIP_MAX_PHOTOS}`;
    if (this.ui.galleryEmpty) {
      this.ui.galleryEmpty.style.display = "block";
      this.ui.galleryStrip.appendChild(this.ui.galleryEmpty);
    }
    this._hideStripComplete();
    this._updateDownloadAvailability();
  }

  _renderThumb(snapshotCanvas, index) {
    const print = document.createElement("div");
    print.className = "print";

    const thumbCanvas = document.createElement("canvas");
    const scale = THUMB_WIDTH / snapshotCanvas.width;
    thumbCanvas.width = THUMB_WIDTH;
    thumbCanvas.height = Math.round(snapshotCanvas.height * scale);
    thumbCanvas.getContext("2d").drawImage(snapshotCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);

    const label = document.createElement("div");
    label.className = "print-label";
    label.textContent = `#${String(index).padStart(2, "0")}`;

    print.appendChild(thumbCanvas);
    print.appendChild(label);
    this.ui.galleryStrip.insertBefore(print, this.ui.galleryStrip.firstChild);
  }

  _showStripComplete() {
    if (this.ui.stripCompleteMsg) this.ui.stripCompleteMsg.classList.add("visible");
  }

  _hideStripComplete() {
    if (this.ui.stripCompleteMsg) this.ui.stripCompleteMsg.classList.remove("visible");
  }

  _updateDownloadAvailability() {
    if (!this.ui.downloadStripBtn) return;
    this.ui.downloadStripBtn.disabled = this.entries.length === 0;
  }

  download() {
    if (this.entries.length === 0) return;

    const entries = this.entries;
    const targetW = entries[0].canvas.width;
    const scaledHeights = entries.map((entry) =>
      Math.round(entry.canvas.height * (targetW / entry.canvas.width))
    );

    const totalH =
      STRIP_FILE_BORDER * 2 +
      scaledHeights.reduce((sum, h) => sum + h, 0) +
      STRIP_FILE_GAP * (entries.length - 1);
    const totalW = targetW + STRIP_FILE_BORDER * 2;

    const stripCanvas = document.createElement("canvas");
    stripCanvas.width = totalW;
    stripCanvas.height = totalH;
    const stripCtx = stripCanvas.getContext("2d");

    stripCtx.fillStyle = STRIP_FILE_BG;
    stripCtx.fillRect(0, 0, totalW, totalH);

    let cursorY = STRIP_FILE_BORDER;
    entries.forEach((entry, i) => {
      const h = scaledHeights[i];
      stripCtx.drawImage(entry.canvas, STRIP_FILE_BORDER, cursorY, targetW, h);
      cursorY += h + STRIP_FILE_GAP;
    });

    stripCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pinchpix_strip_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, "image/png");
  }
}
