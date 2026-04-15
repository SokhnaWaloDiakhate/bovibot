// URL du backend
const API_URL = ""; // Racine relative car servi par FastAPI

// ---- DATE DU JOUR ----
document.getElementById("today-date").textContent = new Date().toLocaleDateString("fr-FR", {
  weekday: "long", year: "numeric", month: "long", day: "numeric"
});

// =====================
//  FONCTIONS D'AFFICHAGE (API REEL)
// =====================

async function afficherStats() {
  try {
    const r = await fetch(`${API_URL}/stats`);
    const s = await r.json();

    animerNombre("stat-animaux", s.animaux);
    animerNombre("stat-gmq", s.gmq, true);
    animerNombre("stat-alertes", s.alertes);
    animerNombre("stat-velages", s.velages);
  } catch (err) {
    console.error("Erreur stats:", err);
  }
}

function animerNombre(id, valeurFinale, decimal = false) {
  const el = document.getElementById(id);
  if (!el) return;
  let debut = 0;
  const duree = 800;
  const debut_ts = performance.now();

  function step(ts) {
    const progress = Math.min((ts - debut_ts) / duree, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const valeur = debut + (valeurFinale - debut) * eased;
    el.textContent = decimal ? valeur.toFixed(2) : Math.round(valeur);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

async function afficherAlertes() {
  const container = document.getElementById("alertes-list");
  if (!container) return;
  
  try {
    const r = await fetch(`${API_URL}/alertes`);
    const alertes = await r.json();
    
    container.innerHTML = "";
    alertes.forEach(a => {
      let icon = "⚠️";
      if (a.type === "poids") icon = "🚨";
      if (a.type === "velage") icon = "🍼";
      if (a.type === "vaccination") icon = "💉";
      if (a.type === "autre") icon = "📊";

      const div = document.createElement("div");
      div.className = `alerte-item ${a.niveau}`;
      div.innerHTML = `
        <span class="alerte-icon">${icon}</span>
        <span class="alerte-msg">${a.message}</span>
        <span class="alerte-time">${new Date(a.date_creation).toLocaleTimeString("fr-FR", {hour: '2-digit', minute:'2-digit'})}</span>
      `;
      container.appendChild(div);
    });

    // Mise à jour du badge
    document.getElementById("badge-alertes").textContent = alertes.length;
  } catch (err) {
    console.error("Erreur alertes:", err);
  }
}

async function afficherAnimaux() {
  const tbody = document.getElementById("animaux-tbody");
  if (!tbody) return;

  try {
    const r = await fetch(`${API_URL}/api/animaux`);
    const animaux = await r.json();

    tbody.innerHTML = "";
    animaux.forEach(a => {
      const gmqValue = parseFloat(a.gmq);
      const gmqColor = gmqValue < 0.3 ? "color:#E05C5C;font-weight:700" : "";
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="tag-pill">${a.tag}</span></td>
        <td>${a.race}</td>
        <td>${a.sexe === "M" ? "♂ Mâle" : "♀ Femelle"}</td>
        <td>${a.age_mois} mois</td>
        <td style="${gmqColor}">${gmqValue.toFixed(2)} kg/j</td>
        <td><span class="statut-badge ${a.statut}">${a.statut}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Erreur animaux:", err);
  }
}

// =====================
//  CONNEXION BACKEND
// =====================
async function verifierBackend() {
  const pill = document.querySelector(".status-pill");
  if (!pill) return;
  try {
    const r = await fetch(`/`, { signal: AbortSignal.timeout(2000) });
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
//  INIT PARTAGÉ
// =====================
function initDashboard() {
  console.log("Démarrage du dashboard...");
  afficherStats();
  afficherAlertes();
  afficherAnimaux();
  verifierBackend();
}

// Utilisation de addEventListener pour éviter les conflits avec charts.js
window.addEventListener('load', initDashboard);

