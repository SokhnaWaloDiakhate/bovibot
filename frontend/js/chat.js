const chatMessages = document.getElementById("chat-messages");
const chatInput    = document.getElementById("chat-input") || document.getElementById("chat-textarea");
const chatSend     = document.getElementById("chat-send") || document.getElementById("end-btn");

let conversationHistory = [];

function addMessage(text, role = "bot") {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  const avatar = role === "bot" ? "🤖" : "👤";
  let formattedText = text.replace(/\*/g, "•").replace(/\n/g, "<br>");
  div.innerHTML = `<div class="msg-avatar">${avatar}</div><div class="msg-bubble">${formattedText}</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  conversationHistory.push({ role: role === "bot" ? "assistant" : "user", content: text });
}

async function traiterMessage(texte) {
  if (!texte) return;
  addMessage(texte, "user");
  if (chatInput) chatInput.value = "";
  try {
    const payload = { message: texte, history: conversationHistory.slice(0, -1) };
    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data.response) {
      addMessage(data.response, "bot");
      if (data.results && data.results.length > 0) {
        afficherResultatsBovi(data.results);
      }
    }
  } catch (error) {
    addMessage("❌ Erreur de connexion au serveur.", "bot");
  }
}

function afficherResultatsBovi(data) {
    // Liste noire étendue pour ne garder que le biologique
    const blacklist = ["id", "race_id", "mere_id", "pere_id", "created_at", "updated_at", "is_active", "notes", "statut"];
    const keys = Object.keys(data[0]).filter(k => !blacklist.includes(k.toLowerCase()));

    const div = document.createElement("div");
    div.className = "msg bot";
    let html = `<div class="msg-avatar">🤖</div><div class="msg-bubble" style="width:100%; border:1px solid #4CAF82; background:#fff;">`;
    
    if (data.length <= 4) {
        html += `<ul style="list-style:none; padding:0; margin:0;">`;
        data.forEach(item => {
            html += `<li style="padding:10px; border-bottom:1px solid #eee; margin-bottom:5px;">`;
            keys.forEach(k => {
                html += `<div style="font-size:13px;"><strong style="color:var(--accent-green); text-transform:uppercase; font-size:10px;">${k.replace('_',' ')}:</strong> ${item[k] || "-"}</div>`;
            });
            html += `</li>`;
        });
        html += `</ul>`;
    } else {
        html += `<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:12px;">`;
        html += `<thead style="background:#f4f4f4;"><tr>` + keys.map(k => `<th style="padding:8px; border:1px solid #eee;">${k.replace('_',' ')}</th>`).join("") + `</tr></thead>`;
        html += `<tbody>` + data.slice(0, 10).map(row => {
            return `<tr>` + keys.map(k => `<td style="padding:8px; border:1px solid #eee;">${row[k] || "-"}</td>`).join("") + `</tr>`;
        }).join("") + `</tbody></table></div>`;
        if (data.length > 10) html += `<div style="padding:5px; font-size:10px; color:#999;">... et ${data.length - 10} autres</div>`;
    }
    
    html += `</div>`;
    div.innerHTML = html;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

if (chatSend) chatSend.onclick = () => traiterMessage(chatInput.value.trim());
if (chatInput) chatInput.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); traiterMessage(chatInput.value.trim()); } };
