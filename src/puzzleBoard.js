import { GRID, SNAP_DISTANCE_RATIO, DISPLACE_ANIM_MS } from "./constants.js";

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Owns the puzzle's board box, sliced piece canvases, and their layout
// state (position, placed/dragging flags). Slicing, shuffling, snapping,
// and the "bump the occupant out of the way" displacement animation all
// live here.
export class PuzzleBoard {
  constructor() {
    this.reset();
  }

  reset() {
    this.boardBox = null;
    this.pieces = [];
    this.solved = false;
    this.tileW = 0;
    this.tileH = 0;
    this.fullPhotoboothCanvas = null;
    this.moves = 0;
    this.startedAt = 0;
    this.showHint = false;
  }

  // Slices a captured (already photobooth-filtered) canvas into a GRID x
  // GRID puzzle, shuffles piece positions within the board box, and snaps
  // any piece that happened to land near its own cell.
  buildFromCapture(cropCanvas, box) {
    const tileW = Math.floor(cropCanvas.width / GRID);
    const tileH = Math.floor(cropCanvas.height / GRID);
    const pieces = [];

    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const sx = col * tileW;
        const sy = row * tileH;
        const w = col === GRID - 1 ? cropCanvas.width - sx : tileW;
        const h = row === GRID - 1 ? cropCanvas.height - sy : tileH;

        const pieceCanvas = document.createElement("canvas");
        pieceCanvas.width = w;
        pieceCanvas.height = h;
        pieceCanvas.getContext("2d").drawImage(cropCanvas, sx, sy, w, h, 0, 0, w, h);

        pieces.push({
          row, col,
          canvas: pieceCanvas,
          w, h,
          x: 0, y: 0,
          placed: false,
          dragging: false,
        });
      }
    }

    const slots = [];
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        slots.push({ x: box.x + col * tileW, y: box.y + row * tileH });
      }
    }
    shuffle(slots);

    this.boardBox = box;
    this.pieces = pieces;
    this.tileW = tileW;
    this.tileH = tileH;
    this.fullPhotoboothCanvas = cropCanvas;

    pieces.forEach((piece, i) => {
      piece.x = slots[i].x;
      piece.y = slots[i].y;
      if (this.isNearOwnCell(piece)) {
        this.snapPieceToCell(piece);
      }
    });

    this.solved = pieces.every((p) => p.placed);
  }

  isNearOwnCell(piece) {
    const box = this.boardBox;
    const correctX = box.x + piece.col * this.tileW;
    const correctY = box.y + piece.row * this.tileH;
    const dx = piece.x - correctX;
    const dy = piece.y - correctY;
    const tolerance = Math.min(this.tileW, this.tileH) * SNAP_DISTANCE_RATIO;
    return Math.sqrt(dx * dx + dy * dy) < tolerance;
  }

  reconcilePlacedState() {
    if (!this.boardBox || !this.pieces.length) return false;
    for (const piece of this.pieces) {
      if (piece.displacing || piece.dragging) continue;
      piece.placed = this.isNearOwnCell(piece);
    }
    return this.pieces.every((p) => p.placed);
  }

  snapPieceToCell(piece) {
    this.displaceCellOccupant(piece, piece.row, piece.col);
    const box = this.boardBox;
    piece.x = box.x + piece.col * this.tileW;
    piece.y = box.y + piece.row * this.tileH;
    piece.placed = true;
  }

  // If another piece already occupies the target cell, bump it out to a
  // free cell (or back onto itself, jittered, if the board is full).
  displaceCellOccupant(piece, targetRow, targetCol) {
    const box = this.boardBox;
    const tileW = this.tileW;
    const tileH = this.tileH;
    const cellX = box.x + targetCol * tileW;
    const cellY = box.y + targetRow * tileH;

    const occupant = this.pieces.find((p) => {
      if (p === piece || p.displacing) return false;
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      return cx >= cellX && cx < cellX + tileW && cy >= cellY && cy < cellY + tileH;
    });
    if (!occupant) return;

    if (occupant.row === targetRow && occupant.col === targetCol && occupant.placed) {
      return;
    }

    occupant.placed = false;

    const freeCells = [];
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        if (row === targetRow && col === targetCol) continue;
        const cx0 = box.x + col * tileW;
        const cy0 = box.y + row * tileH;
        const taken = this.pieces.some((p) => {
          if (p === occupant || p === piece || p.displacing) return false;
          const cx = p.x + p.w / 2;
          const cy = p.y + p.h / 2;
          return cx >= cx0 && cx < cx0 + tileW && cy >= cy0 && cy < cy0 + tileH;
        });
        if (!taken) freeCells.push({ row, col });
      }
    }

    let targetSlot;
    if (freeCells.length > 0) {
      targetSlot = freeCells[Math.floor(Math.random() * freeCells.length)];
    } else {
      targetSlot = { row: occupant.row, col: occupant.col };
    }

    const jitterX = (Math.random() - 0.5) * tileW * 0.5;
    const jitterY = (Math.random() - 0.5) * tileH * 0.5;
    const targetX = box.x + targetSlot.col * tileW + jitterX;
    const targetY = box.y + targetSlot.row * tileH + jitterY;

    this.animateDisplacement(occupant, targetX, targetY);
  }

  animateDisplacement(piece, targetX, targetY) {
    const startX = piece.x;
    const startY = piece.y;
    const startedAt = performance.now();

    piece.displacing = true;

    const step = () => {
      const t = Math.min(1, (performance.now() - startedAt) / DISPLACE_ANIM_MS);
      const eased = 1 - Math.pow(1 - t, 3);

      piece.x = startX + (targetX - startX) * eased;
      piece.y = startY + (targetY - startY) * eased;

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        piece.x = targetX;
        piece.y = targetY;
        piece.displacing = false;
        this.clampPieceToBoard(piece);
      }
    };

    requestAnimationFrame(step);
  }

  findNearestPiece(px, py) {
    let best = null;
    let bestDist = Infinity;
    for (const piece of this.pieces) {
      if (piece.displacing) continue;
      const cx = piece.x + piece.w / 2;
      const cy = piece.y + piece.h / 2;
      const d = Math.hypot(px - cx, py - cy);
      if (d < Math.max(piece.w, piece.h) * 0.75 && d < bestDist) {
        best = piece;
        bestDist = d;
      }
    }
    return best;
  }

  clampPieceToBoard(piece) {
    const box = this.boardBox;
    piece.x = Math.min(Math.max(piece.x, box.x), box.x + box.width - piece.w);
    piece.y = Math.min(Math.max(piece.y, box.y), box.y + box.height - piece.h);
  }

  get placedCount() {
    return this.pieces.filter((p) => p.placed).length;
  }
}
