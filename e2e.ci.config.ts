// e2e config for the EAS Workflows macOS worker (.eas/workflows/e2e-regression.yaml).
// The worker has one booted simulator, so the target names no device.
import { mobile } from "@e2e-dev/mobile";
import type { E2EConfig } from "e2e";

import config, { BUNDLE_ID } from "./e2e.config";

export default {
  ...config,
  targets: [
    {
      name: "ios",
      engine: mobile({ platform: "ios" }),
      app: { bundleId: BUNDLE_ID },
    },
  ],
} satisfies E2EConfig;
