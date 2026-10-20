import { LM, FREEZE_HOLD_MS, FRAME_GRACE_MS } from "./constants.js";
import { mirrorLandmarkX, computeHandFrame, isPinching } from "./geometry.js";

// Drives frame selection while in the TRACKING state: finds the box
// spanned by both index fingertips, arms a countdown once both hands
// hold a pinch for FREEZE_HOLD_MS, and remembers the last good frame
// for a short grace period so a brief hand dropout doesn't reset things.
export class TrackingFrameSelector {
  constructor() {
    this.freezeGate = { holding: false, since: 0 };
    this.lastSeenFrame = { box: null, at: 0 };
  }

  reset() {
    this.freezeGate.holding = false;
    this.freezeGate.since = 0;
    this.lastSeenFrame.box = null;
    this.lastSeenFrame.at = 0;
  }

  // Used when zero hands, or exactly one hand, is visible: disarms the
  // pinch-hold gate and returns the last known frame if still fresh.
  graceFrame() {
    this.freezeGate.holding = false;
    const sinceLastSeen = performance.now() - this.lastSeenFrame.at;
    return this.lastSeenFrame.box && sinceLastSeen < FRAME_GRACE_MS ? this.lastSeenFrame.box : null;
  }

  // Used when exactly two hands are visible.
  updateTwoHands(handA, handB, canvas) {
    const indexA = mirrorLandmarkX(handA[LM.INDEX_TIP]);
    const indexB = mirrorLandmarkX(handB[LM.INDEX_TIP]);
    const frameBox = computeHandFrame(indexA, indexB, canvas);

    let liveFrame = null;
    if (frameBox.width > 4 && frameBox.height > 4) {
      liveFrame = frameBox;
      this.lastSeenFrame.box = frameBox;
      this.lastSeenFrame.at = performance.now();
    }

    const bothPinching = isPinching(handA) && isPinching(handB);
    let armed = false;
    let shouldStartCountdown = false;

    if (bothPinching && frameBox.width > 40 && frameBox.height > 40) {
      if (!this.freezeGate.holding) {
        this.freezeGate.holding = true;
        this.freezeGate.since = performance.now();
      }
      armed = true;
      if (performance.now() - this.freezeGate.since > FREEZE_HOLD_MS) {
        this.freezeGate.holding = false;
        shouldStartCountdown = true;
      }
    } else {
      this.freezeGate.holding = false;
    }

    return { liveFrame, frameBox, armed, shouldStartCountdown };
  }
}
