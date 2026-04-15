import json
from groq import Groq
import os

# Configuration (identique au backend)
client = Groq(api_key="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")

# La liste des animaux comme dans le backend
liste_animaux = "1:Baaba (TAG-001), 2:Yaye (TAG-002), 11:Diama (TAG-011)"

# Le Prompt actuel que nous testons
PROMPT_SQL = f"""Tu es l'expert SQL de BoviBot. Analise la demande de l'utilisateur.

CAS 1 : L'UTILISATEUR VEUT VOIR OU SAVOIR (SELECT)
- Génère une requête SQL SELECT simple.
- Réponds avec un JSON : {{"sql": "SELECT...", "explication": "ton message"}}

CAS 2 : L'UTILISATEUR VEUT AGIR (INSERT, CALL, UPDATE)
- Vérifie les champs obligatoires :
  * VENTE : animal_id, acheteur, prix_fcfa. (Utilise CALL sp_declarer_vente(id, acheteur, 'Non renseigné', prix, null, CURDATE()))
    - ATTENTION : L'acheteur est OBLIGATOIRE. Si l'utilisateur ne donne pas de nom, mets "sql": null et demande : "Quel est le nom de l'acheteur ?".

SCHÉMA SQL RÉEL (Interdiction d'utiliser d'autres tables/colonnes) :
- animaux (id, numero_tag, nom, race_id, sexe, date_naissance, poids_actuel, statut)
- races (id, nom, origine)
- pesees (id, animal_id, poids_kg, date_pesee, agent)
- alertes (id, animal_id, type, message, niveau)
- ventes (id, animal_id, acheteur, date_vente, prix_fcfa)

CONSIGNES DE SÉCURITÉ :
1. SUIVI DU DIALOGUE : Regarde tes questions précédentes. Si l'utilisateur y répond, complète l'action.
2. VERBES D'ACTION : Pour une PESÉE, utilise CALL sp_enregistrer_pesee(id, poids, CURDATE(), agent). Pour une VENTE, appelle CALL sp_declarer_vente.
3. PAS DE HALLUCINATION : Si une table ou une colonne n'est pas listée ci-dessus, elle n'existe pas. Ne l'invente jamais.
- S'il manque une info : mets "sql" à null et demande l'info précise.
- Si tout est prêt : génère le SQL exact utilisant uniquement le schéma ci-dessus.

LISTE ANIMAUX : {liste_animaux}
RÉPONDS EN JSON : {{"sql": "la requête ou null", "explication": "ton message"}}"""

# Nos 15 scénarios de test (On commence par 15 pour voir)
SCENARIOS = [
    "Vends Baaba", 
    "Vendre Diama a Ousmane pour 150000",
    "Pese le tag TAG-001 a 400kg",
    "Quel est le poids de Yaye ?",
    "Ajoute une vache qui s'appelle Marguerite",
    "Bonjour comment ça va ?",
    "Vend Diama a 500000",
    "Diarra a pesé TAG-011 à 500kg",
    "Raconte moi une blague",
    "Baaba est mort",
    "Quels chevaux sont a la ferme ?", # Hallucination test
    "Vends TAG-001 pour 200000 à l'agent Samba", # Agent != acheteur
    "Enregistre une pesée de 500", # Manque animal
    "Liste des vaches",
    "Statistiques de croissance"
]

print("--- DÉBUT DU STRESS TEST BOVIBOT ---")

for i, msg in enumerate(SCENARIOS):
    print(f"\n[TEST {i+1}] Message: '{msg}'")
    try:
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": PROMPT_SQL},
                {"role": "user", "content": msg}
            ],
            response_format={"type": "json_object"}
        )
        result = json.loads(resp.choices[0].message.content)
        sql = result.get('sql')
        expl = result.get('explication')
        print(f"ROBOT SQL: {sql}")
        print(f"ROBOT EXPL: {expl}")
        
        # Petit check de sécurité
        if "select" in msg.lower() and "SELECT" not in str(sql):
            print("ATTENTION: Absence de SELECT pour une demande de lecture.")
        if ("vend" in msg.lower() or "pèse" in msg.lower()) and "SELECT" in str(sql):
            print("ERREUR: SELECT généré pour une ACTION.")
            
    except Exception as e:
        print(f"ERREUR CRITIQUE: {e}")

print("\n--- FIN DU TEST ---")
