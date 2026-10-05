---
name: e2e-regression-cloud-ios
description: Run the HOF Golf e2e regression test (fixed route from the 1997 Tigers, expected score 16) on an EAS cloud iOS Simulator from this machine. Use when asked to run the regression or e2e test on a cloud simulator, on iOS without a Mac, or on EAS Simulator.
---

# e2e regression on an EAS cloud iOS Simulator

Runs `tests/hof-golf-regression.e2e.ts` with e2e on this machine. The `@e2e-dev/eas` integration starts an EAS Simulator session, installs the build, and stops the session when the run ends. EAS Simulator is a paid service.

For writing or debugging e2e tests, load the `e2e` skill. For the test itself, read the comment at the top of the test file.

## Run

```bash
.agents/skills/e2e-regression-cloud-ios/run.sh
```

The script:

1. Finds a finished `e2e-ios-simulator` build of the current commit (`git rev-parse HEAD`). This is a release build of the preview variant (`com.keithkurak.hofgolf.preview`). The JS is in the app, so a build of an older commit does not test the current code.
2. Stops if there is no build. To make one (paid, about 15 minutes), ask the user first, then run `BUILD=1 .agents/skills/e2e-regression-cloud-ios/run.sh`.
3. Runs `npx e2e run tests/hof-golf-regression.e2e.ts --config e2e.eas.config.ts`.

Commit first. A build records the commit, but it uploads the working tree, so uncommitted changes make the build differ from the commit.

Arguments go to `e2e run`. For example, `--video` saves `video/video.mp4` under the attempt's folder in `.e2e/artifacts/`. The session page on expo.dev also has a recording of each run, with no extra setup.

## Credentials

- **EAS:** the integration uses the `eas login` session. If `EXPO_TOKEN` is set, it uses that.
- **Model:** agent steps use Claude through the GitHub Copilot login (`npx e2e login github-copilot`). Steps recorded in `.e2e/cache` replay with no model call.

## Results

- Exit code 0 means the test passed.
- `.e2e/report.json` has the result. `.e2e/artifacts/` has a screenshot and `screen.txt` for each failure.
- The output has the session page link (`https://expo.dev/accounts/keithco/projects/hof-golf/simulator-sessions/...`). Give it to the user.

When the run records new agent steps, `.e2e/cache` changes. Commit those files: the EAS workflow replays them, so it seldom needs a model call.

## Known issue: `boot` denied (seen 2026-10-05, e2e 0.17.0, @e2e-dev/mobile 0.9.2, @e2e-dev/eas 0.2.1)

The run stops before any test with `boot failed: This daemon's policy denies the boot command`. `@e2e-dev/mobile` sends `boot` to every device before the run, and the EAS Simulator daemon refuses it, although its simulator is already booted. Check for a newer `@e2e-dev/mobile` or `@e2e-dev/eas` first.

The cache in this repo was recorded with a temporary local edit, outside git: in `node_modules/@e2e-dev/mobile/dist/pool.js` (`warm()`) and `surface.js` (`init()`), the `boot` call ignores only the error that contains `policy denies the boot command`. Ask the user before you make that edit. Bun installs packages as hard links to its global cache (`~/.bun/install/cache`), so an in-place edit also changes the cached copy, and a reinstall does not undo it. Back up both files first and copy the backups back when you are done.

The EAS Workflows run does not have this problem: the macOS worker boots its own simulator.

## When the test fails

- **Score or round assertion:** the app's scoring changed, or the route data changed. Compare with the route table in the test file before you change the expected values.
- **Agent step fails:** read `screen.txt` for the failed attempt. A changed label in the app can break an agent step or a locator.
- **No session:** check `npx eas-cli@latest simulator:availability`.
