/**
 * BoviBot - Gestations Logic
 */

let allGestations = [];
let f_actif = "toutes";

document.addEventListener('DOMContentLoaded', () => {
    const todayDate = document.getElementById("today-date");
    if (todayDate) {
        todayDate.textContent = new Date().toLocaleDateString("fr-FR", {
            weekday: "long", year: "numeric", month: "long", day: "numeric"
        });
    }
    chargerGestations();
});

async function chargerGestations() {
    const grid = document.getElementById("gestations-grid");
    try {
        const response = await fetch('/api/reproduction');
        allGestations = await response.json();
        afficher();
    } catch (error) {
        console.error("Erreur chargerGestations:", error);
        grid.innerHTML = '<div class="empty-state" style="color:#C0392B;">Erreur lors du chargement des donnees.</div>';
    }
}

function afficher() {
    const grid = document.getElementById("gestations-grid");
    grid.innerHTML = "";

    const now = new Date();
    
    const liste = allGestations.filter(g => {
        const datePrev = new Date(g.date_velage_prevue);
        const diffDays = Math.ceil((datePrev - now) / (1000 * 60 * 60 * 24));
        
        if (f_actif === "imminent") return diffDays <= 7 && diffDays >= 0;
        if (f_actif === "mois") return datePrev.getMonth() === now.getMonth() && datePrev.getFullYear() === now.getFullYear();
        if (f_actif === "normal") return diffDays > 7;
        return true;
    });

    if (liste.length === 0) {
        grid.innerHTML = '<div class="empty-state">Aucune gestation ne correspond a ce filtre.</div>';
        return;
    }

    liste.forEach((g, i) => {
        const dateSaillie = new Date(g.date_saillie);
        const datePrev = new Date(g.date_velage_prevue);
        const diffDays = Math.ceil((datePrev - now) / (1000 * 60 * 60 * 24));
        
        // Progress (avg 283 days)
        const totalDuration = 283;
        const elapsed = Math.ceil((now - dateSaillie) / (1000 * 60 * 60 * 24));
        const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        
        const isImminent = diffDays <= 7 && diffDays >= 0;
        const statusLabel = isImminent ? "Velage proche" : "En cours";
        const progressColor = isImminent ? "#E05C5C" : "#4CAF82"; // Red if imminent, Green if normal

        const card = document.createElement('div');
        card.className = 'gest-card';
        card.style.animationDelay = `${i * 0.05}s`;

        card.innerHTML = `
            <div class="gest-header">
                <div class="gest-avatar">🐄</div>
                <div class="gest-title">
                    <div class="gest-tag">${g.mere_tag} (Animal #${g.mere_id})</div>
                    <div class="gest-name">${g.mere_nom || "Vache"}</div>
                </div>
                <div class="gest-badge ${isImminent ? 'imminent' : ''}">${statusLabel}</div>
            </div>
            
            <div class="gest-body">
                <div class="progression-section">
                    <div class="progression-header">
                        <span class="progression-label">Progression gestation</span>
                        <span class="progression-val">${Math.round(progress)}%</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-bar" style="width: ${progress}%; background: ${progressColor}"></div>
                    </div>
                </div>

                <div class="details-grid">
                    <div class="detail-item">
                        <div class="detail-label">Date Saillie</div>
                        <div class="detail-val">${dateSaillie.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Velage Prevu</div>
                        <div class="detail-val">${datePrev.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Pere</div>
                        <div class="detail-val">${g.pere_tag || g.pere_nom || 'Inconnu'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Jours Restants</div>
                        <div class="detail-val">${diffDays > 0 ? diffDays + ' jours' : 'Terme atteint'}</div>
                    </div>
                </div>

                <div class="gest-alert ${isImminent ? '' : 'good'}">
                    <span>${isImminent ? '⚠️' : '🍼'} Dans ${diffDays > 0 ? diffDays : 0} jours</span>
                </div>
            </div>
            
            <div class="gest-footer">
                <button class="btn-gest btn-view">👁️ Voir l'animal</button>
                <button class="btn-gest btn-alert-create">🔔 Creer alerte</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filtrer(val, btn) {
    f_actif = val;
    document.querySelectorAll(".ftab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    afficher();
}
