import { SQLiteProvider } from "expo-sqlite";
import type { ReactNode } from "react";

// Web has no native binary to embed the database in, so it imports the file
// as a Metro asset.
export function LahmanDatabaseProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider
      databaseName="test.db"
      assetSource={{ assetId: require("../../lahman/db/database.sqlite") }}
    >
      {children}
    </SQLiteProvider>
  );
}
