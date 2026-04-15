// =============================================
//  charts.js — BoviBot
//  Graphiques Chart.js : GMQ + Races
//  Connecté au backend FastAPI
// =============================================

const API_URL = ""; 

// =====================
//  GRAPHIQUE GMQ (ligne)
// =====================
let chartGMQ = null;

async function creerChartGMQ(periode) {
  try {
    const r = await fetch(`${API_URL}/api/stats/gmq_history`);
    const d = await r.json();
    
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
            tension: 0.4,
            fill: true,
          },
          {
            label: "Performance Max",
            data: d.meilleur,
            borderColor: "#F0A030",
            backgroundColor: "transparent",
            borderWidth: 2,
            tension: 0.4,
            borderDash: [5, 5],
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label} : ${ctx.parsed.y.toFixed(2)} kg/j`
            }
          }
        },
        scales: {
          y: { min: 0, max: 1.0 }
        }
      }
    });
  } catch (err) {
    console.error("Erreur gmq chart:", err);
  }
}

// =====================
//  GRAPHIQUE RACES (donut)
// =====================
async function creerChartRaces() {
  const ctx = document.getElementById("chart-races").getContext("2d");
  const colors = ["#4CAF82", "#F0A030", "#7B6CF6", "#E05C5C", "#A0A0A0"];

  try {
    const r = await fetch(`${API_URL}/api/stats/races`);
    const dataRaces = await r.json();
    
    const total = dataRaces.reduce((s, r) => s + r.nb, 0);

    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: dataRaces.map(r => r.race),
        datasets: [{
          data: dataRaces.map(r => r.nb),
          backgroundColor: colors.slice(0, dataRaces.length),
          borderWidth: 3,
          borderColor: "#fff"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: { display: false }
        }
      },
      plugins: [{
        id: "donutCenter",
        afterDraw(chart) {
          const { ctx, chartArea: { top, bottom, left, right } } = chart;
          const cx = (left + right) / 2;
          const cy = (top + bottom) / 2;
          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#1C2B1A";
          ctx.font = "bold 20px Syne";
          ctx.fillText(total, cx, cy - 8);
          ctx.font = "10px DM Sans";
          ctx.fillStyle = "#6B7E68";
          ctx.fillText("animaux", cx, cy + 12);
          ctx.restore();
        }
      }]
    });

    // Légende
    const legendEl = document.getElementById("donut-legend");
    legendEl.innerHTML = "";
    dataRaces.forEach((r, i) => {
      const pct = Math.round(r.nb / total * 100);
      const item = document.createElement("div");
      item.className = "legend-item";
      item.innerHTML = `
        <div class="legend-left">
          <div class="legend-dot" style="background:${colors[i]}"></div>
          <span>${r.race}</span>
        </div>
        <span class="legend-val">${r.nb} (${pct}%)</span>
      `;
      legendEl.appendChild(item);
    });

  } catch (err) {
    console.error("Erreur races chart:", err);
  }
}

// =====================
//  INIT
// =====================
function initCharts() {
  creerChartGMQ("7j");
  creerChartRaces();
}

window.addEventListener('load', initCharts);
