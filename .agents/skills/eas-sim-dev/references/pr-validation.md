# PR validation on an EAS cloud simulator

Shared procedure for `eas-sim-verify-pr-ios` and `eas-sim-verify-pr-android`. Set `PLATFORM` to `ios` or `android` before you start.

The run uses the PR's published EAS Update in the development build. It does not use Metro. The session page on expo.dev keeps the screen recording, app logs, and performance metrics after the session stops. That page is the link you post on the PR.

## 1. Get the PR

```bash
gh pr view <number-or-branch> --json number,url,title,body,headRefName,headRefOid
gh pr diff <number>
```

With no PR number, use the PR for the current branch (`gh pr view`).

## 2. Check out the PR head

The fingerprint comes from the local working tree, so the tree must match the PR head commit:

```bash
git status --short          # must be clean
git rev-parse HEAD          # must equal headRefOid
```

If it does not match, run `gh pr checkout <number>` (or use a separate worktree). Do not discard local changes without asking the user.

## 3. Get the update group for the PR head

The `update-on-pr.yaml` workflow publishes each PR push to the EAS Update branch named `headRefName`. Find the group for the head commit:

```bash
npx --yes eas-cli@latest update:list --branch "<headRefName>" --platform "$PLATFORM" --json --non-interactive
```

Read the JSON and select the newest update group whose git commit is `headRefOid`.

If none exists (the workflow is still running, or it failed), publish one from the clean checkout:

```bash
npx --yes eas-cli@latest update --branch "<headRefName>" --environment development \
  --platform "$PLATFORM" --message "Validate PR #<number>" --json --non-interactive
```

Read the update group ID from the output. Use `--environment development`: the update is for the development build.

## 4. Start the session

```bash
.agents/skills/eas-sim-dev/start-update-session.sh --platform "$PLATFORM" \
  --group "<update-group-id>" --name "PR #<number> validation" --max-minutes 20
```

The script finds the development build that matches the local fingerprint, opens the update in it, waits for the session, and attaches agent-device. It writes `SESSION_URL`, `BUILD_ID`, and `UPDATE_GROUP_ID` to `.expo/eas-sim/session.env`.

If no build matches, the native code changed in this PR. Tell the user. A new development build is necessary (`eas build --profile development-simulator` for iOS, `--profile development` for Android). Ask before you start one, unless the user already asked for it.

## 5. Make a test plan

Use the PR title, body, and diff. List 3–8 checks that show the change works, and 1–2 checks of nearby behavior that the change could break. Keep each check concrete: "Tap Save with an empty name. An error shows." If the user gave instructions, put them first.

## 6. Run the checks

```bash
AD="npx --yes eas-cli@latest simulator:exec npx agent-device@latest"
$AD snapshot -i
$AD press 'label="..."' --settle
$AD screenshot ./.expo/eas-sim/check-1.png --platform "$PLATFORM"
```

- Confirm that the app shows the PR's code first. The dev client can show its launcher or an error screen instead.
- On iOS, a first deep link can show an "Open in …?" alert. Press `label="Open"`.
- Look at each screenshot. Record PASS or FAIL for each check, with what you saw.
- Run `snapshot -i` again after each screen change. Refs change.
- Work quickly. The session stops after `--max-minutes`.

## 7. Stop the session

```bash
.agents/skills/eas-sim-dev/stop.sh
```

Read `SESSION_URL` from `.expo/eas-sim/session.env` before you stop (stop.sh deletes the file). Always stop, also when a check fails.

## 8. Comment on the PR

Write the comment to a file, then post it:

```bash
gh pr comment <number> --body-file .expo/eas-sim/pr-comment.md
```

Use this format:

```markdown
## <iOS|Android> validation: <PASS|FAIL>

▶️ [Simulator run](<SESSION_URL>) (screen recording and logs)

| Check | Result |
| --- | --- |
| <check> | ✅ / ❌ <one-line note> |

<Any problems found, with steps to reproduce.>

_EAS cloud simulator · build `<BUILD_ID>` · update group `<UPDATE_GROUP_ID>` · commit `<short headRefOid>`_
```

Report what you saw. If a check could not run, mark it ⚠️ and say why. Do not mark it as passed.
