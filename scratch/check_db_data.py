import os
from sqlalchemy import select, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_counts():
    db = SessionLocal()
    tables = ['animaux', 'races', 'pesees', 'sante', 'reproduction', 'ventes', 'alertes']
    print("--- COMPTAGE DES DONNÉES ---")
    for table in tables:
        try:
            result = db.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar()
            print(f"Table {table:12} : {count} ligne(s)")
        except Exception as e:
            print(f"Erreur sur {table} : {e}")
    db.close()

if __name__ == "__main__":
    check_counts()
