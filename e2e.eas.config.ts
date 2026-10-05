// e2e config for an EAS cloud iOS Simulator (local run, remote device).
// IOS_SIMULATOR_BUILD_ID names an `e2e-ios-simulator` EAS build. The
// e2e-cloud-ios skill finds one and sets it.
import { easSimulators } from "@e2e-dev/eas";
import { mobile } from "@e2e-dev/mobile";
import type { E2EConfig } from "e2e";

import config, { BUNDLE_ID } from "./e2e.config";

export default {
  ...config,
  targets: [
    {
      name: "ios",
      engine: mobile({
        platform: "ios",
        device: easSimulators({
          buildId: process.env.IOS_SIMULATOR_BUILD_ID,
          maxDurationMinutes: 40,
        }),
        // The touch indicator takes minutes to draw on a remote simulator
        videoTouches: false,
      }),
      app: { bundleId: BUNDLE_ID },
    },
  ],
} satisfies E2EConfig;
