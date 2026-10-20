import { LM, PINCH_THRESHOLD, FRAME_PADDING } from "./constants.js";

export function dist2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function toPixel(landmarkNorm, canvas) {
  return { x: landmarkNorm.x * canvas.width, y: landmarkNorm.y * canvas.height };
}

// The camera feed is mirrored for display, so normalized landmark
// coordinates need their X flipped to line up with what's drawn.
export function mirrorLandmarkX(landmark) {
  return { x: 1 - landmark.x, y: landmark.y };
}

export function isPinching(landmarks) {
  return dist2D(landmarks[LM.THUMB_TIP], landmarks[LM.INDEX_TIP]) < PINCH_THRESHOLD;
}

export function isFist(landmarks) {
  const wrist = landmarks[LM.WRIST];
  const pairs = [
    [LM.INDEX_TIP, LM.INDEX_MCP],
    [LM.MIDDLE_TIP, LM.MIDDLE_MCP],
    [LM.RING_TIP, LM.RING_MCP],
    [LM.PINKY_TIP, LM.PINKY_MCP],
  ];
  let curled = 0;
  for (const [tipIdx, mcpIdx] of pairs) {
    if (dist2D(landmarks[tipIdx], wrist) < dist2D(landmarks[mcpIdx], wrist)) curled++;
  }
  return curled >= 4;
}

// Bounding box (in canvas pixels) spanning the two index fingertips,
// used as the capture frame when both hands pinch.
export function computeHandFrame(indexTipA, indexTipB, canvas) {
  const a = toPixel(indexTipA, canvas);
  const b = toPixel(indexTipB, canvas);

  const minX = Math.min(a.x, b.x) - FRAME_PADDING;
  const maxX = Math.max(a.x, b.x) + FRAME_PADDING;
  const minY = Math.min(a.y, b.y) - FRAME_PADDING;
  const maxY = Math.max(a.y, b.y) + FRAME_PADDING;

  const x = Math.max(0, minX);
  const y = Math.max(0, minY);
  const width = Math.min(canvas.width, maxX) - x;
  const height = Math.min(canvas.height, maxY) - y;

  return { x, y, width, height };
}

export function isPointInBoard(px, py, box) {
  if (!box) return false;
  return px >= box.x && px <= box.x + box.width && py >= box.y && py <= box.y + box.height;
}
