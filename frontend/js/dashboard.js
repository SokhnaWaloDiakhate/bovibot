// =============================================
//  dashboard.js — BoviBot
//  Données fictives (mock) en attendant le backend FastAPI
//  À remplacer par de vrais appels API plus tard
// =============================================

// URL du backend (à changer quand Mame Diarra aura lancé FastAPI)
const API_URL = "http://localhost:8002";

// ---- DATE DU JOUR ----
document.getElementById("today-date").textContent = new Date().toLocaleDateString("fr-FR", {
  weekday: "long", year: "numeric", month: "long", day: "numeric"
});

// =====================
//  DONNÉES MOCK
//  (simulées en attendant le vrai backend)
// =====================

const MOCK = {
  stats: {
    animaux: 24,
    gmq: 0.48,
    alertes: 5,
    velages: 3,
  },

  alertes: [
    { type: "critique",  icon: "🚨", message: "TAG-007 — poids critique : 52 kg avant 6 mois", time: "Il y a 2h" },
    { type: "attention", icon: "⚠️", message: "TAG-012 — vaccin dépassé depuis 8 jours", time: "Il y a 5h" },
    { type: "attention", icon: "🍼", message: "TAG-003 — vêlage prévu dans 4 jours", time: "Aujourd'hui" },
    { type: "info",      icon: "📊", message: "Rapport hebdomadaire généré automatiquement", time: "Hier" },
    { type: "critique",  icon: "🚨", message: "TAG-019 — statut changé : actif → malade", time: "Il y a 3j" },
  ],

  animaux: [
    { tag: "TAG-001", race: "Zébu Gobra", sexe: "M", age: "18 mois", gmq: "0.52", statut: "actif" },
    { tag: "TAG-002", race: "Ndama",      sexe: "F", age: "24 mois", gmq: "0.45", statut: "actif" },
    { tag: "TAG-003", race: "Zébu Gobra", sexe: "F", age: "36 mois", gmq: "0.60", statut: "actif" },
    { tag: "TAG-007", race: "Ndama",      sexe: "M", age: "4 mois",  gmq: "0.25", statut: "malade" },
    { tag: "TAG-012", race: "Métis",      sexe: "F", age: "30 mois", gmq: "0.38", statut: "actif" },
    { tag: "TAG-019", race: "Zébu Gobra", sexe: "M", age: "12 mois", gmq: "0.41", statut: "malade" },
  ]
};

// =====================
//  FONCTIONS D'AFFICHAGE
// =====================

function afficherStats() {
  // Quand le backend sera prêt, remplacer par :
  // const data = await fetch(`${API_URL}/stats`).then(r => r.json());
  const s = MOCK.stats;

  animerNombre("stat-animaux", s.animaux);
  animerNombre("stat-gmq", s.gmq, true);
  animerNombre("stat-alertes", s.alertes);
  animerNombre("stat-velages", s.velages);
}

function animerNombre(id, valeurFinale, decimal = false) {
  const el = document.getElementById(id);
  let debut = 0;
  const duree = 800;
  const debut_ts = performance.now();

  function step(ts) {
    const progress = Math.min((ts - debut_ts) / duree, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
    const valeur = debut + (valeurFinale - debut) * eased;
    el.textContent = decimal ? valeur.toFixed(2) : Math.round(valeur);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function afficherAlertes() {
  const container = document.getElementById("alertes-list");
  container.innerHTML = "";

  MOCK.alertes.forEach(a => {
    const div = document.createElement("div");
    div.className = `alerte-item ${a.type}`;
    div.innerHTML = `
      <span class="alerte-icon">${a.icon}</span>
      <span class="alerte-msg">${a.message}</span>
      <span class="alerte-time">${a.time}</span>
    `;
    container.appendChild(div);
  });

  // Mise à jour du badge
  document.getElementById("badge-alertes").textContent = MOCK.stats.alertes;
}

function afficherAnimaux() {
  const tbody = document.getElementById("animaux-tbody");
  tbody.innerHTML = "";

  MOCK.animaux.forEach(a => {
    const gmqColor = parseFloat(a.gmq) < 0.3 ? "color:#E05C5C;font-weight:700" : "";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="tag-pill">${a.tag}</span></td>
      <td>${a.race}</td>
      <td>${a.sexe === "M" ? "♂ Mâle" : "♀ Femelle"}</td>
      <td>${a.age}</td>
      <td style="${gmqColor}">${a.gmq} kg/j</td>
      <td><span class="statut-badge ${a.statut}">${a.statut}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// =====================
//  CONNEXION BACKEND
//  (vérification que l'API tourne)
// =====================
async function verifierBackend() {
  const pill = document.querySelector(".status-pill");
  try {
    const r = await fetch(`${API_URL}/`, { signal: AbortSignal.timeout(2000) });
    if (r.ok) {
      pill.className = "status-pill online";
      pill.innerHTML = `<span class="dot"></span> Backend connecté`;
    } else { throw new Error(); }
  } catch {
    pill.className = "status-pill offline";
    pill.innerHTML = `<span class="dot"></span> Backend hors ligne (mock)`;
  }
}

// =====================
//  INIT
// =====================
afficherStats();
afficherAlertes();
afficherAnimaux();
verifierBackend();
