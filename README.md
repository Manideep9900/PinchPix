<h1 align="center">🤏 PinchPix</h1>
<p align="center"><b>Frame it with your fingers. Snap it. Solve it.</b><br/>
A hands-free photo-booth puzzle that runs 100% in your browser.</p>

---

## What is PinchPix?

PinchPix turns your webcam into a photo booth you control with gestures.
Pinch the air to frame a shot, and your photo is instantly turned into a
shuffled puzzle that you put back together using nothing but your hands.
Finished puzzles are saved to a snapshot strip you can download as a single image.

No server, no account, no install, and no build step. Your camera feed never leaves your device.

## Quick start

PinchPix needs to be served over HTTP, because the camera and ES modules don't work from `file://`.

```bash
cd pinchpix
python -m http.server 8080 --bind 127.0.0.1
```

Open **http://localhost:8080** in Chrome or Edge and allow camera access.
Any static server works (VS Code Live Server, `npx serve`, and so on).

> The first launch downloads the hand-tracking runtime and model (about 10 MB),
> so an internet connection is required.

## How to play

1. **Frame:** hold both hands up and pinch thumb to index finger on each.
   The area between your two index fingertips becomes the photo frame.
2. **Capture:** keep pinching for a moment. A 3-second countdown runs and the shot is taken in black and white with a film-grain look.
3. **Solve:** the photo is cut into 9 shuffled tiles. Pinch a tile to pick it up, move your hand, and release to drop it. Tiles snap into place when they're close to their correct spot.
4. **Save:** once solved, hold a fist. The picture shatters and a copy goes into your strip.
5. **Download:** collect up to 3 snapshots, then export them as one photo-strip PNG.

### Gestures

| Gesture | What it does |
|---|---|
| Pinch with both hands | Frame the area and start the capture |
| Pinch with one hand over a tile | Pick up and drag the tile |
| Hold a fist | Save a solved puzzle, or reset an unsolved one |

### No camera tracking? No problem

| Input | What it does |
|---|---|
| Mouse / touch drag | Move tiles |
| `C` | Capture a centered frame |
| `H` | Show or hide the ghost hint of the finished picture |
| `S` | Save a solved puzzle |
| `R` | Reset the current puzzle |

A live counter shows tiles placed, moves made and time taken. Sound effects can be muted from the Sound button.

## Project layout

```
pinchpix/
├── index.html              page shell
├── css/styles.css          interface styling
└── src/
    ├── main.js             entry point
    ├── app.js              state machine, render loop, input wiring
    ├── constants.js        thresholds, timings, colors
    ├── states.js           tracking / countdown / puzzle / shattering
    ├── dom.js              DOM lookups and UI updates
    ├── geometry.js         pinch and fist detection, frame math
    ├── mediaPipeService.js camera and hand-model setup (GPU, CPU fallback)
    ├── trackingFrame.js    two-hand framing and hold-to-capture
    ├── countdown.js        capture timer
    ├── capture.js          crop and filter the captured frame
    ├── effects.js          black-and-white grain filter
    ├── puzzleBoard.js      tile slicing, shuffling, snapping, move count
    ├── dragController.js   pick-up and drop logic
    ├── renderer.js         all canvas drawing
    ├── shatterEffect.js    save animation
    ├── gallery.js          snapshot strip and PNG export
    └── sfx.js              synthesized sound effects
```

## Built with

- [MediaPipe Tasks Vision](https://developers.google.com/mediapipe) for hand landmark detection
- HTML5 Canvas for rendering
- Web Audio API for sound
- Plain JavaScript ES modules, with no framework and no bundler

## Troubleshooting

| Problem | Fix |
|---|---|
| Page won't load at `[::]:8080` | Use `http://localhost:8080` or start the server with `--bind 127.0.0.1` |
| Stuck on loading | Check your internet connection and press **Retry** |
| Camera blocked | Allow camera access in the address bar's site settings, then press **Retry** |
| Hands not detected | Use good front lighting and keep your whole hand in view |

## Ideas for later

Bigger grids, more photo filters, saved best times, and snapshots that persist between sessions.
