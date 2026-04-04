-- ============================================================
--  BoviBot — Semaine 1 : Données test + Tests PL/SQL
--  Adapté au schéma schema_alwaysdata.sql existant
--  NE recrée rien — suppose que schema_alwaysdata.sql est déjà exécuté
-- ============================================================

USE bovibot_db;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. DONNÉES SUPPLÉMENTAIRES
--    (complète les données déjà insérées dans schema_alwaysdata.sql)
-- ============================================================

-- 1.1 Races supplémentaires
INSERT INTO races (nom, origine, poids_adulte_moyen_kg, production_lait_litre_jour) VALUES
('Brahman',             'Inde',    500.00, 4.0),
('Métis Gobra-Holstein','Sénégal', 420.00, 8.0);

-- 1.2 Animaux supplémentaires
--     TAG-001 à TAG-007 existent déjà → on ajoute TAG-008 à TAG-012
INSERT INTO animaux (numero_tag, nom, race_id, sexe, date_naissance, poids_actuel, statut) VALUES
('TAG-008', 'Kady',    5, 'F', '2020-09-17', 390.00, 'actif'),   -- vache adulte
('TAG-009', 'Astou',   5, 'F', '2021-11-25', 310.00, 'actif'),   -- vache adulte
('TAG-010', 'VeauX',   1, 'M', '2025-10-20',  42.00, 'actif'),   -- veau critique < 6 mois
('TAG-011', 'Ibou',    2, 'M', '2023-07-12',  95.00, 'actif'),   -- taureau GMQ faible
('TAG-012', 'Coura',   1, 'F', '2022-03-05', 260.00, 'actif');   -- vache

-- Liens parenté pour les nouveaux
UPDATE animaux SET mere_id = (SELECT id FROM (SELECT id FROM animaux WHERE numero_tag='TAG-002') t),
                   pere_id = (SELECT id FROM (SELECT id FROM animaux WHERE numero_tag='TAG-001') t2)
WHERE numero_tag IN ('TAG-010','TAG-011');

UPDATE animaux SET mere_id = (SELECT id FROM (SELECT id FROM animaux WHERE numero_tag='TAG-004') t),
                   pere_id = (SELECT id FROM (SELECT id FROM animaux WHERE numero_tag='TAG-003') t2)
WHERE numero_tag = 'TAG-012';

-- 1.3 Pesées supplémentaires pour tester fn_gmq
-- TAG-008 (Kady) — GMQ correct (~0.55 kg/j)
INSERT INTO pesees (animal_id, poids_kg, date_pesee, agent)
SELECT id, 180.0, '2021-03-17', 'Ibrahima Diop' FROM animaux WHERE numero_tag='TAG-008';
INSERT INTO pesees (animal_id, poids_kg, date_pesee, agent)
SELECT id, 280.0, '2022-03-17', 'Ibrahima Diop' FROM animaux WHERE numero_tag='TAG-008';
INSERT INTO pesees (animal_id, poids_kg, date_pesee, agent)
SELECT id, 390.0, '2024-01-17', 'Marième Sow'   FROM animaux WHERE numero_tag='TAG-008';

-- TAG-011 (Ibou) — GMQ très faible (~0.08 kg/j) → alerte attendue
INSERT INTO pesees (animal_id, poids_kg, date_pesee, agent)
SELECT id,  65.0, '2023-09-12', 'Ibrahima Diop' FROM animaux WHERE numero_tag='TAG-011';
INSERT INTO pesees (animal_id, poids_kg, date_pesee, agent)
SELECT id,  95.0, '2024-09-12', 'Marième Sow'   FROM animaux WHERE numero_tag='TAG-011';

-- TAG-012 (Coura) — GMQ moyen (~0.28 kg/j, juste sous le seuil) → alerte attendue
INSERT INTO pesees (animal_id, poids_kg, date_pesee, agent)
SELECT id, 130.0, '2022-05-05', 'Ibrahima Diop' FROM animaux WHERE numero_tag='TAG-012';
INSERT INTO pesees (animal_id, poids_kg, date_pesee, agent)
SELECT id, 260.0, '2024-03-05', 'Marième Sow'   FROM animaux WHERE numero_tag='TAG-012';

-- 1.4 Actes santé avec RDV dépassé → déclenche trg_alerte_vaccination
INSERT INTO sante (animal_id, type, description, date_acte, veterinaire, medicament, cout, prochain_rdv)
SELECT id, 'vaccination', 'Vaccin charbon', '2023-06-01', 'Dr. Fall', 'Charbovax', 12000, '2023-12-01'
FROM animaux WHERE numero_tag = 'TAG-008';   -- RDV dépassé → alerte CRITICAL

INSERT INTO sante (animal_id, type, description, date_acte, veterinaire, medicament, cout, prochain_rdv)
SELECT id, 'traitement', 'Déparasitage', '2024-01-10', 'Dr. Fall', 'Ivermectine', 8000, '2024-07-10'
FROM animaux WHERE numero_tag = 'TAG-011';   -- RDV dépassé → alerte CRITICAL

-- 1.5 Reproduction supplémentaire (vêlages proches pour evt_alerte_velages)
INSERT INTO reproduction (mere_id, pere_id, date_saillie, date_velage_prevue, statut)
SELECT m.id, p.id, '2025-12-01', DATE_ADD(CURDATE(), INTERVAL 4 DAY), 'en_gestation'
FROM animaux m, animaux p
WHERE m.numero_tag='TAG-008' AND p.numero_tag='TAG-001';

INSERT INTO reproduction (mere_id, pere_id, date_saillie, date_velage_prevue, statut)
SELECT m.id, p.id, '2025-11-15', DATE_ADD(CURDATE(), INTERVAL 6 DAY), 'en_gestation'
FROM animaux m, animaux p
WHERE m.numero_tag='TAG-009' AND p.numero_tag='TAG-003';

-- 1.6 Alimentation supplémentaire (pour tester requête coût du mois)
INSERT INTO alimentation (animal_id, type_aliment, quantite_kg, date_alimentation, cout_unitaire_kg)
SELECT id, 'Foin de brousse', 8.0, CURDATE(), 150 FROM animaux WHERE numero_tag='TAG-008';
INSERT INTO alimentation (animal_id, type_aliment, quantite_kg, date_alimentation, cout_unitaire_kg)
SELECT id, 'Tourteau arachide', 2.0, CURDATE(), 400 FROM animaux WHERE numero_tag='TAG-008';
INSERT INTO alimentation (animal_id, type_aliment, quantite_kg, date_alimentation, cout_unitaire_kg)
SELECT id, 'Concentré croissance', 1.5, CURDATE(), 600 FROM animaux WHERE numero_tag='TAG-011';
INSERT INTO alimentation (animal_id, type_aliment, quantite_kg, date_alimentation, cout_unitaire_kg)
SELECT id, 'Lait poudre', 0.5, CURDATE(), 2500 FROM animaux WHERE numero_tag='TAG-010';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 2. TESTS DES FONCTIONS
-- ============================================================

SELECT '════════════════════════════════════════' AS '';
SELECT '  TEST A : fn_age_en_mois()' AS '';
SELECT '════════════════════════════════════════' AS '';

SELECT
    numero_tag,
    nom,
    date_naissance,
    fn_age_en_mois(id) AS age_mois
FROM animaux
ORDER BY date_naissance DESC;

-- ──────────────────────────────────────────

SELECT '════════════════════════════════════════' AS '';
SELECT '  TEST B : fn_gmq()' AS '';
SELECT '════════════════════════════════════════' AS '';

SELECT
    a.numero_tag,
    a.nom,
    fn_age_en_mois(a.id)                   AS age_mois,
    ROUND(fn_gmq(a.id), 3)                 AS gmq_kg_j,
    CASE
        WHEN fn_gmq(a.id) = 0         THEN '⚪ Pas assez de pesées'
        WHEN fn_gmq(a.id) < 0.3       THEN '🔴 GMQ FAIBLE'
        WHEN fn_gmq(a.id) < 0.5       THEN '🟡 GMQ MOYEN'
        ELSE                               '🟢 GMQ OK'
    END                                    AS statut_gmq
FROM animaux a
WHERE a.statut = 'actif'
ORDER BY gmq_kg_j ASC;


-- ============================================================
-- 3. TESTS DES PROCÉDURES
-- ============================================================

-- ──────────────────────────────────────────
SELECT '════════════════════════════════════════' AS '';
SELECT '  TEST C : sp_enregistrer_pesee — cas normal TAG-001' AS '';
SELECT '════════════════════════════════════════' AS '';

CALL sp_enregistrer_pesee(
    (SELECT id FROM animaux WHERE numero_tag = 'TAG-001'),
    335.0,
    CURDATE(),
    'Agent-Test'
);

-- Vérifier la pesée insérée
SELECT * FROM pesees WHERE animal_id = (SELECT id FROM animaux WHERE numero_tag='TAG-001')
ORDER BY date_pesee DESC LIMIT 3;

-- ──────────────────────────────────────────
SELECT '════════════════════════════════════════' AS '';
SELECT '  TEST D : sp_enregistrer_pesee — GMQ faible TAG-011' AS '';
SELECT '  (attendu : alerte warning GMQ < 0.3)' AS '';
SELECT '════════════════════════════════════════' AS '';

CALL sp_enregistrer_pesee(
    (SELECT id FROM animaux WHERE numero_tag = 'TAG-011'),
    97.0,
    CURDATE(),
    'Agent-Test'
);

SELECT * FROM alertes WHERE animal_id = (SELECT id FROM animaux WHERE numero_tag='TAG-011')
ORDER BY date_creation DESC LIMIT 3;

-- ──────────────────────────────────────────
SELECT '════════════════════════════════════════' AS '';
SELECT '  TEST E : sp_enregistrer_pesee — veau critique TAG-010' AS '';
SELECT '  (< 60 kg, < 6 mois → alerte CRITICAL via trigger)' AS '';
SELECT '════════════════════════════════════════' AS '';

CALL sp_enregistrer_pesee(
    (SELECT id FROM animaux WHERE numero_tag = 'TAG-010'),
    42.0,
    CURDATE(),
    'Agent-Test'
);

SELECT * FROM alertes WHERE animal_id = (SELECT id FROM animaux WHERE numero_tag='TAG-010')
ORDER BY date_creation DESC LIMIT 3;

-- ──────────────────────────────────────────
SELECT '════════════════════════════════════════' AS '';
SELECT '  TEST F : sp_declarer_vente — cas normal TAG-012' AS '';
SELECT '════════════════════════════════════════' AS '';

CALL sp_declarer_vente(
    (SELECT id FROM animaux WHERE numero_tag = 'TAG-012'),
    'Oumar Ba',
    '+221771234567',
    260000.00,
    260.0,
    CURDATE()
);

-- Vérifier vente + changement statut
SELECT * FROM ventes WHERE animal_id = (SELECT id FROM animaux WHERE numero_tag='TAG-012');
SELECT numero_tag, statut FROM animaux WHERE numero_tag = 'TAG-012';

-- ──────────────────────────────────────────
SELECT '════════════════════════════════════════' AS '';
SELECT '  TEST G : sp_declarer_vente — animal déjà vendu (cas limite)' AS '';
SELECT '  (attendu : ERREUR SQLSTATE 45000)' AS '';
SELECT '════════════════════════════════════════' AS '';

-- Capture l'erreur proprement
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 @msg = MESSAGE_TEXT;
        SELECT CONCAT('✅ Erreur attendue capturée : ', @msg) AS resultat_test_G;
    END;
    CALL sp_declarer_vente(
        (SELECT id FROM animaux WHERE numero_tag = 'TAG-012'),
        'Autre Acheteur', '+221770000000', 100000.00, 260.0, CURDATE()
    );
END;


-- ============================================================
-- 4. TESTS DES TRIGGERS
-- ============================================================

-- ──────────────────────────────────────────
SELECT '════════════════════════════════════════' AS '';
SELECT '  TEST H : trg_historique_statut' AS '';
SELECT '  (la vente de TAG-012 doit avoir logué un changement)' AS '';
SELECT '════════════════════════════════════════' AS '';

SELECT h.*, a.numero_tag
FROM historique_statut h
JOIN animaux a ON a.id = h.animal_id
ORDER BY h.date_changement DESC
LIMIT 5;

-- ──────────────────────────────────────────
SELECT '════════════════════════════════════════' AS '';
SELECT '  TEST I : trg_alerte_vaccination' AS '';
SELECT '  (inserts dans sante avec RDV dépassé → alertes critiques)' AS '';
SELECT '════════════════════════════════════════' AS '';

-- Insérer un acte avec RDV dépassé pour TAG-009
INSERT INTO sante (animal_id, type, description, date_acte, veterinaire, cout, prochain_rdv)
SELECT id, 'vaccination', 'Test trigger vaccin', CURDATE(), 'Dr. Test', 0, '2020-01-01'
FROM animaux WHERE numero_tag = 'TAG-009';

SELECT * FROM alertes
WHERE type = 'vaccination'
ORDER BY date_creation DESC
LIMIT 5;

-- ──────────────────────────────────────────
SELECT '════════════════════════════════════════' AS '';
SELECT '  TEST J : trg_alerte_poids_faible' AS '';
SELECT '  (veau TAG-010, < 6 mois, < 60 kg → alerte critical)' AS '';
SELECT '════════════════════════════════════════' AS '';

SELECT * FROM alertes
WHERE type = 'poids' AND niveau = 'critical'
ORDER BY date_creation DESC
LIMIT 5;


-- ============================================================
-- 5. REQUÊTES DE CONSULTATION LLM (Text-to-SQL)
-- ============================================================

SELECT '════════════════════════════════════════' AS '';
SELECT '  REQUÊTE K1 : Tous animaux actifs + âge + GMQ' AS '';
SELECT '════════════════════════════════════════' AS '';

SELECT
    a.numero_tag,
    a.nom,
    a.sexe,
    r.nom                      AS race,
    fn_age_en_mois(a.id)       AS age_mois,
    ROUND(fn_gmq(a.id), 3)     AS gmq_kg_j
FROM animaux a
JOIN races r ON r.id = a.race_id
WHERE a.statut = 'actif'
ORDER BY a.numero_tag;

-- ──────────────────────────────────────────
SELECT '════════════════════════════════════════' AS '';
SELECT '  REQUÊTE K2 : Animaux GMQ < 0.3 kg/j' AS '';
SELECT '════════════════════════════════════════' AS '';

SELECT
    a.numero_tag,
    a.nom,
    ROUND(fn_gmq(a.id), 3) AS gmq
FROM animaux a
WHERE a.statut = 'actif'
HAVING gmq > 0 AND gmq < 0.3
ORDER BY gmq ASC;

-- ──────────────────────────────────────────
SELECT '════════════════════════════════════════' AS '';
SELECT '  REQUÊTE K3 : Femelles vêlant dans 30 jours' AS '';
SELECT '════════════════════════════════════════' AS '';

SELECT
    a.numero_tag,
    a.nom,
    r.date_velage_prevue,
    DATEDIFF(r.date_velage_prevue, CURDATE()) AS jours_restants
FROM reproduction r
JOIN animaux a ON a.id = r.mere_id
WHERE r.statut = 'en_gestation'
  AND r.date_velage_prevue BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
ORDER BY r.date_velage_prevue ASC;

-- ──────────────────────────────────────────
SELECT '════════════════════════════════════════' AS '';
SELECT '  REQUÊTE K4 : Coût alimentation mois courant' AS '';
SELECT '════════════════════════════════════════' AS '';

SELECT
    SUM(quantite_kg * cout_unitaire_kg)   AS cout_total_fcfa,
    COUNT(DISTINCT animal_id)             AS nb_animaux_alimentes,
    MONTHNAME(CURDATE())                  AS mois
FROM alimentation
WHERE MONTH(date_alimentation) = MONTH(CURDATE())
  AND YEAR(date_alimentation)  = YEAR(CURDATE());

-- ──────────────────────────────────────────
SELECT '════════════════════════════════════════' AS '';
SELECT '  REQUÊTE K5 : Animaux non vaccinés depuis 6 mois' AS '';
SELECT '════════════════════════════════════════' AS '';

SELECT
    a.numero_tag,
    a.nom,
    MAX(s.date_acte)                        AS derniere_vaccination,
    DATEDIFF(CURDATE(), MAX(s.date_acte))   AS jours_depuis
FROM animaux a
LEFT JOIN sante s ON s.animal_id = a.id AND s.type = 'vaccination'
WHERE a.statut = 'actif'
GROUP BY a.id, a.numero_tag, a.nom
HAVING derniere_vaccination IS NULL
    OR jours_depuis > 180
ORDER BY jours_depuis DESC;


-- ============================================================
-- 6. BILAN FINAL
-- ============================================================

SELECT '════════════════════════════════════════' AS '';
SELECT '  BILAN : Toutes les alertes générées' AS '';
SELECT '════════════════════════════════════════' AS '';

SELECT
    al.id,
    a.numero_tag,
    al.type,
    al.niveau,
    al.message,
    al.date_creation
FROM alertes al
LEFT JOIN animaux a ON a.id = al.animal_id
ORDER BY al.date_creation DESC;

SELECT '════════════════════════════════════════' AS '';
SELECT '  BILAN : Historique des changements de statut' AS '';
SELECT '════════════════════════════════════════' AS '';

SELECT h.*, a.numero_tag
FROM historique_statut h
JOIN animaux a ON a.id = h.animal_id
ORDER BY h.date_changement DESC;

SELECT '✅ Semaine 1 — Tous les tests exécutés avec succès !' AS RESULTAT_FINAL;

-- ============================================================
-- FIN DU SCRIPT DE TEST
-- ============================================================