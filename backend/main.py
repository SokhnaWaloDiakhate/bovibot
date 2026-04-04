from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text  # Pour tester les requêtes SQL directes
from database import engine, Base, get_db
import models

# Créer les tables si elles n'existent pas encore
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Erreur lors de la création des tables : {e}")

# Initialisation de l'application FastAPI
app = FastAPI(title="Bovibot API", version="1.0.0")

@app.get("/")
def read_root():
    """ Point d'entrée principal. """
    return {"message": "Bienvenue sur l'API de Bovibot", "status": "en cours d'exécution"}


if __name__ == "__main__":
    import uvicorn
    # Lancement du serveur FastAPI
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
