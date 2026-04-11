// =============================================
//  chat.js — BoviBot (V3 avec Confirmation)
// =============================================

const chatMessages = document.getElementById("chat-messages");
const chatInput    = document.getElementById("chat-input");
const chatSend     = document.getElementById("chat-send");

// États en mémoire
let conversationHistory = [];
let currentPendingSql   = null;

// ---- Ajouter un message au UI et à l'historique ----
function addMessage(text, role = "bot") {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  const avatar = role === "bot" ? "🤖" : "👤";

  div.innerHTML = `
    <span class="msg-avatar">${avatar}</span>
    <div class="msg-bubble">${text}</div>`;

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // On ajoute à l'historique
  conversationHistory.push({ role: role === "bot" ? "assistant" : "user", content: text });
  if (conversationHistory.length > 10) conversationHistory.shift();
}

// ---- Indicateur de frappe ----
function showTyping() {
  const div = document.createElement("div");
  div.className = "msg bot";
  div.id = "typing-indicator";
  div.innerHTML = `<span class="msg-avatar">🤖</span><div class="msg-bubble" style="color:#aaa;font-style:italic">BoviBot réfléchit…</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

// ---- Traiter le message ----
async function traiterMessage(texte) {
  addMessage(texte, "user");
  chatInput.value = "";

  showTyping();

  try {
    const payload = { 
      message: texte, 
      history: conversationHistory.slice(0, -1)
    };
    
    // Si on a une requête en attente, on l'envoie pour confirmation
    if (currentPendingSql) {
        payload.pending_sql = currentPendingSql;
    }

    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    hideTyping();

    if (data.response) {
      addMessage(data.response, "bot");
      
      // On met à jour (ou on vide) la requête en attente
      currentPendingSql = data.pending_sql;

      // Si résultats SELECT
      if (data.results && data.results.length > 0) {
        genererTableau(data.results);
      }
    }

  } catch (error) {
    hideTyping();
    console.error("Erreur Chat:", error);
    addMessage("❌ Erreur de connexion.", "bot");
  }
}

// Fonction pour générer un tableau
function genererTableau(data) {
    if (!data || data.length === 0) return;
    const div = document.createElement("div");
    div.className = "msg bot";
    let tableHtml = `<div class="msg-bubble sql-table-container"><table><thead><tr>`;
    const keys = Object.keys(data[0]);
    keys.forEach(key => { tableHtml += `<th>${key}</th>`; });
    tableHtml += `</tr></thead><tbody>`;
    data.forEach(row => {
        tableHtml += `<tr>`;
        keys.forEach(key => { tableHtml += `<td>${row[key]}</td>`; });
        tableHtml += `</tr>`;
    });
    tableHtml += `</tbody></table></div>`;
    div.innerHTML = `<span class="msg-avatar">🤖</span>${tableHtml}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ---- Événements ----
chatSend.addEventListener("click", () => {
  const texte = chatInput.value.trim();
  if (texte) traiterMessage(texte);
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const texte = chatInput.value.trim();
    if (texte) traiterMessage(texte);
  }
});
