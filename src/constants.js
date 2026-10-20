// Hand landmark indices used by MediaPipe HandLandmarker.
export const LM = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_TIP: 8,
  MIDDLE_TIP: 12,
  RING_TIP: 16,
  PINKY_TIP: 20,
  MIDDLE_MCP: 9,
  RING_MCP: 13,
  PINKY_MCP: 17,
};

export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

// Gesture thresholds.
export const PINCH_THRESHOLD = 0.055;
export const FIST_HOLD_FRAMES = 12;

// Capture framing.
export const FRAME_PADDING = 28;
export const FREEZE_HOLD_MS = 250;
export const COUNTDOWN_SECONDS = 3;
export const FRAME_GRACE_MS = 450;

// Puzzle board.
export const GRID = 3;
export const SNAP_DISTANCE_RATIO = 0.45;
export const DISPLACE_ANIM_MS = 220;

// Model loading.
export const LOAD_TIMEOUT_MS = 20000;
export const MEDIAPIPE_VERSION = "0.10.14";
export const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
export const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

// Photobooth image filter.
export const PHOTOBOOTH_CONTRAST_ALPHA = 1.3;
export const PHOTOBOOTH_BRIGHTNESS_BETA = 10;
export const PHOTOBOOTH_NOISE_STD = 15;

// Shatter-on-save animation.
export const SHATTER_COLS = 6;
export const SHATTER_ROWS = 6;
export const SHATTER_DURATION_MS = 850;

// Gallery / photo strip.
export const STRIP_MAX_PHOTOS = 3;
export const STRIP_FILE_BORDER = 24;
export const STRIP_FILE_GAP = 16;
export const STRIP_FILE_BG = "#ffffff";

// Canvas drawing palette (mirrors the CSS custom properties in styles.css).
export const THEME = {
  accent: "#8b7bff",
  accentGridLine: "rgba(139, 123, 255, 0.22)",
  success: "#2fd480",
  boardFillEmpty: "#050507",
  pieceBorderIdle: "rgba(245, 245, 250, 0.5)",
  pieceBorderPlaced: "#2fd480",
  dragGlow: "rgba(139, 123, 255, 0.9)",
  solvedOverlayFill: "rgba(47, 212, 128, 0.16)",
  countdownDim: "rgba(6, 6, 10, 0.5)",
  skeletonLine: "rgba(255, 255, 255, 0.9)",
  mono: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
};
