# Projet Bovibot - API FastAPI

Bienvenue dans le projet Bovibot ! Voici comment installer et lancer votre application.

## Structure du Projet
Le code du serveur se trouve dans le dossier `backend/`.

## Installation (Étapes simples)

1.  **Ouvrez un terminal** dans ce dossier (`bovibot/`).
2.  **Entrez dans le dossier backend** :
    ```powershell
    cd backend
    ```
3.  **Installez les outils nécessaires** :
    ```powershell
    pip install -r requirements.txt
    ```

## Lancer l'Application

Une fois l'installation terminée, tapez cette commande dans le terminal (toujours dans le dossier `backend`) :

```powershell
uvicorn main:app --reload
```

## Comment tester si ça marche ?

Une fois le serveur lancé :
1.  **Page d'accueil** : Ouvrez [http://localhost:8000](http://localhost:8000) dans votre navigateur.
2.  **Documentation automatique** : Allez sur [http://localhost:8000/docs](http://localhost:8000/docs).

## Configuration
Si vous devez changer les accès à la base de données, cela se passe dans le fichier `backend/.env`.
