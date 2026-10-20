import { GRID, HAND_CONNECTIONS, THEME } from "./constants.js";
import { toPixel, mirrorLandmarkX, isPointInBoard } from "./geometry.js";

// All functions here are pure with respect to app state: they read what
// they're given and draw to ctx, nothing more.

export function drawVideoFrame(ctx, videoEl, canvas) {
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

export function drawLiveFrameOverlay(ctx, box) {
  ctx.save();
  ctx.strokeStyle = THEME.accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(box.x, box.y, box.width, box.height);

  const cornerLen = 18;
  ctx.lineWidth = 4;
  const corners = [
    [box.x, box.y, 1, 1],
    [box.x + box.width, box.y, -1, 1],
    [box.x, box.y + box.height, 1, -1],
    [box.x + box.width, box.y + box.height, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + cornerLen * dy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + cornerLen * dx, cy);
    ctx.stroke();
  }
  ctx.restore();
}

// Draws the countdown border, dimming overlay, and big number. The
// photobooth BW effect on the region itself is applied separately
// (see effects.applyBWInsideBox) before this is called.
export function drawCountdownOverlay(ctx, box, remainingWhole) {
  ctx.save();
  ctx.strokeStyle = THEME.accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(box.x, box.y, box.width, box.height);

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  ctx.fillStyle = THEME.countdownDim;
  ctx.fillRect(box.x, box.y, box.width, box.height);

  ctx.font = `${Math.max(48, Math.min(box.width, box.height) * 0.4)}px ${THEME.mono}`;
  ctx.fillStyle = THEME.accent;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(remainingWhole), cx, cy);
  ctx.restore();
}

export function drawHandSkeleton(ctx, landmarksPx) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = THEME.skeletonLine;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;

  for (const [iA, iB] of HAND_CONNECTIONS) {
    const a = landmarksPx[iA];
    const b = landmarksPx[iB];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  ctx.shadowBlur = 6;
  ctx.fillStyle = "white";
  for (const p of landmarksPx) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Only draws skeletons for hands currently hovering over the puzzle board.
export function drawHandSkeletonsOverBoard(ctx, handsLandmarks, box, canvas) {
  if (!box || !handsLandmarks || handsLandmarks.length === 0) return;

  for (const lm of handsLandmarks) {
    const landmarksPx = lm.map((pt) => toPixel(mirrorLandmarkX(pt), canvas));
    const overBoard = landmarksPx.some((p) => isPointInBoard(p.x, p.y, box));
    if (overBoard) {
      drawHandSkeleton(ctx, landmarksPx);
    }
  }
}

export function drawBoardAndPieces(ctx, puzzleBoard) {
  const box = puzzleBoard.boardBox;

  ctx.save();
  ctx.fillStyle = THEME.boardFillEmpty;
  ctx.fillRect(box.x, box.y, box.width, box.height);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = THEME.accentGridLine;
  ctx.lineWidth = 1;
  for (let i = 1; i < GRID; i++) {
    ctx.beginPath();
    ctx.moveTo(box.x + i * puzzleBoard.tileW, box.y);
    ctx.lineTo(box.x + i * puzzleBoard.tileW, box.y + box.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(box.x, box.y + i * puzzleBoard.tileH);
    ctx.lineTo(box.x + box.width, box.y + i * puzzleBoard.tileH);
    ctx.stroke();
  }
  ctx.restore();

  if (puzzleBoard.showHint && puzzleBoard.fullPhotoboothCanvas) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.drawImage(puzzleBoard.fullPhotoboothCanvas, box.x, box.y);
    ctx.restore();
  }

  const sorted = [...puzzleBoard.pieces].sort(
    (a, b) => (a.dragging ? 1 : 0) - (b.dragging ? 1 : 0)
  );

  for (const piece of sorted) {
    ctx.save();
    if (piece.dragging) {
      ctx.shadowColor = THEME.dragGlow;
      ctx.shadowBlur = 14;
    }
    ctx.drawImage(piece.canvas, piece.x, piece.y, piece.w, piece.h);
    ctx.strokeStyle = piece.placed ? THEME.pieceBorderPlaced : THEME.pieceBorderIdle;
    ctx.lineWidth = piece.dragging ? 3 : 1.5;
    ctx.strokeRect(piece.x, piece.y, piece.w, piece.h);
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = puzzleBoard.solved ? THEME.success : THEME.accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.restore();

  if (puzzleBoard.solved) {
    ctx.save();
    ctx.fillStyle = THEME.solvedOverlayFill;
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.font = `${Math.max(20, box.width * 0.07)}px ${THEME.mono}`;
    ctx.fillStyle = THEME.success;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SOLVED — make a fist to save", box.x + box.width / 2, box.y + box.height / 2);
    ctx.restore();
  }
}
