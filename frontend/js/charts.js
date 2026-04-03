// =============================================
//  charts.js — BoviBot
//  Graphiques Chart.js : GMQ + Races
//  Données mock — remplacer par API quand backend prêt
// =============================================

// =====================
//  DONNÉES MOCK PAR PÉRIODE
// =====================
const DONNEES_GMQ = {
  "7j": {
    labels: ["28 Mar", "29 Mar", "30 Mar", "31 Mar", "1 Avr", "2 Avr", "3 Avr"],
    troupeau: [0.44, 0.46, 0.45, 0.47, 0.48, 0.47, 0.48],
    tag001:   [0.50, 0.51, 0.52, 0.51, 0.53, 0.52, 0.52],
    tag007:   [0.22, 0.23, 0.24, 0.23, 0.25, 0.24, 0.25],
  },
  "1m": {
    labels: ["S1 Mar", "S2 Mar", "S3 Mar", "S4 Mar"],
    troupeau: [0.42, 0.44, 0.46, 0.48],
    tag001:   [0.48, 0.50, 0.51, 0.52],
    tag007:   [0.18, 0.20, 0.22, 0.25],
  },
  "3m": {
    labels: ["Janvier", "Février", "Mars"],
    troupeau: [0.40, 0.43, 0.48],
    tag001:   [0.45, 0.49, 0.52],
    tag007:   [0.15, 0.18, 0.25],
  }
};

const DONNEES_RACES = [
  { race: "Zébu Gobra", nb: 12, couleur: "#4CAF82" },
  { race: "Ndama",      nb: 8,  couleur: "#F0A030" },
  { race: "Métis",      nb: 4,  couleur: "#7B6CF6" },
];

// =====================
//  GRAPHIQUE GMQ (ligne)
// =====================
let chartGMQ = null;

function creerChartGMQ(periode) {
  const d = DONNEES_GMQ[periode];
  const ctx = document.getElementById("chart-gmq").getContext("2d");

  if (chartGMQ) chartGMQ.destroy();

  chartGMQ = new Chart(ctx, {
    type: "line",
    data: {
      labels: d.labels,
      datasets: [
        {
          label: "Moyenne troupeau",
          data: d.troupeau,
          borderColor: "#4CAF82",
          backgroundColor: "rgba(76,175,130,0.08)",
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: "#4CAF82",
          tension: 0.4,
          fill: true,
        },
        {
          label: "TAG-001 (meilleur)",
          data: d.tag001,
          borderColor: "#F0A030",
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: "#F0A030",
          tension: 0.4,
          borderDash: [4, 3],
        },
        {
          label: "TAG-007 (critique)",
          data: d.tag007,
          borderColor: "#E05C5C",
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: "#E05C5C",
          tension: 0.4,
          borderDash: [4, 3],
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: { family: "DM Sans", size: 11 },
            boxWidth: 12,
            padding: 16,
            color: "#6B7E68",
          }
        },
        tooltip: {
          backgroundColor: "#1A2318",
          titleFont: { family: "Syne", size: 12 },
          bodyFont:  { family: "DM Sans", size: 11 },
          padding: 10,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label} : ${ctx.parsed.y.toFixed(2)} kg/j`
          }
        },
        // Ligne de seuil critique (0.3 kg/j)
        annotation: null,
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: "DM Sans", size: 11 }, color: "#6B7E68" }
        },
        y: {
          min: 0,
          max: 0.7,
          grid: { color: "rgba(0,0,0,0.05)" },
          ticks: {
            font: { family: "DM Sans", size: 11 },
            color: "#6B7E68",
            callback: v => v.toFixed(1) + " kg/j"
          }
        }
      }
    }
  });

  // Ajouter ligne seuil critique manuellement
  ajouterLigneSeuil();
}

// Ligne rouge pointillée à 0.3 kg/j (seuil critique du cahier des charges)
function ajouterLigneSeuil() {
  const chart = chartGMQ;
  const originalDraw = chart.draw.bind(chart);
  chart.draw = function() {
    originalDraw();
    const ctx = chart.ctx;
    const yScale = chart.scales.y;
    const xScale = chart.scales.x;
    const y = yScale.getPixelForValue(0.3);

    ctx.save();
    ctx.strokeStyle = "#E05C5C";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(xScale.left, y);
    ctx.lineTo(xScale.right, y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#E05C5C";
    ctx.font = "10px DM Sans";
    ctx.fillText("⚠ Seuil critique : 0.3 kg/j", xScale.left + 6, y - 5);
    ctx.restore();
  };
  chart.draw();
}

// Boutons période
function changerPeriode(periode, btn) {
  document.querySelectorAll(".period-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  creerChartGMQ(periode);
}

// =====================
//  GRAPHIQUE RACES (donut)
// =====================
function creerChartRaces() {
  const ctx = document.getElementById("chart-races").getContext("2d");
  const total = DONNEES_RACES.reduce((s, r) => s + r.nb, 0);

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: DONNEES_RACES.map(r => r.race),
      datasets: [{
        data: DONNEES_RACES.map(r => r.nb),
        backgroundColor: DONNEES_RACES.map(r => r.couleur),
        borderWidth: 3,
        borderColor: "#fff",
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1A2318",
          titleFont: { family: "Syne", size: 12 },
          bodyFont:  { family: "DM Sans", size: 11 },
          padding: 10,
          callbacks: {
            label: ctx => ` ${ctx.label} : ${ctx.raw} animaux (${Math.round(ctx.raw/total*100)}%)`
          }
        }
      }
    },
    plugins: [{
      // Texte centré dans le donut
      id: "donutCenter",
      afterDraw(chart) {
        const { ctx, chartArea: { top, bottom, left, right } } = chart;
        const cx = (left + right) / 2;
        const cy = (top + bottom) / 2;
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#1C2B1A";
        ctx.font = "bold 22px Syne";
        ctx.fillText(total, cx, cy - 8);
        ctx.font = "11px DM Sans";
        ctx.fillStyle = "#6B7E68";
        ctx.fillText("animaux", cx, cy + 12);
        ctx.restore();
      }
    }]
  });

  // Légende custom
  const legendEl = document.getElementById("donut-legend");
  legendEl.innerHTML = "";
  DONNEES_RACES.forEach(r => {
    const pct = Math.round(r.nb / total * 100);
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `
      <div class="legend-left">
        <div class="legend-dot" style="background:${r.couleur}"></div>
        <span style="color:var(--text-primary)">${r.race}</span>
      </div>
      <span class="legend-val">${r.nb} <span style="font-weight:400;color:var(--text-secondary)">(${pct}%)</span></span>
    `;
    legendEl.appendChild(item);
  });
}

// =====================
//  INIT
// =====================
creerChartGMQ("7j");
creerChartRaces();
