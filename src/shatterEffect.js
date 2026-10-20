import { SHATTER_COLS, SHATTER_ROWS, SHATTER_DURATION_MS } from "./constants.js";

// The "shatter into fragments and fly apart" animation played when a
// solved puzzle is saved to the gallery.
export class ShatterEffect {
  constructor() {
    this.active = false;
    this.startedAt = 0;
    this.fragments = [];
  }

  start(sourceCanvas, box) {
    const cols = SHATTER_COLS;
    const rows = SHATTER_ROWS;
    const fragW = sourceCanvas.width / cols;
    const fragH = sourceCanvas.height / rows;
    const fragments = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const sx = col * fragW;
        const sy = row * fragH;

        const fragCanvas = document.createElement("canvas");
        fragCanvas.width = Math.ceil(fragW);
        fragCanvas.height = Math.ceil(fragH);
        fragCanvas
          .getContext("2d")
          .drawImage(sourceCanvas, sx, sy, fragW, fragH, 0, 0, fragCanvas.width, fragCanvas.height);

        const cx = box.x + sx + fragW / 2;
        const cy = box.y + sy + fragH / 2;

        const boardCx = box.x + box.width / 2;
        const boardCy = box.y + box.height / 2;
        const dirX = cx - boardCx;
        const dirY = cy - boardCy;
        const dirLen = Math.max(1, Math.hypot(dirX, dirY));
        const speed = 90 + Math.random() * 160;

        fragments.push({
          canvas: fragCanvas,
          x: cx,
          y: cy,
          w: fragW,
          h: fragH,
          vx: (dirX / dirLen) * speed + (Math.random() - 0.5) * 40,
          vy: (dirY / dirLen) * speed + (Math.random() - 0.5) * 40 - 60,
          rotation: 0,
          rotationSpeed: (Math.random() - 0.5) * 6,
          gravity: 220 + Math.random() * 80,
        });
      }
    }

    this.fragments = fragments;
    this.active = true;
    this.startedAt = performance.now();
  }

  // Advances physics and draws the current frame. Returns true once the
  // animation has finished (caller should then stop calling update).
  updateAndDraw(ctx) {
    const elapsedMs = performance.now() - this.startedAt;
    const t = Math.min(1, elapsedMs / SHATTER_DURATION_MS);

    if (t >= 1) {
      this.active = false;
      this.fragments = [];
      return true;
    }

    const dt = 1 / 60;
    const fadeStart = 0.45;

    ctx.save();
    for (const frag of this.fragments) {
      frag.x += frag.vx * dt;
      frag.y += frag.vy * dt;
      frag.vy += frag.gravity * dt;
      frag.rotation += frag.rotationSpeed * dt;

      const alpha = t < fadeStart ? 1 : Math.max(0, 1 - (t - fadeStart) / (1 - fadeStart));
      const scale = 1 - t * 0.25;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(frag.x, frag.y);
      ctx.rotate(frag.rotation);
      ctx.scale(scale, scale);
      ctx.drawImage(frag.canvas, -frag.w / 2, -frag.h / 2, frag.w, frag.h);
      ctx.restore();
    }
    ctx.restore();

    return false;
  }
}
