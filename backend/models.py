from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Text, Enum, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from db_config import Base

class User(Base):
    """ Modèle pour la table 'users' de la base de données. """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(100))
    is_active = Column(Boolean, default=True)

class Race(Base):
    __tablename__ = "races"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)
    origine = Column(String(100))
    poids_adulte_moyen_kg = Column(Numeric(6, 2))
    production_lait_litre_jour = Column(Numeric(6, 2), default=0)

class Animal(Base):
    __tablename__ = "animaux"

    id = Column(Integer, primary_key=True, index=True)
    numero_tag = Column(String(30), unique=True, nullable=False)
    nom = Column(String(100))
    race_id = Column(Integer, ForeignKey("races.id"))
    sexe = Column(Enum('M', 'F'), nullable=False)
    date_naissance = Column(Date, nullable=False)
    poids_actuel = Column(Numeric(6, 2))
    statut = Column(Enum('actif', 'vendu', 'mort', 'quarantaine'), default='actif')
    mere_id = Column(Integer, ForeignKey("animaux.id"))
    pere_id = Column(Integer, ForeignKey("animaux.id"))
    notes = Column(Text)
    created_at = Column(DateTime, default=None)

    race = relationship("Race")
    mere = relationship("Animal", remote_side=[id], foreign_keys=[mere_id])
    pere = relationship("Animal", remote_side=[id], foreign_keys=[pere_id])

class Pesee(Base):
    __tablename__ = "pesees"

    id = Column(Integer, primary_key=True, index=True)
    animal_id = Column(Integer, ForeignKey("animaux.id"), nullable=False)
    poids_kg = Column(Numeric(6, 2), nullable=False)
    date_pesee = Column(Date, nullable=False)
    agent = Column(String(100))
    notes = Column(Text)
    created_at = Column(DateTime, default=None)

    animal = relationship("Animal")

class Sante(Base):
    __tablename__ = "sante"

    id = Column(Integer, primary_key=True, index=True)
    animal_id = Column(Integer, ForeignKey("animaux.id"), nullable=False)
    type = Column(Enum('vaccination', 'traitement', 'examen', 'chirurgie'), nullable=False)
    description = Column(Text, nullable=False)
    date_acte = Column(Date, nullable=False)
    veterinaire = Column(String(100))
    medicament = Column(String(200))
    cout = Column(Numeric(10, 2), default=0)
    prochain_rdv = Column(Date)
    created_at = Column(DateTime, default=None)

    animal = relationship("Animal")

class Reproduction(Base):
    __tablename__ = "reproduction"

    id = Column(Integer, primary_key=True, index=True)
    mere_id = Column(Integer, ForeignKey("animaux.id"), nullable=False)
    pere_id = Column(Integer, ForeignKey("animaux.id"), nullable=False)
    date_saillie = Column(Date, nullable=False)
    date_velage_prevue = Column(Date)
    date_velage_reelle = Column(Date)
    nb_veaux = Column(Integer, default=0)
    statut = Column(Enum('en_gestation', 'vele', 'avortement', 'echec'), default='en_gestation')
    notes = Column(Text)

    mere = relationship("Animal", foreign_keys=[mere_id])
    pere = relationship("Animal", foreign_keys=[pere_id])

class Alimentation(Base):
    __tablename__ = "alimentation"

    id = Column(Integer, primary_key=True, index=True)
    animal_id = Column(Integer, ForeignKey("animaux.id"), nullable=False)
    type_aliment = Column(String(100), nullable=False)
    quantite_kg = Column(Numeric(6, 2), nullable=False)
    date_alimentation = Column(Date, nullable=False)
    cout_unitaire_kg = Column(Numeric(6, 2), default=0)

    animal = relationship("Animal")

class Vente(Base):
    __tablename__ = "ventes"

    id = Column(Integer, primary_key=True, index=True)
    animal_id = Column(Integer, ForeignKey("animaux.id"), nullable=False)
    acheteur = Column(String(150), nullable=False)
    telephone_acheteur = Column(String(20))
    date_vente = Column(Date, nullable=False)
    poids_vente_kg = Column(Numeric(6, 2))
    prix_fcfa = Column(Numeric(12, 2), nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=None)

    animal = relationship("Animal")

class Alerte(Base):
    __tablename__ = "alertes"

    id = Column(Integer, primary_key=True, index=True)
    animal_id = Column(Integer, ForeignKey("animaux.id"))
    type = Column(Enum('poids', 'vaccination', 'velage', 'sante', 'alimentation', 'autre'), nullable=False)
    message = Column(Text, nullable=False)
    niveau = Column(Enum('info', 'warning', 'critical'), default='warning')
    date_creation = Column(DateTime, default=None)
    traitee = Column(Boolean, default=False)

    animal = relationship("Animal")

class HistoriqueStatut(Base):
    __tablename__ = "historique_statut"

    id = Column(Integer, primary_key=True, index=True)
    animal_id = Column(Integer, ForeignKey("animaux.id"), nullable=False)
    ancien_statut = Column(String(20))
    nouveau_statut = Column(String(20))
    date_changement = Column(DateTime, default=None)

    animal = relationship("Animal")
