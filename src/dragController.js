import { GRID } from "./constants.js";

// Tracks which hand (if any) is currently pinch-dragging a puzzle piece,
// and applies drop/snap/displace logic on release.
export class DragController {
  constructor(puzzleBoard) {
    this.puzzleBoard = puzzleBoard;
    this.activeHand = null;
    this.piece = null;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  get isDragging() {
    return this.activeHand !== null && this.piece !== null;
  }

  handleDragForHand(handLabel, pinching, indexPx) {
    const board = this.puzzleBoard;

    if (pinching) {
      if (this.activeHand === null) {
        const candidate = board.findNearestPiece(indexPx.x, indexPx.y);
        if (candidate) {
          this.activeHand = handLabel;
          this.piece = candidate;
          this.offsetX = indexPx.x - candidate.x;
          this.offsetY = indexPx.y - candidate.y;
          candidate.dragging = true;
          candidate.placed = false;
        }
      } else if (this.activeHand === handLabel && this.piece) {
        this.piece.x = indexPx.x - this.offsetX;
        this.piece.y = indexPx.y - this.offsetY;
      }
      return;
    }

    if (this.activeHand === handLabel && this.piece) {
      const piece = this.piece;
      piece.dragging = false;
      board.moves++;

      if (board.isNearOwnCell(piece)) {
        board.snapPieceToCell(piece);
      } else {
        board.clampPieceToBoard(piece);
        const box = board.boardBox;
        const cx = piece.x + piece.w / 2;
        const cy = piece.y + piece.h / 2;
        const dropCol = Math.min(GRID - 1, Math.max(0, Math.floor((cx - box.x) / board.tileW)));
        const dropRow = Math.min(GRID - 1, Math.max(0, Math.floor((cy - box.y) / board.tileH)));
        board.displaceCellOccupant(piece, dropRow, dropCol);
      }

      this.activeHand = null;
      this.piece = null;
      board.solved = board.reconcilePlacedState();
    }
  }

  // Convenience for "this hand's landmarks disappeared" — releases
  // whatever it was holding at its last known position.
  releaseHand(handLabel) {
    if (this.activeHand === handLabel && this.piece) {
      this.handleDragForHand(handLabel, false, { x: this.piece.x, y: this.piece.y });
    }
  }
}
