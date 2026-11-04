---
name: e2e-regression-local
description: Run the HOF Golf e2e regression test (fixed route from the 1997 Tigers, expected score 16) on a local iOS Simulator or Android Emulator, and record a video. Use when asked to run the regression or e2e test locally, on a local simulator or emulator, or to record a video of it.
---

# e2e regression on a local simulator or emulator

Runs `tests/hof-golf-regression.e2e.ts` with e2e on one platform, on this machine, and records a video. Ask which platform if the user did not say: iOS needs macOS with Xcode, and Android needs the Android SDK with an emulator.

For writing or debugging e2e tests, load the `e2e` skill. For the test itself, read the comment at the top of the test file.

## 1. Install a release build of the preview variant

e2e opens `com.keithkurak.hofgolf.preview`. A release build contains the JS, so the test needs no dev server. **Build again after every code change**: an old build tests old code.

```bash
# iOS (macOS only)
APP_VARIANT=preview npx expo run:ios --configuration Release --no-bundler

# Android (start the emulator first)
APP_VARIANT=preview npx expo run:android --variant release --no-bundler
```

These commands make `ios/` or `android/` with prebuild. Both folders are gitignored.

## 2. Run the test with a video

```bash
npx e2e run tests/hof-golf-regression.e2e.ts --target ios --video
# or
npx e2e run tests/hof-golf-regression.e2e.ts --target android --video
```

- The `ios` target uses the simulator in `E2E_IOS_DEVICE` (default `iPhone 17 Pro`). e2e boots it if it is not running.
- The `android` target uses `E2E_ANDROID_DEVICE` (default `Pixel 10a`). Use the name that `npx agent-device devices` shows, not the AVD name with underscores.

The video is `video/video.mp4` in the attempt's folder under `.e2e/artifacts/`. Give the user its path.

## Model

Agent steps use Claude through the GitHub Copilot login. If the run fails with `MODEL_PROVIDER_FAILED`, ask the user to run `npx e2e login github-copilot`. Agent steps recorded in `.e2e/cache` replay with no model call.

## Results

- Exit code 0 means the test passed. `.e2e/report.json` has the result.
- Each failure has a screenshot and `screen.txt` in `.e2e/artifacts/`.
- When the run records new agent steps, `.e2e/cache` changes. Commit those files: the EAS workflow and the cloud skill replay them.
