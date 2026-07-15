"""
Upload Questions to Supabase
=============================
Run this ONCE on your computer (not on the phone). It reads
JAMB_1979_English_Questions.xlsx and pushes every row into your
Supabase "questions" table.

SETUP (do this before running):
1. In your terminal: pip install pandas openpyxl supabase
2. In Supabase: Settings -> API -> copy the "service_role" key
   (NOT the anon key the app uses — this one is secret, never put
   it inside the mobile app itself)
3. Fill in SUPABASE_URL and SUPABASE_KEY below
"""

import pandas as pd
from supabase import create_client
import math
import os
from dotenv import load_dotenv

# This reads a file called .env sitting in the same folder as this script.
# The .env file holds your secret key. GitHub will NEVER see .env because
# it is listed in .gitignore.
load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise SystemExit(
        "ERROR: SUPABASE_URL or SUPABASE_SERVICE_KEY is missing.\n"
        "Create a file named .env in this same folder (database/seed/) with:\n"
        "SUPABASE_URL=https://your-project-ref.supabase.co\n"
        "SUPABASE_SERVICE_KEY=your-service-role-key"
    )

# ---- Path to your Excel file (same folder as this script) ----
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_FILE_PATH = os.path.join(SCRIPT_DIR, "JAMB_1979_English_Questions.xlsx")

# Left side = Excel column name. Right side = Supabase column name.
COLUMN_MAP = {
    "exam body": "exam_body",
    "year": "year",
    "subject": "subject",
    "topic": "topic",
    "question text": "question_text",
    "option a": "option_a",
    "option b": "option_b",
    "option c": "option_c",
    "option d": "option_d",
    "option e": "option_e",
    "correct option": "correct_option",
    "explanation": "explanation",
    "instruction": "instruction",
    "passage": "passage",
    "passage group": "passage_group",
}


def clean_value(value):
    """Excel gives empty cells as NaN. Supabase needs them as None (null)."""
    if isinstance(value, float) and math.isnan(value):
        return None
    if pd.isna(value):
        return None
    return value

def clean_int(value):
    """Same as clean_value, but forces the result to a real whole number."""
    if isinstance(value, float) and math.isnan(value):
        return None
    if pd.isna(value):
        return None
    return int(value)

def main():
    print("Reading Excel file...")
    df = pd.read_excel(EXCEL_FILE_PATH)
    df.columns = [str(c).strip().lower() for c in df.columns]

    missing = [col for col in COLUMN_MAP if col not in df.columns]
    if missing:
        print("ERROR: Excel file is missing these columns:")
        for m in missing:
            print(f"  - {m}")
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    INTEGER_COLUMNS = {"year", "passage_group"}

    rows_to_insert = []
    for _, row in df.iterrows():
        record = {}
        for excel_col, db_col in COLUMN_MAP.items():
            if db_col in INTEGER_COLUMNS:
                record[db_col] = clean_int(row[excel_col])
            else:
                record[db_col] = clean_value(row[excel_col])
        rows_to_insert.append(record)

    print(f"Found {len(rows_to_insert)} questions. Uploading in batches of 200...")

    batch_size = 200
    total = 0
    for i in range(0, len(rows_to_insert), batch_size):
        batch = rows_to_insert[i:i + batch_size]
        supabase.table("questions").insert(batch).execute()
        total += len(batch)
        print(f"Uploaded {total} / {len(rows_to_insert)}")

    print("Done. All questions are now in Supabase.")


if __name__ == "__main__":
    main()