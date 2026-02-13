import sqlite3
import pandas as pd
import glob

conn = sqlite3.connect('db/database.sqlite')

for csv_file in glob.glob('csvs/*.csv'):
    table_name = csv_file.replace('csvs/', '').replace('.csv', '')
    df = pd.read_csv(csv_file)
    df.to_sql(table_name, conn, if_exists='replace', index=False)
    print(f"Imported {table_name}: {len(df)} rows")

conn.commit()
conn.close()
print("Done! database.sqlite created.")