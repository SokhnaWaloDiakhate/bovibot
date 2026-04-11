from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from database import engine, Base, get_db
import models
from pydantic import BaseModel
import os
from datetime import datetime
import json

# Créer les tables si elles n'existent pas encore
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Erreur lors de la création des tables : {e}")

from groq import Groq

# Initialisation de l'application FastAPI
app = FastAPI(title="Bovibot API", version="1.0.0")

# Initialisation du client Groq
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Pydantic models for request/response
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    pending_sql: str | None = None # Stocke la requête en attente de confirmation

class ChatResponse(BaseModel):
    response: str
    sql: str | None = None
    results: list | None = None
    pending_sql: str | None = None

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
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        # Context DB
        db_anim = db.execute(text("SELECT id, numero_tag, nom, statut FROM animaux")).fetchall()
        liste_animaux = "\n".join([f"ID:{r[0]} | Tag:{r[1]} | Nom:{r[2]} | Statut:{r[3]}" for r in db_anim])
        
        db_races = db.execute(text("SELECT id, nom FROM races")).fetchall()
        liste_races = "\n".join([f"ID:{r[0]} | Nom:{r[1]}" for r in db_races])

        sql_query = None
        results_final = None
        tool_result = "Aucune donnée trouvée."
        pending_sql = None

        # CAS A : L'utilisateur confirme une action précédente
        msg_clean = request.message.lower().strip()
        is_confirmation = msg_clean in ["oui", "yes", "confirmer", "ok", "c'est bon", "vas-y", "valider"]
        
        if request.pending_sql and is_confirmation:
            sql_query = request.pending_sql
            print(f"DEBUG: EXECUTION CONFIRMÉE -> {sql_query}")
        
        # CAS B : Nouvelle demande
        else:
            messages_sql = [{"role": m.role, "content": m.content} for m in request.history[-5:]]
            prompt_sql = f"""Tu es l'expert SQL de BoviBot.
QUESTION : {request.message}

TABLES :
- animaux (id, numero_tag, nom, poids_actuel, statut)
- sante (animal_id, type ['vaccination'], date_acte)
- reproduction (mere_id, pere_id, date_saillie, date_velage_prevue, statut ['en_gestation','vele'])

RÈGLES :
1. 'fn_gmq(id)' retourne DIRECTEMENT le GMQ. N'invente PAS de formule mathématique.
2. 'fn_age_en_mois(id)' retourne l'âge.
3. Si l'animal n'est pas dans la LISTE ci-dessous, dis que tu ne le connais pas.
4. N'utilise INSERT que si l'utilisateur dit "AJOUTER".

LISTE ANIMAUX : {liste_animaux}
RÉPONDS EN JSON : {{"sql": "la requête"}}"""
            
            messages_sql.append({"role": "user", "content": prompt_sql})
            resp_sql = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages_sql,
                response_format={"type": "json_object"}
            )
            sql_query = json.loads(resp_sql.choices[0].message.content).get("sql")

            # SI ACTION -> On attend confirmation (SAUF si c'est déjà une confirmation, ce qui est géré au-dessus)
            if sql_query and any(x in sql_query.upper() for x in ["CALL", "INSERT", "UPDATE", "DELETE"]):
                pending_sql = sql_query
                sql_query = None 
                tool_result = "EN ATTENTE DE CONFIRMATION"

        # ÉTAPE 2 : Exécution
        if sql_query:
            try:
                query_result = db.execute(text(sql_query))
                if sql_query.strip().upper().startswith("SELECT"):
                    rows = query_result.fetchall()
                    keys = query_result.keys()
                    results_final = [dict(zip(keys, row)) for row in rows]
                    for d in results_final:
                        for k, v in d.items():
                            if hasattr(v, '__float__') and not isinstance(v, (int, float)):
                                d[k] = float(v)
                    tool_result = json.dumps(results_final, default=str)
                else:
                    db.commit()
                    tool_result = "Action enregistrée avec succès."
            except Exception as e:
                db.rollback()
                tool_result = f"Erreur SQL : {str(e)}"

        # ÉTAPE 3 : Réponse finale
        messages_final = [{"role": m.role, "content": m.content} for m in request.history[-5:]]
        if pending_sql:
            p_final = f"""L'utilisateur veut une action : {request.message}. 
            Demande confirmation courte (ex: 'Confirmer la vente de X ?'). 
            PAS DE CONSEILS, PAS DE BAVARDAGE."""
        else:
            p_final = f"""Tu es BoviBot, assistant de ferme.
            DONNÉES SQL : {tool_result}
            RÈGLE : 1. Réponds UNIQUEMENT sur la base des données fournies. 
            2. INTERDICTION de donner des conseils (collecter données, etc.).
            3. Si vide : 'Aucun animal trouvé'. 
            4. Sois très bref."""

        messages_final.append({"role": "user", "content": p_final})
        resp_final = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages_final
        )
        
        return ChatResponse(
            response=resp_final.choices[0].message.content,
            sql=sql_query or pending_sql,
            results=results_final,
            pending_sql=pending_sql
        )

    except Exception as e:
        print(f"Erreur globale: {e}")
        return ChatResponse(response="Désolé, une erreur est survenue.")

@app.get("/api/animaux")
def get_animaux_list(db: Session = Depends(get_db)):
    # On récupère tous les animaux avec leur race et GMQ calculé
    query = text("""
        SELECT a.numero_tag as tag, a.nom, r.nom as race, a.sexe, 
               fn_age_en_mois(a.id) as age_mois, a.poids_actuel, 
               fn_gmq(a.id) as gmq, a.statut
        FROM animaux a
        JOIN races r ON a.race_id = r.id
    """)
    result = db.execute(query)
    columns = result.keys()
    animaux = [dict(zip(columns, row)) for row in result.fetchall()]
    return animaux

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
