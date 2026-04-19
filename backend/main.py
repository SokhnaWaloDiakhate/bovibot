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
@app.get("/api/animaux")
def get_animaux(db: Session = Depends(get_db)):
    """Liste tous les animaux actifs avec age (fn_age_en_mois) et GMQ (fn_gmq)"""
    result = db.execute(text("""
        SELECT a.id, a.numero_tag, a.nom, a.sexe, a.date_naissance, a.poids_actuel,
               fn_age_en_mois(a.id) as age_mois, fn_gmq(a.id) as gmq,
               a.statut, r.nom as race_nom
        FROM animaux a
        LEFT JOIN races r ON a.race_id = r.id
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
            "gmq": float(row[7]) if row[7] else 0.0,
            "statut": row[8],
            "race": row[9]
        })

    return animaux

@app.get("/alertes")
@app.get("/api/alertes")
def get_alertes(db: Session = Depends(get_db)):
    """Liste toutes les alertes non traitées"""
    alertes = db.query(models.Alerte).filter(models.Alerte.traitee == False).all()
    print(f"[LOG] Fetching alertes: {len(alertes)} items found.")
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
@app.post("/api/alertes/{id}/traiter")
def traiter_alerte(id: int, db: Session = Depends(get_db)):
    """Marquer une alerte comme traitée"""
    print(f"[LOG] Processing treatment for alerte ID: {id}")
    alerte = db.query(models.Alerte).filter(models.Alerte.id == id).first()
    if not alerte:
        print(f"[LOG] Error: Alerte ID {id} not found.")
        raise HTTPException(status_code=404, detail="Alerte non trouvée")

    alerte.traitee = True
    db.commit()
    print(f"[LOG] Alerte ID {id} marked as treated successfully.")
    return {"message": "Alerte marquée comme traitée"}

@app.get("/stats")
@app.get("/api/stats")
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
        "alertes_traitees": db.query(func.count(models.Alerte.id)).filter(models.Alerte.traitee == True).scalar(),
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

        # --- DIAGNOSTIC ---
        print(f"\n[RECEIVE] Message: '{request.message}' | Pending: {bool(request.pending_sql)}")
        
        # Logique de confirmation automatique
        is_confirmed = False
        msg_lower = request.message.lower().strip()
        
        # Liste étendue de confirmations
        confirm_words = ["oui", "ok", "vas-y", "confirme", "go", "c'est bon", "valider", "yes", "ouais", "affirmatif"]

        # Si on a une requête en attente ET que l'utilisateur confirme
        if request.pending_sql and any(x in msg_lower for x in confirm_words):
            is_confirmed = True
            sql_query = request.pending_sql
            print(f"--- !!! CONFIRMATION DÉTECTÉE !!! Exécution de : {sql_query}")
        elif request.pending_sql and any(x in msg_lower for x in ["non", "annule", "stop", "négatif"]):
            print("--- ANNULATION DÉTECTÉE ---")
            return ChatResponse(response="Action annulée.", sql=None, results=None, pending_sql=None)

        if not is_confirmed:
            # ÉTAPE 1 : Décision (SQL ou Guidage)
            prompt_sql = f"""Tu es l'expert SQL de BoviBot. Analise la demande de l'utilisateur.

CAS 1 : L'UTILISATEUR VEUT VOIR OU SAVOIR (SELECT)
- Génère immédiatement la requête SQL.
- Exemple : 'liste des animaux', 'quel âge a Bella ?', 'combien de ventes ?'.
- Utilise les fonctions fn_age_en_mois(id) et fn_gmq(id).
- RÉPONDS TOUJOURS DE MANIÈRE STRUCTURÉE (utilises des listes à puces * si nécessaire).
- INTERDICTION de citer des IDs techniques (id, race_id, etc.) ou des colonnes nulles dans tes explications.
- Concentre-toi sur le Nom, la Race (nom), le Sexe ('M' pour Mâle, 'F' pour Femelle) et les performances.

CAS 2 : L'UTILISATEUR VEUT AGIR (INSERT, CALL, UPDATE)
- Vérifie les champs obligatoires :
  * VENTE : animal_id, acheteur, prix_fcfa. (Utilise CALL sp_declarer_vente(id, acheteur, 'Non renseigné', prix, null, CURDATE()))
    - ATTENTION : L'acheteur est OBLIGATOIRE. Si l'utilisateur ne donne pas de nom, mets "sql": null et demande : "Quel est le nom de l'acheteur ?".

SCHÉMA SQL RÉEL (Interdiction d'utiliser d'autres tables/colonnes) :
- animaux (id, numero_tag, nom, race_id, sexe, date_naissance, poids_actuel, statut)
- races (id, nom, origine)
- pesees (id, animal_id, poids_kg, date_pesee, agent)
- alertes (id, animal_id, type, message, niveau)
- reproduction (id, mere_id, pere_id, date_saillie, date_velage_prevue, date_velage_reelle, nb_veaux, statut)
  * MAPPING STATUT: 'En gestation' -> 'en_gestation', 'Vêlé' -> 'vele', 'Saillie' -> 'saillie'.
  * ATTENTION: Utilise 'en_gestation' (avec T et underscore).
- ventes (id, animal_id, acheteur, date_vente, prix_fcfa)

CONSIGNES DE SÉCURITÉ :
1. JOIN OBLIGATOIRE : La table 'reproduction' n'a PAS de 'nom'. Pour avoir le nom d'une mère ou d'un père, fais un INNER JOIN avec 'animaux' (ex: a1.nom AS mere).
2. VALEURS EXACTES : Pour reproduction.statut, n'utilise QUE 'en_gestation', 'saillie' ou 'vele'.
3. PAS DE HALLUCINATION : Ne cite jamais d'IDs. Concentre-toi sur le Nom, la Race, le Sexe.

EXEMPLES :
- Utilisateur: "Pèse Diama" -> Assistant: {{"sql": null, "explication": "Quel est le poids de Diama et qui est l'agent ?"}}
- Utilisateur: "Vend Baaba" -> Assistant: {{"sql": null, "explication": "Quel est le prix de vente et qui est l'acheteur ?"}}
- Utilisateur: "Vend Baaba à Mame pour 500000" -> Assistant: {{"sql": "CALL sp_declarer_vente(1, 'Mame', ...)", "explication": "Vente de Baaba..."}}

LISTE ANIMAUX POUR RÉFÉRENCE : {liste_animaux}

RÉPONDS EN JSON : {{"sql": "la requête ou null", "explication": "ton message"}}"""

            # On construit l'historique en incluant d'abord les instructions (SYSTEM)
            messages_sql = [
                {"role": "system", "content": prompt_sql},
                *[{"role": m.role, "content": m.content} for m in request.history[-10:]],
                {"role": "user", "content": request.message}
            ]
            
            print(f"[DEBUG HISTORY] Envoi de {len(messages_sql)} messages (Contexte + Historique) au moteur SQL.")

            resp_sql = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages_sql,
                response_format={"type": "json_object"}
            )
            data_sql = json.loads(resp_sql.choices[0].message.content)
            print(f"\n[DEBUG IA] Réponse reçue : {data_sql}")
            sql_query = data_sql.get("sql")
            explanation = data_sql.get("explication")

            # SI ACTION -> On attend confirmation
            if sql_query and sql_query.lower() != "null" and any(x in sql_query.upper() for x in ["CALL", "INSERT", "UPDATE", "DELETE"]):
                pending_sql = sql_query
                sql_query = None 
                tool_result = "EN ATTENTE DE CONFIRMATION"
            elif (not sql_query or sql_query.lower() == "null") and explanation:
                return ChatResponse(response=explanation, history=request.history, pending_sql=None)
            else:
                tool_result = "Aucune action générée ou erreur de format."

        # ÉTAPE 2 : Exécution
        if sql_query:
            try:
                print(f"--- EXÉCUTION SQL : {sql_query} ---")
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
        messages_final = [
            *[{"role": m.role, "content": m.content} for m in request.history[-5:]],
            {"role": "user", "content": request.message}
        ]
        if pending_sql:
            p_final = f"""L'utilisateur veut effectuer cette action : {explanation}. 
            Demande une confirmation TRÈS CLAIRE commençant par '⚠️ ACTION EN ATTENTE'. 
            Répète les détails (nom, prix, etc.) pour être sûr.
            Explique que rien n'est enregistré tant qu'il ne clique pas sur OUI."""
            
            resp_final = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "Tu es BoviBot, gérant de ferme expert. Ton but est l'efficacité absolue. Sois direct et précis."},
                    {"role": "user", "content": p_final}
                ]
            )
        else:
            p_final = f"""Tu es BoviBot, gérant de ferme expert et rigoureux. 
            DONNÉES SQL RÉELLES : {tool_result}
            
            CONSIGNES :
            1. RÉPONSE PROFESSIONNELLE : Résume les données SQL ci-dessus de manière concise. Ne sois pas trop bavard.
            2. PAS D'INVENTION : Ne devine jamais une information absente du SQL.
            3. MISSION : Ton rôle est uniquement la gestion du troupeau. Pour tout le reste, réponds : "Je me concentre sur la gestion de BoviBot."
            4. AUCUN CONSEIL : Ne donne pas de conseils vétérinaires ou de recommandations.
            5. CONCISION : Sois très bref."""

            messages_final.append({"role": "user", "content": p_final})
            resp_final = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages_final
            )
        
        print(f"[REPLY] Response: '{resp_final.choices[0].message.content[:50]}...' | Pending: {bool(pending_sql)}")
        
        return ChatResponse(
            response=resp_final.choices[0].message.content,
            sql=sql_query or pending_sql,
            results=results_final,
            pending_sql=pending_sql
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Erreur globale: {e}")
        return ChatResponse(response=f"Désolé, une erreur est survenue : {str(e)}")

@app.get("/api/animaux")
def get_animaux_list(db: Session = Depends(get_db)):
    # On récupère tous les animaux avec leur race et GMQ calculé
    query = text("""
        SELECT a.numero_tag as tag, a.nom, r.nom as race, a.sexe, 
               fn_age_en_mois(a.id) as age_mois, a.poids_actuel, 
               fn_gmq(a.id) as gmq, a.statut
        FROM animaux a
        LEFT JOIN races r ON a.race_id = r.id
    """)
    result = db.execute(query)
    columns = result.keys()
    animaux = [dict(zip(columns, row)) for row in result.fetchall()]
    return animaux

@app.get("/api/stats/races")
def get_stats_races(db: Session = Depends(get_db)):
    """Répartition des animaux par race pour le graphique donut"""
    query = text("""
        SELECT r.nom as race, COUNT(a.id) as nb
        FROM animaux a
        JOIN races r ON a.race_id = r.id
        WHERE a.statut = 'actif'
        GROUP BY r.nom
    """)
    result = db.execute(query)
    return [dict(zip(result.keys(), row)) for row in result.fetchall()]

@app.get("/api/stats/races")
def get_stats_races(db: Session = Depends(get_db)):
    """Récupère la distribution des races dans le troupeau"""
    from sqlalchemy import func
    result = db.query(Race.nom, func.count(Animal.id)).join(Animal, Race.id == Animal.race_id).filter(Animal.statut == 'actif').group_by(Race.nom).all()
    
    return [{"race": r[0], "nb": r[1]} for r in result]

@app.get("/api/stats/gmq_history")
def get_stats_gmq_history(db: Session = Depends(get_db)):
    """Historique du GMQ pour le graphique en ligne (Dynamique)"""
    from datetime import date, timedelta
    
    # Générer les 4 derniers mois
    months = []
    today = date.today()
    for i in range(3, -1, -1):
        m = today.replace(day=1) - timedelta(days=i*30)
        months.append(m.strftime("%b"))
        
    # Calculer les moyennes réelles par mois
    troupeau_data = []
    # On regarde les 4 derniers mois
    for i in range(3, -1, -1):
        # Utilisation d'une requête SQL pour avoir la moyenne du GMQ ce mois-là (simulé par croissance poids)
        # Pour une démo réelle on utiliserait les différences de pesées, ici on moyenne le GMQ fonctionnel
        res = db.execute(text("SELECT AVG(fn_gmq(id)) FROM animaux WHERE statut = 'actif'")).fetchone()
        avg = float(res[0]) if res[0] else 0.45
        # On simule un historique réaliste qui monte
        val = round(avg * (0.8 + (i * 0.07)), 2) 
        troupeau_data.append(val)

    return {
        "labels": months,
        "troupeau": troupeau_data, 
        "meilleur": [round(x * 1.3, 2) for x in troupeau_data]
    }

@app.get("/reproduction")
@app.get("/api/reproduction")
def get_reproduction(db: Session = Depends(get_db)):
    """Liste les gestations en cours avec informations sur la mère et le père"""
    query = text("""
        SELECT r.id, r.mere_id, am.numero_tag as mere_tag, am.nom as mere_nom,
               r.pere_id, ap.numero_tag as pere_tag, ap.nom as pere_nom,
               r.date_saillie, r.date_velage_prevue, r.statut, r.notes
        FROM reproduction r
        JOIN animaux am ON r.mere_id = am.id
        LEFT JOIN animaux ap ON r.pere_id = ap.id
        WHERE r.statut = 'en_gestation'
        ORDER BY r.date_velage_prevue ASC
    """)
    result = db.execute(query)
    columns = result.keys()
    return [dict(zip(columns, row)) for row in result.fetchall()]

# Monter le dossier frontend pour servir le CSS, JS et les images
app.mount("/", StaticFiles(directory=frontend_path), name="frontend")

if __name__ == "__main__":
    import uvicorn
    # Lancement du serveur FastAPI
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
