import { COUNTDOWN_SECONDS } from "./constants.js";

// Simple wall-clock countdown from COUNTDOWN_SECONDS to 0.
export class CountdownTimer {
  constructor() {
    this.startedAt = 0;
  }

  start() {
    this.startedAt = performance.now();
  }

  get remaining() {
    const elapsed = (performance.now() - this.startedAt) / 1000;
    return COUNTDOWN_SECONDS - elapsed;
  }

  get isDone() {
    return this.remaining <= 0;
  }
}
