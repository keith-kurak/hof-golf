---
name: eas-sim-preview-link
description: Make a shareable iOS simulator preview link for a pull request. Starts an EAS cloud simulator (web preview only) that runs the PR's EAS Update in the development build, and posts the browser link to the PR as a comment. Use when asked for a simulator preview, a preview link, or a way for reviewers to try a PR in the browser.
---

# Simulator preview link for a PR (iOS)

Starts a `web-preview-only` EAS Simulator session. Reviewers open the link in a browser and use the app. Nothing on this machine must keep running: the JS comes from the PR's EAS Update, not from Metro.

EAS Simulator is a paid service. The session bills until it stops. Browser activity does not reset an idle timer, so `--max-minutes` is the only limit. The default here is 30 minutes. Use the time the user asks for.

## Steps

1. Do steps 1–3 of `.agents/skills/eas-sim-dev/references/pr-validation.md` with `PLATFORM=ios`: get the PR, check out its head, and get the update group for the head commit.

2. Start the session:

   ```bash
   .agents/skills/eas-sim-dev/start-update-session.sh --platform ios --type web-preview-only \
     --group "<update-group-id>" --name "PR #<number> preview" --max-minutes 30
   ```

   Read `PREVIEW_URL`, `SESSION_URL`, and `BUILD_ID` from `.expo/eas-sim/session.env`. If `PREVIEW_URL` is empty, find the `https://web-preview-…` URL in `.expo/eas-sim/start.log`.

3. Calculate the stop time (now + `--max-minutes`), in UTC.

4. Post the comment:

   ```bash
   gh pr comment <number> --body-file .expo/eas-sim/pr-comment.md
   ```

   ```markdown
   ## 📱 iOS simulator preview

   **[Open the preview in your browser](<PREVIEW_URL>)**

   The session stops at <HH:MM UTC> (<N> minutes). After that, the link does not work.
   Ask for a new preview link if you need one.

   _EAS cloud simulator · [session](<SESSION_URL>) · build `<BUILD_ID>` · update group `<UPDATE_GROUP_ID>` · commit `<short headRefOid>`_
   ```

5. Do **not** run `stop.sh` at the end. The session must stay up for reviewers. Clear the local record so the next eas-sim run can start:

   ```bash
   printf '# managed by eas-cli\n' > .env.eas-simulator
   ```

   To stop the preview early: `npx --yes eas-cli@latest simulator:stop --id <session-id>`. The session ID is the last path part of `SESSION_URL`.

## Rules

- Never open the preview URL on the simulator. It is for a browser.
- A `web-preview-only` session has no automation. You cannot check the app with agent-device. If the user also wants checks, use `eas-sim-verify-pr-ios`.
