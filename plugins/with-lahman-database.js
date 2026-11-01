// Embeds the Lahman SQLite database in the native app binary, so no build
// (development builds included) downloads it from Metro.
//
// - iOS: copies the file into the app target and adds it to Copy Bundle Resources.
// - Android: copies the file into android/app/src/main/assets.
// - Sets `extra.lahmanDatabase.fileName`. The app reads it to find the file in
//   the bundle (see src/components/lahman-database-provider.tsx).
//
// The file name holds a hash of the database, so a new database gets a new
// name, a new fingerprint, and a fresh copy on the device.
//
// Usage in app.json:
//   ["./plugins/with-lahman-database", { "path": "./lahman/db/database.sqlite" }]
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
  IOSConfig,
  createRunOncePlugin,
  withDangerousMod,
  withXcodeProject,
} = require("expo/config-plugins");

// The config is read often (each Metro manifest request), and hashing a large
// file takes a moment, so keep the hash while the file is unchanged.
const hashCache = new Map();

function getBundledFileName(databasePath) {
  const { size, mtimeMs } = fs.statSync(databasePath);
  const key = `${databasePath}:${size}:${mtimeMs}`;
  if (!hashCache.has(key)) {
    const hash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(databasePath))
      .digest("hex")
      .slice(0, 12);
    hashCache.set(key, `lahman-${hash}.sqlite`);
  }
  return hashCache.get(key);
}

function withLahmanDatabaseIOS(config, { databasePath, fileName }) {
  return withXcodeProject(config, (config) => {
    const { projectRoot } = config.modRequest;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
    fs.copyFileSync(
      databasePath,
      path.join(IOSConfig.Paths.getSourceRoot(projectRoot), fileName),
    );
    const filepath = `${projectName}/${fileName}`;
    if (!config.modResults.hasFile(filepath)) {
      config.modResults = IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath,
        groupName: projectName,
        project: config.modResults,
        isBuildFile: true,
        verbose: true,
      });
    }
    return config;
  });
}

function withLahmanDatabaseAndroid(config, { databasePath, fileName }) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const assetsDir = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/assets",
      );
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.copyFileSync(databasePath, path.join(assetsDir, fileName));
      return config;
    },
  ]);
}

function withLahmanDatabase(config, props = {}) {
  if (!props.path) {
    throw new Error(
      'with-lahman-database: set the "path" option to the SQLite file.',
    );
  }
  const databasePath = path.resolve(
    config._internal?.projectRoot ?? process.cwd(),
    props.path,
  );
  const fileName = getBundledFileName(databasePath);

  config.extra = {
    ...config.extra,
    lahmanDatabase: { fileName },
  };
  config = withLahmanDatabaseIOS(config, { databasePath, fileName });
  config = withLahmanDatabaseAndroid(config, { databasePath, fileName });
  return config;
}

module.exports = createRunOncePlugin(
  withLahmanDatabase,
  "with-lahman-database",
  "1.0.0",
);
