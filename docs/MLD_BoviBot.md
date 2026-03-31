# MLD — BoviBot (Modèle Logique de Données)
**ESP/UCAD — DIC2 2025 | Sokhna Walo Diakhate**

---

## Conventions
- **PK** = Clé primaire
- **FK** = Clé étrangère
- _italique_ = attribut optionnel (NULL)

---

## Tables

### RACES (id, nom, origine, poids_adulte_moyen_kg, production_lait_litre_jour)
- **PK** : id

### ANIMAUX (id, numero_tag, nom, race_id, sexe, date_naissance, poids_actuel, statut, mere_id, pere_id, notes, created_at)
- **PK** : id
- **FK** : race_id → RACES(id)
- **FK** : mere_id → ANIMAUX(id)
- **FK** : pere_id → ANIMAUX(id)

### PESEES (id, animal_id, poids_kg, date_pesee, agent, notes, created_at)
- **PK** : id
- **FK** : animal_id → ANIMAUX(id)

### SANTE (id, animal_id, type, description, date_acte, veterinaire, medicament, cout, prochain_rdv, created_at)
- **PK** : id
- **FK** : animal_id → ANIMAUX(id)

### REPRODUCTION (id, mere_id, pere_id, date_saillie, date_velage_prevue, date_velage_reelle, nb_veaux, statut, notes)
- **PK** : id
- **FK** : mere_id → ANIMAUX(id)
- **FK** : pere_id → ANIMAUX(id)

### ALIMENTATION (id, animal_id, type_aliment, quantite_kg, date_alimentation, cout_unitaire_kg)
- **PK** : id
- **FK** : animal_id → ANIMAUX(id)

### VENTES (id, animal_id, acheteur, telephone_acheteur, date_vente, poids_vente_kg, prix_fcfa, notes, created_at)
- **PK** : id
- **FK** : animal_id → ANIMAUX(id)

### ALERTES (id, animal_id, type, message, niveau, date_creation, traitee)
- **PK** : id
- **FK** : animal_id → ANIMAUX(id) _(nullable)_

### HISTORIQUE_STATUT (id, animal_id, ancien_statut, nouveau_statut, date_changement)
- **PK** : id
- **FK** : animal_id → ANIMAUX(id)

---

## Dépendances fonctionnelles clés

- ANIMAUX.race_id → RACES : un animal appartient à une race
- ANIMAUX.mere_id / pere_id → ANIMAUX : auto-référence pour la généalogie
- PESEES.animal_id → ANIMAUX : une pesée concerne un animal
- REPRODUCTION.mere_id / pere_id → ANIMAUX : une gestation implique une mère et un père
- HISTORIQUE_STATUT.animal_id → ANIMAUX : généré automatiquement par le trigger trg_historique_statut

---

## Règles de gestion

1. Un animal ne peut être vendu que si son statut est **'actif'**
2. Le **poids_actuel** est mis à jour automatiquement à chaque pesée (via `sp_enregistrer_pesee`)
3. Tout changement de statut est tracé dans **HISTORIQUE_STATUT** (via `trg_historique_statut`)
4. Une alerte est créée si le GMQ < 0.3 kg/jour (via `sp_enregistrer_pesee`)
5. Une alerte critique est créée si un veau < 6 mois pèse < 60 kg (via `trg_alerte_poids_faible`)
6. Une alerte est créée si le prochain_rdv de vaccination est dépassé (via `trg_alerte_vaccination`)
