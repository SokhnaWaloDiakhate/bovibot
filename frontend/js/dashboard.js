/**
 * dashboard.js - Unified Logic for Dashboard & Charts
 */
const API_URL = "";
let chartGMQ = null;
let chartRaces = null;

async function chargerStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        const data = await response.json();
        document.getElementById("stat-animaux").textContent = data.animaux || "0";
        document.getElementById("stat-gmq").textContent = data.gmq || "0.0";
        document.getElementById("stat-alertes").textContent = data.alertes || "0";
        document.getElementById("stat-velages").textContent = data.velages || "0";
    } catch (e) { console.error("Stats error", e); }
}

async function initCharts() {
    // console.log("Initializing charts...");
    await Promise.all([creerChartGMQ(), creerChartRaces()]);
}

async function creerChartGMQ() {
    const canvas = document.getElementById("chart-gmq");
    if (!canvas) return;
    try {
        const r = await fetch(`${API_URL}/api/stats/gmq_history`);
        const d = await r.json();
        if (chartGMQ) chartGMQ.destroy();
        chartGMQ = new Chart(canvas.getContext("2d"), {
            type: "line",
            data: {
                labels: d.labels,
                datasets: [
                    { label: "Moyenne", data: d.troupeau, borderColor: "#4CAF82", tension: 0.4, fill: false },
                    { label: "Objectif", data: d.meilleur, borderColor: "#F0A030", borderDash: [5, 5], tension: 0.4, fill: false }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0 } } }
        });
    } catch (e) { console.error("GMQ Chart error", e); }
}

async function creerChartRaces() {
    const canvas = document.getElementById("chart-races");
    if (!canvas) return;
    try {
        const r = await fetch(`${API_URL}/api/stats/races`);
        const dataRaces = await r.json();
        if (chartRaces) chartRaces.destroy();
        const colors = ["#4CAF82", "#F0A030", "#7B6CF6", "#E05C5C", "#6B7E68"];
        chartRaces = new Chart(canvas.getContext("2d"), {
            type: "doughnut",
            data: {
                labels: dataRaces.map(r => r.race),
                datasets: [{ data: dataRaces.map(r => r.nb), backgroundColor: colors }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
        const legendEl = document.getElementById("donut-legend");
        if (legendEl) {
            legendEl.innerHTML = "";
            dataRaces.forEach((r, i) => {
                const item = document.createElement("div");
                item.style.fontSize = "12px";
                item.innerHTML = `<span style="color:${colors[i]}">●</span> ${r.race}: <strong>${r.nb}</strong>`;
                legendEl.appendChild(item);
            });
        }
    } catch (e) { console.error("Races Chart error", e); }
}

async function chargerDernieresAlertes() {
    try {
        const response = await fetch(`${API_URL}/alertes`);
        const alertes = await response.json();
        const listEl = document.getElementById("alertes-list");
        listEl.innerHTML = "";
        if (alertes.length === 0) {
            listEl.innerHTML = "<div style='color:var(--text-secondary);font-size:12px;padding:10px;'>Aucune alerte.</div>";
            return;
        }
        alertes.slice(0, 4).forEach(a => {
            const item = document.createElement("div");
            item.className = "alerte-item attention"; // Style simplifie
            item.innerHTML = `<span>!</span> <div class="alerte-msg">${a.message}</div>`;
            listEl.appendChild(item);
        });
    } catch (e) { console.error("Alertes error", e); }
}

async function chargerTableauAnimaux() {
    try {
        const response = await fetch(`${API_URL}/api/animaux`);
        const animaux = await response.json();
        const tbody = document.getElementById("animaux-tbody");
        tbody.innerHTML = "";
        animaux.slice(0, 5).forEach(a => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><span class="tag-pill">${a.numero_tag}</span></td>
                <td><strong>${a.nom}</strong></td>
                <td>${a.race}</td>
                <td>${a.sexe}</td>
                <td>${a.age_mois || 0} mois</td>
                <td>${a.poids_actuel}kg</td>
                <td>${a.gmq || 0}</td>
                <td><span class="statut-badge actif">actif</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error("Animaux error", e); }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("today-date").textContent = new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    chargerStats();
    initCharts();
    chargerDernieresAlertes();
    chargerTableauAnimaux();
});
