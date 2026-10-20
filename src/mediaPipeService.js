import {
  FilesetResolver,
  HandLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
import { LOAD_TIMEOUT_MS, WASM_BASE_URL, HAND_MODEL_URL } from "./constants.js";

function withTimeout(promise, ms, timeoutMessage) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Requests the front-facing camera and wires it up to the given <video>,
// then sizes the canvas to match the incoming stream.
export async function initWebcam(videoEl, canvas, onSized) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser doesn't support getUserMedia.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
    audio: false,
  });
  videoEl.srcObject = stream;

  await new Promise((resolve) => {
    videoEl.onloadedmetadata = () => {
      videoEl.play();
      resolve();
    };
  });

  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  onSized?.();
}

async function createLandmarker(vision, delegate) {
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate },
    runningMode: "video",
    numHands: 2,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });
}

// Loads the MediaPipe HandLandmarker, preferring GPU and falling back to CPU.
export async function initHandLandmarker() {
  const vision = await withTimeout(
    FilesetResolver.forVisionTasks(WASM_BASE_URL),
    LOAD_TIMEOUT_MS,
    "Timed out loading the MediaPipe runtime (WASM). Check your internet connection or whether cdn.jsdelivr.net is blocked."
  );

  try {
    return await withTimeout(
      createLandmarker(vision, "GPU"),
      LOAD_TIMEOUT_MS,
      "Timed out downloading the HandLandmarker model (~10MB) on GPU."
    );
  } catch (gpuErr) {
    console.warn("[PinchPix] GPU delegate failed, retrying on CPU…", gpuErr);
  }

  return withTimeout(
    createLandmarker(vision, "CPU"),
    LOAD_TIMEOUT_MS,
    "Timed out downloading the HandLandmarker model (~10MB), even on CPU. Check your connection or whether storage.googleapis.com is blocked on your network."
  );
}
