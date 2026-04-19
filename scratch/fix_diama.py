import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv('backend/.env')

DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    conn.execute(text("UPDATE animaux SET numero_tag='TAG-011', date_naissance='2023-05-20' WHERE id=11"))
    conn.commit()
    print("Record ID 11 updated successfully.")
