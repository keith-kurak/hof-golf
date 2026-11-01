import Constants from "expo-constants";
import { Directory, File, Paths } from "expo-file-system";
import { defaultDatabaseDirectory, SQLiteProvider } from "expo-sqlite";
import { type ReactNode, useEffect, useState } from "react";
import { Platform } from "react-native";

// plugins/with-lahman-database.js embeds the database in the app binary under
// this name. The name holds a hash of the database, so a new database is a new file.
const fileName: string | undefined =
  Constants.expoConfig?.extra?.lahmanDatabase?.fileName;

function bundledFile(name: string) {
  // Android keeps bundled files in the APK's assets folder
  return Platform.OS === "android"
    ? new File(`asset:///${name}`)
    : new File(Paths.bundle, name);
}

/**
 * Copies the bundled database into the SQLite directory once, then removes
 * older copies. SQLite cannot open the file in place: the app bundle is read-only.
 */
async function prepareDatabase(name: string) {
  const directory = new Directory(`file://${defaultDatabaseDirectory}`);
  directory.create({ intermediates: true, idempotent: true });

  const target = new File(directory, name);
  if (!target.exists) {
    const source = bundledFile(name);
    if (!source.exists) {
      throw new Error(
        `${name} is not in the app binary. The Lahman database changed: make a new build.`,
      );
    }
    // Copy to a temporary name first, so an interrupted copy never looks complete
    const partial = new File(directory, `${name}.partial`);
    if (partial.exists) partial.delete();
    await source.copy(partial);
    await partial.move(target);
  }

  // Earlier database versions, and the copy that the asset import made
  for (const item of directory.list()) {
    if (
      item instanceof File &&
      item.name !== name &&
      (item.name.startsWith("lahman-") || item.name.startsWith("test.db"))
    ) {
      item.delete();
    }
  }
}

export function LahmanDatabaseProvider({ children }: { children: ReactNode }) {
  if (!fileName) {
    throw new Error(
      "extra.lahmanDatabase.fileName is not set. Add the with-lahman-database plugin to app.json.",
    );
  }
  return <PreparedDatabase name={fileName}>{children}</PreparedDatabase>;
}

function PreparedDatabase({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    prepareDatabase(name).then(
      () => setReady(true),
      (e: unknown) => setError(e instanceof Error ? e : new Error(String(e))),
    );
  }, [name]);

  if (error) throw error;
  if (!ready) return null;
  return <SQLiteProvider databaseName={name}>{children}</SQLiteProvider>;
}
