// e2e (TesterArmy) config for a local iOS Simulator or Android Emulator.
// Skills: e2e-regression-local, e2e-regression-cloud-ios. Workflow: e2e-regression.yaml.
import { anthropic } from "@ai-sdk/anthropic";
import { mobile } from "@e2e-dev/mobile";
import type { E2EConfig } from "e2e";
import { copilot } from "e2e/oauth/copilot";

// e2e runs a release build of the preview variant (APP_VARIANT=preview), so
// the JS is in the app and no dev server is needed.
export const BUNDLE_ID = "com.keithkurak.hofgolf.preview";

// Agent steps use Claude Sonnet 5.5 through a GitHub Copilot login:
// - Local: `npx e2e login github-copilot` saves it in ~/.config/e2e/oauth.json.
// - EAS Workflows: the E2E_OAUTH_CREDENTIALS secret holds a copy of that file.
// Most CI runs make no model call: they replay the steps in .e2e/cache.
// If ANTHROPIC_API_KEY is set, the Anthropic API is used instead.
export const agents = {
  default: {
    model: process.env.ANTHROPIC_API_KEY
      ? anthropic("claude-sonnet-5-5")
      : copilot("claude-sonnet-5.5"),
  },
};

export default {
  targets: [
    {
      name: "ios",
      engine: mobile({
        platform: "ios",
        device: process.env.E2E_IOS_DEVICE ?? "iPhone 17 Pro",
      }),
      app: { bundleId: BUNDLE_ID },
    },
    {
      name: "android",
      engine: mobile({
        platform: "android",
        // The name `npx agent-device devices` shows, not the AVD name.
        device: process.env.E2E_ANDROID_DEVICE ?? "Pixel 10a",
      }),
      app: {
        bundleId: BUNDLE_ID,
        appPath: "android/app/build/outputs/apk/release/app-release.apk",
      },
    },
  ],
  agents,
  // Agent steps can take a while on a slow simulator
  timeout: 180_000,
  workers: 1,
} satisfies E2EConfig;
