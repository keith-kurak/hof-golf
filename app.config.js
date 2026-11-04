// App variants: development (default), preview, and production.
//
// APP_VARIANT is unset for development. EAS builds, updates, and fingerprint
// jobs get APP_VARIANT from the EAS environment that the build profile or job
// names (preview -> "preview", production -> "production"). Locally, set it by
// hand, for example: APP_VARIANT=preview npx expo config
//
// Each variant has its own bundle ID / package, so all three can be installed
// on one device. Non-production variants show "HOF-<VARIANT>" under the icon.

// Short app name abbreviation shown under the icon, e.g. "PK" -> "PK-DEV".
const APP_NAME_ABBREVIATION = "HOF";

const VARIANTS = {
  development: { idSuffix: ".dev", label: "DEV" },
  preview: { idSuffix: ".preview", label: "PREVIEW" },
  production: { idSuffix: "", label: null },
};

module.exports = ({ config }) => {
  const variant = process.env.APP_VARIANT || "development";
  const settings = VARIANTS[variant];
  if (!settings) {
    throw new Error(
      `Unknown APP_VARIANT "${variant}". Use one of: ${Object.keys(VARIANTS).join(", ")}.`
    );
  }

  // expo-dev-client is configured here, not in app.json, so the generated
  // exp+<slug> scheme is only added to development builds.
  const plugins = (config.plugins || []).filter(
    (plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) !== "expo-dev-client"
  );
  plugins.push(["expo-dev-client", { addGeneratedScheme: variant === "development" }]);

  return {
    ...config,
    name: settings.label ? `${APP_NAME_ABBREVIATION}-${settings.label}` : config.name,
    ios: {
      ...config.ios,
      bundleIdentifier: config.ios.bundleIdentifier + settings.idSuffix,
    },
    android: {
      ...config.android,
      package: config.android.package + settings.idSuffix,
    },
    plugins,
  };
};
