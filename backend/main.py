from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from database import engine, Base, get_db
import models
from pydantic import BaseModel
import os

# Créer les tables si elles n'existent pas encore
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Erreur lors de la création des tables : {e}")

# Initialisation de l'application FastAPI
app = FastAPI(title="Bovibot API", version="1.0.0")

# Pydantic models for request/response
class ChatRequest(BaseModel):
    message: str
    mode: str

class ChatResponse(BaseModel):
    response: str

# Chemin vers le dossier frontend
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))

@app.get("/")
def read_root():
    """ Sert la page d'accueil du frontend. """
    return FileResponse(os.path.join(frontend_path, "index.html"))

@app.get("/animaux")
def get_animaux(db: Session = Depends(get_db)):
    """Liste tous les animaux actifs avec age (fn_age_en_mois) et GMQ (fn_gmq)"""
    result = db.execute(text("""
        SELECT a.id, a.numero_tag, a.nom, a.sexe, a.date_naissance, a.poids_actuel,
               fn_age_en_mois(a.id) as age_mois, fn_gmq(a.id) as gmq
        FROM animaux a
        WHERE a.statut = 'actif'
        ORDER BY a.numero_tag
    """)).fetchall()

    animaux = []
    for row in result:
        animaux.append({
            "id": row[0],
            "numero_tag": row[1],
            "nom": row[2],
            "sexe": row[3],
            "date_naissance": str(row[4]) if row[4] else None,
            "poids_actuel": float(row[5]) if row[5] else None,
            "age_mois": row[6],
            "gmq": float(row[7]) if row[7] else None
        })

    return animaux

@app.get("/alertes")
def get_alertes(db: Session = Depends(get_db)):
    """Liste toutes les alertes non traitées"""
    alertes = db.query(models.Alerte).filter(models.Alerte.traitee == False).all()

    result = []
    for alerte in alertes:
        result.append({
            "id": alerte.id,
            "animal_id": alerte.animal_id,
            "type": alerte.type,
            "message": alerte.message,
            "niveau": alerte.niveau,
            "date_creation": str(alerte.date_creation) if alerte.date_creation else None
        })

    return result

@app.post("/alertes/{id}/traiter")
def traiter_alerte(id: int, db: Session = Depends(get_db)):
    """Marquer une alerte comme traitée"""
    alerte = db.query(models.Alerte).filter(models.Alerte.id == id).first()
    if not alerte:
        raise HTTPException(status_code=404, detail="Alerte non trouvée")

    alerte.traitee = True
    db.commit()

    return {"message": "Alerte marquée comme traitée"}

@app.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """Retourne les statistiques générales"""
    # Nombre d'animaux actifs
    nb_animaux = db.query(func.count(models.Animal.id)).filter(models.Animal.statut == 'actif').scalar()

    # GMQ moyen des animaux actifs
    gmq_result = db.execute(text("""
        SELECT AVG(fn_gmq(a.id)) as gmq_moyen
        FROM animaux a
        WHERE a.statut = 'actif' AND fn_gmq(a.id) IS NOT NULL
    """)).fetchone()
    gmq_moyen = float(gmq_result[0]) if gmq_result[0] else 0.0

    # Nombre d'alertes non traitées
    nb_alertes = db.query(func.count(models.Alerte.id)).filter(models.Alerte.traitee == False).scalar()

    # Nombre de vêlages (reproductions avec statut 'vele')
    nb_velages = db.query(func.count(models.Reproduction.id)).filter(models.Reproduction.statut == 'vele').scalar()

    return {
        "animaux": nb_animaux,
        "gmq": gmq_moyen,
        "alertes": nb_alertes,
        "velages": nb_velages
    }

@app.post("/chat")
def chat(request: ChatRequest):
    """Reçoit un message et retourne la réponse du LLM"""
    # TODO: Intégrer un vrai LLM (OpenAI, local, etc.)
    # Pour l'instant, réponse simple basée sur le mode
    if request.mode == "diagnostic":
        response = f"Diagnostic pour: {request.message}"
    elif request.mode == "conseil":
        response = f"Conseil: {request.message}"
    else:
        response = f"Réponse à: {request.message}"

    return ChatResponse(response=response)

@app.get("/reproduction")
def get_reproduction(db: Session = Depends(get_db)):
    """Liste les gestations en cours avec date_velage_prevue"""
    gestations = db.query(models.Reproduction).filter(models.Reproduction.statut == 'en_gestation').all()

    result = []
    for gestation in gestations:
        result.append({
            "id": gestation.id,
            "mere_id": gestation.mere_id,
            "pere_id": gestation.pere_id,
            "date_saillie": str(gestation.date_saillie),
            "date_velage_prevue": str(gestation.date_velage_prevue) if gestation.date_velage_prevue else None,
            "notes": gestation.notes
        })

    return result

# Monter le dossier frontend pour servir le CSS, JS et les images
app.mount("/", StaticFiles(directory=frontend_path), name="frontend")

if __name__ == "__main__":
    import uvicorn
    # Lancement du serveur FastAPI
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
