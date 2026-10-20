import { LM, FIST_HOLD_FRAMES, LOAD_TIMEOUT_MS } from "./constants.js";
import { AppState } from "./states.js";
import { UI } from "./dom.js";
import { isPinching, isFist, toPixel, mirrorLandmarkX } from "./geometry.js";
import { applyBWInsideBox } from "./effects.js";
import {
  drawVideoFrame,
  drawLiveFrameOverlay,
  drawCountdownOverlay,
  drawBoardAndPieces,
  drawHandSkeletonsOverBoard,
} from "./renderer.js";
import { initWebcam, initHandLandmarker } from "./mediaPipeService.js";
import { PuzzleBoard } from "./puzzleBoard.js";
import { DragController } from "./dragController.js";
import { ShatterEffect } from "./shatterEffect.js";
import { Gallery } from "./gallery.js";
import { TrackingFrameSelector } from "./trackingFrame.js";
import { CountdownTimer } from "./countdown.js";
import { captureFrame } from "./capture.js";
import { Sfx } from "./sfx.js";

const STRIP_FULL_TEXT = "strip complete — download or reset";

// Top-level orchestrator: owns the state machine and the render loop,
// and wires every feature module together. Individual modules don't
// know about each other; this is the only place that does.
export class App {
  constructor() {
    this.ui = new UI();

    this.state = AppState.TRACKING;
    this.handLandmarker = null;
    this.fistHoldCounter = 0;
    this.countdownBox = null;
    this.pendingGalleryCanvas = null;
    this.sfx = new Sfx();
    this.lastPlaced = 0;
    this.lastSolved = false;
    this.lastTick = 0;
    this.pointerDown = false;

    this.puzzleBoard = new PuzzleBoard();
    this.dragController = new DragController(this.puzzleBoard);
    this.shatterEffect = new ShatterEffect();
    this.gallery = new Gallery(this.ui);
    this.trackingFrameSelector = new TrackingFrameSelector();
    this.countdownTimer = new CountdownTimer();

    this._renderLoop = this._renderLoop.bind(this);
    this._wireEvents();
  }

  _wireEvents() {
    window.addEventListener("resize", () => this.ui.fitCanvasToWindow());

    this._wirePointerAndKeys();
    this.ui.loaderRetry.addEventListener("click", () => this.boot());

    if (this.ui.downloadStripBtn) {
      this.ui.downloadStripBtn.addEventListener("click", () => this.gallery.download());
    }

    if (this.ui.resetAllBtn) {
      this.ui.resetAllBtn.addEventListener("click", () => {
        const confirmed = window.confirm(
          "Are you sure you want to clear the whole photo strip and start over?"
        );
        if (confirmed) this._resetEverything();
      });
    }
  }

  // Mouse / touch / keyboard fallback so the game works without hand tracking.
  _wirePointerAndKeys() {
    const canvas = this.ui.canvas;
    const toCanvas = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * canvas.width) / r.width, y: ((e.clientY - r.top) * canvas.height) / r.height };
    };
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", (e) => {
      if (this.state !== AppState.PUZZLE) return;
      this.pointerDown = true;
      canvas.setPointerCapture?.(e.pointerId);
      this.dragController.handleDragForHand("M", true, toCanvas(e));
    });
    canvas.addEventListener("pointermove", (e) => {
      if (this.pointerDown) this.dragController.handleDragForHand("M", true, toCanvas(e));
    });
    const up = (e) => {
      if (!this.pointerDown) return;
      this.pointerDown = false;
      this.dragController.handleDragForHand("M", false, toCanvas(e));
    };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    const $ = (id) => document.getElementById(id);
    $("captureBtn")?.addEventListener("click", () => this.startManualCapture());
    $("hintBtn")?.addEventListener("click", () => this.toggleHint());
    $("soundBtn")?.addEventListener("click", () => {
      this.sfx.muted = !this.sfx.muted;
      $("soundBtn").textContent = this.sfx.muted ? "🔇 Sound off" : "🔊 Sound on";
    });
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (k === "c") this.startManualCapture();
      else if (k === "h") this.toggleHint();
      else if (k === "s" && this.state === AppState.PUZZLE) this._handleFistReset();
      else if (k === "r") this._resetPuzzleOnly();
    });
  }

  startManualCapture() {
    if (this.state !== AppState.TRACKING || this.gallery.isStripFull() || !this.handLandmarker) return;
    const c = this.ui.canvas;
    const w = c.width * 0.6, h = c.height * 0.6;
    this.countdownBox = { x: (c.width - w) / 2, y: (c.height - h) / 2, width: w, height: h };
    this.state = AppState.COUNTDOWN;
    this.countdownTimer.start();
  }

  toggleHint() {
    this.puzzleBoard.showHint = !this.puzzleBoard.showHint;
  }

  async boot() {
    this.ui.showLoaderPending("loading HandLandmarker model…");

    let settled = false;
    const watchdogMs = LOAD_TIMEOUT_MS * 2 + 5000;
    const watchdog = setTimeout(() => {
      if (!settled) {
        this.ui.showLoaderError("Loading is taking too long. Press retry or check your connection.");
      }
    }, watchdogMs);

    try {
      if (!this.ui.videoEl.srcObject) {
        await initWebcam(this.ui.videoEl, this.ui.canvas, () => this.ui.fitCanvasToWindow());
      }

      this.handLandmarker = await initHandLandmarker();

      settled = true;
      clearTimeout(watchdog);
      this.ui.hideLoader();
      this.ui.setStatus("ready");
      requestAnimationFrame(this._renderLoop);
    } catch (err) {
      settled = true;
      clearTimeout(watchdog);
      if (err && err.name === "NotAllowedError") {
        this.ui.showLoaderError("Camera permission denied. Enable it in your browser settings and press retry.");
      } else if (err && err.name === "NotFoundError") {
        this.ui.showLoaderError("No webcam was found.");
      } else {
        this.ui.showLoaderError((err && err.message) || "Error starting the app.");
      }
    }
  }

  _renderLoop() {
    if (this.ui.videoEl.readyState >= 2 && this.handLandmarker) {
      drawVideoFrame(this.ui.ctx, this.ui.videoEl, this.ui.canvas);
      const nowMs = performance.now();
      const result = this.handLandmarker.detectForVideo(this.ui.videoEl, nowMs);
      this._processResults(result);
      if (this.state === AppState.PUZZLE) this._updateProgressBadge();
    }
    requestAnimationFrame(this._renderLoop);
  }

  _processResults(result) {
    if (this.state === AppState.SHATTERING) {
      const finished = this.shatterEffect.updateAndDraw(this.ui.ctx);
      this.ui.setStatus("saving…");
      if (finished) this._finishShatter();
      return;
    }

    const handsLandmarks = result.landmarks || [];
    const noHands = handsLandmarks.length === 0;

    if (noHands) {
      this._handleNoHands();
      return;
    }

    this._handleHandsPresent(handsLandmarks);
  }

  _handleNoHands() {
    this.ui.setStatusDotClass(this.puzzleBoard.solved ? "status-dot solved" : "status-dot");
    this.fistHoldCounter = 0;

    if (this.dragController.activeHand !== "M") this.dragController.releaseHand(this.dragController.activeHand);

    if (this.state === AppState.TRACKING) {
      this._drawGraceFrameIfAny();
      this.ui.setStatus(this.gallery.isStripFull() ? STRIP_FULL_TEXT : "searching for hands…");
      return;
    }

    if (this.state === AppState.COUNTDOWN) {
      this._drawCountdown();
      return;
    }

    if (this.state === AppState.PUZZLE) {
      this.puzzleBoard.solved = this.puzzleBoard.reconcilePlacedState();
      this._updateProgressBadge();
      drawBoardAndPieces(this.ui.ctx, this.puzzleBoard);
      this.ui.setStatus(
        this.puzzleBoard.solved
          ? "puzzle complete! make a fist to save it"
          : "assemble the puzzle with a pinch"
      );
    }
  }

  _handleHandsPresent(handsLandmarks) {
    this.ui.setStatusDotClass(this.puzzleBoard.solved ? "status-dot solved" : "status-dot live");

    const anyFist = handsLandmarks.some((lm) => isFist(lm));
    const draggingNow = this.dragController.isDragging;
    if (anyFist && !draggingNow && this.state !== AppState.TRACKING) {
      this.fistHoldCounter++;
      if (this.fistHoldCounter >= FIST_HOLD_FRAMES) {
        this.fistHoldCounter = 0;
        this._handleFistReset();
        return;
      }
    } else {
      this.fistHoldCounter = 0;
    }

    if (this.state === AppState.TRACKING) {
      this._handleTracking(handsLandmarks);
      return;
    }

    if (this.state === AppState.COUNTDOWN) {
      this._drawCountdown();
      return;
    }

    if (this.state === AppState.PUZZLE) {
      this._handlePuzzle(handsLandmarks);
    }
  }

  _handleTracking(handsLandmarks) {
    if (this.gallery.isStripFull()) {
      this.ui.setStatus(STRIP_FULL_TEXT);
      return;
    }

    if (handsLandmarks.length !== 2) {
      this._drawGraceFrameIfAny();
      this.ui.setStatus("tracking hands…");
      return;
    }

    const [handA, handB] = handsLandmarks;
    const { liveFrame, frameBox, armed, shouldStartCountdown } =
      this.trackingFrameSelector.updateTwoHands(handA, handB, this.ui.canvas);

    if (liveFrame) {
      applyBWInsideBox(this.ui.ctx, this.ui.canvas.width, this.ui.canvas.height, liveFrame);
      drawLiveFrameOverlay(this.ui.ctx, liveFrame);
    }

    if (armed) {
      this.ui.setStatusDotClass("status-dot armed");
      this.ui.setStatus("hold the pinch…");
    } else {
      this.ui.setStatus("tracking hands…");
    }

    if (shouldStartCountdown) {
      this.countdownBox = { ...frameBox };
      this.state = AppState.COUNTDOWN;
      this.countdownTimer.start();
    }
  }

  _drawGraceFrameIfAny() {
    const graceBox = this.trackingFrameSelector.graceFrame();
    if (graceBox) {
      applyBWInsideBox(this.ui.ctx, this.ui.canvas.width, this.ui.canvas.height, graceBox);
      drawLiveFrameOverlay(this.ui.ctx, graceBox);
    }
  }

  _drawCountdown() {
    const box = this.countdownBox;
    const remaining = this.countdownTimer.remaining;

    if (remaining <= 0) {
      this._finishCountdownAndCapture(box);
      return;
    }

    applyBWInsideBox(this.ui.ctx, this.ui.canvas.width, this.ui.canvas.height, box);
    const n = Math.ceil(remaining);
    if (n !== this.lastTick) { this.lastTick = n; this.sfx.tick(); }
    drawCountdownOverlay(this.ui.ctx, box, n);
    this.ui.setStatus(`capturing in ${n}…`);
  }

  _finishCountdownAndCapture(box) {
    const cropCanvas = captureFrame(this.ui.videoEl, this.ui.canvas, box);
    this.puzzleBoard.buildFromCapture(cropCanvas, box);
    this.puzzleBoard.startedAt = performance.now();
    this.lastPlaced = this.puzzleBoard.placedCount;
    this.lastSolved = false;
    this.sfx.shutter();
    this.state = AppState.PUZZLE;
    this.fistHoldCounter = 0;
    this._updateProgressBadge();
  }

  _handlePuzzle(handsLandmarks) {
    const labelsPresent = new Set();
    handsLandmarks.forEach((lm, i) => {
      const label = i === 0 ? "A" : "B";
      labelsPresent.add(label);
      const pinching = isPinching(lm);
      const indexPx = toPixel(mirrorLandmarkX(lm[LM.INDEX_TIP]), this.ui.canvas);
      this.dragController.handleDragForHand(label, pinching, indexPx);
    });

    if (this.dragController.activeHand && this.dragController.activeHand !== "M" && !labelsPresent.has(this.dragController.activeHand)) {
      this.dragController.releaseHand(this.dragController.activeHand);
    }

    if (!this.dragController.piece) {
      this.puzzleBoard.solved = this.puzzleBoard.reconcilePlacedState();
      this._updateProgressBadge();
    }

    drawBoardAndPieces(this.ui.ctx, this.puzzleBoard);
    drawHandSkeletonsOverBoard(this.ui.ctx, handsLandmarks, this.puzzleBoard.boardBox, this.ui.canvas);

    this.ui.setStatus(
      this.puzzleBoard.solved
        ? this.fistHoldCounter > 0
          ? `saving… hold the fist (${this.fistHoldCounter}/${FIST_HOLD_FRAMES})`
          : "puzzle complete! make a fist to save it"
        : "assemble the puzzle with a pinch"
    );
  }

  _handleFistReset() {
    if (this.state !== AppState.PUZZLE) {
      this.ui.setStatus("reset (fist)");
      this._resetPuzzleOnly();
      return;
    }

    const reallySolved = this.puzzleBoard.reconcilePlacedState();
    this.puzzleBoard.solved = reallySolved;

    if (reallySolved && this.puzzleBoard.fullPhotoboothCanvas) {
      this.pendingGalleryCanvas = this.puzzleBoard.fullPhotoboothCanvas;
      this.shatterEffect.start(this.puzzleBoard.fullPhotoboothCanvas, this.puzzleBoard.boardBox);
      this.state = AppState.SHATTERING;
    } else {
      this.ui.setStatus("reset (fist)");
      this._resetPuzzleOnly();
    }
  }

  _finishShatter() {
    if (this.pendingGalleryCanvas) {
      this.gallery.add(this.pendingGalleryCanvas);
      this.ui.setStatus("saved to the strip!");
      this.pendingGalleryCanvas = null;
    }
    this._resetPuzzleOnly();
  }

  _resetPuzzleOnly() {
    this.puzzleBoard.reset();
    this.state = AppState.TRACKING;
    this.dragController.activeHand = null;
    this.dragController.piece = null;
    this.shatterEffect.active = false;
    this.shatterEffect.fragments = [];
    this.pendingGalleryCanvas = null;
    this.fistHoldCounter = 0;
    this.trackingFrameSelector.reset();
    this.lastPlaced = 0;
    this.lastSolved = false;
    this._updateProgressBadge();
  }

  _resetEverything() {
    this.gallery.reset();
    this._resetPuzzleOnly();
    this.ui.setStatus("everything reset");
  }

  _updateProgressBadge() {
    const b = this.puzzleBoard;
    if (this.state === AppState.PUZZLE) {
      if (b.placedCount > this.lastPlaced) this.sfx.snap();
      this.lastPlaced = b.placedCount;
      if (b.solved && !this.lastSolved) this.sfx.win();
      this.lastSolved = b.solved;
    }
    const secs = b.startedAt ? Math.floor((performance.now() - b.startedAt) / 1000) : 0;
    this.ui.updateProgressBadge(
      this.state === AppState.PUZZLE,
      b.placedCount,
      b.pieces.length,
      b.solved,
      ` · ${b.moves} moves · ${secs}s`
    );
  }
}
