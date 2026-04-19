const chatMessages = document.getElementById("chat-messages");
const chatInput    = document.getElementById("chat-input");
const chatSend     = document.getElementById("chat-send");
const btnConv      = document.getElementById("btn-conv");
const btnAction    = document.getElementById("btn-action");
const actionPanel  = document.getElementById("action-panel");
const chatMain     = document.getElementById("chat-main");
const confirmOverlay = document.getElementById("confirm-overlay");

let conversationHistory = [];
let pendingSql = null;
let isTyping = false;

function showTyping() {
    if (isTyping) return;
    isTyping = true;
    const div = document.createElement("div");
    div.className = "msg bot typing-msg";
    div.id = "typing-indicator";
    div.innerHTML = `
        <div class="msg-avatar">🤖</div>
        <div class="msg-bubble" style="display:flex; align-items:center; gap:5px; padding: 12px 20px;">
            <span class="dot-typing"></span>
            <span class="dot-typing" style="animation-delay: 0.2s"></span>
            <span class="dot-typing" style="animation-delay: 0.4s"></span>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
    const indicator = document.getElementById("typing-indicator");
    if (indicator) indicator.remove();
    isTyping = false;
}

// --- MODE SWITCHING ---
btnConv.onclick = () => {
    btnConv.classList.add("active");
    btnAction.classList.remove("active");
    actionPanel.classList.remove("active");
};

btnAction.onclick = () => {
    btnAction.classList.add("active");
    btnConv.classList.remove("active");
    actionPanel.classList.add("active");
};

// --- ACTION HANDLING ---
window.startAction = (type) => {
    // Switch back to conversation mode to see the bot's guidance
    btnConv.click();
    
    let prompt = "";
    switch(type) {
        case 'vendre': prompt = "Je souhaite vendre un animal. Peux-tu m'aider ?"; break;
        case 'peser': prompt = "Je veux enregistrer la pesée d'un animal."; break;
        case 'gestation': prompt = "Je veux déclarer une nouvelle gestation."; break;
        case 'soins': prompt = "Je veux enregistrer un acte de soin vétérinaire."; break;
        case 'naissance': prompt = "Déclarer une nouvelle naissance (veau)."; break;
        case 'alerte': prompt = "Je veux signaler un problème de santé ou une alerte."; break;
    }
    
    if (prompt) {
        chatInput.value = prompt;
        traiterMessage(prompt);
    }
};

// --- CORE CHAT LOGIC ---
function addMessage(text, role = "bot") {
    const div = document.createElement("div");
    div.className = `msg ${role}`;
    
    const avatar = role === "bot" ? "🤖" : "👤";
    let formattedText = text.replace(/\*/g, "•").replace(/\n/g, "<br>");
    
    // Check if it's a "Wait for confirmation" message
    if (text.includes("⚠️ ACTION EN ATTENTE")) {
        confirmOverlay.style.display = "flex";
    } else {
        confirmOverlay.style.display = "none";
    }

    div.innerHTML = `
        <div class="msg-avatar">${avatar}</div>
        <div class="msg-bubble">${formattedText}</div>
    `;
    
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    conversationHistory.push({ role: role === "bot" ? "assistant" : "user", content: text });
}

async function traiterMessage(texte) {
    if (!texte || isTyping) return;
    
    addMessage(texte, "user");
    chatInput.value = "";
    chatInput.style.height = 'auto'; // Reset height

    showTyping();

    try {
        const payload = { 
            message: texte, 
            history: conversationHistory.slice(0, -1),
            pending_sql: pendingSql 
        };
        
        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        hideTyping();
        
        if (data.response) {
            pendingSql = data.pending_sql || null;
            addMessage(data.response, "bot");
            
            if (data.results && data.results.length > 0) {
                afficherResultatsBovi(data.results);
            }
        }
    } catch (error) {
        hideTyping();
        console.error(error);
        addMessage("❌ Erreur de connexion au serveur. Vérifiez que le backend est lancé.", "bot");
    }
}

window.confirmAction = (choice) => {
    confirmOverlay.style.display = "none";
    const msg = choice ? "OUI, je confirme." : "NON, annule tout.";
    traiterMessage(msg);
};

function afficherResultatsBovi(data) {
    const blacklist = ["id", "race_id", "mere_id", "pere_id", "created_at", "updated_at", "is_active", "notes", "statut"];
    const keys = Object.keys(data[0]).filter(k => !blacklist.includes(k.toLowerCase()));

    const div = document.createElement("div");
    div.className = "msg bot";
    
    let html = `
        <div class="msg-avatar">🤖</div>
        <div class="msg-bubble" style="width:100%; border:1px solid #4CAF82; border-radius:15px; background:#fff; padding:15px;">
            <div style="font-weight:700; color:var(--accent-green); margin-bottom:10px; font-size:12px; text-transform:uppercase;">Résultats de la recherche</div>
    `;
    
    if (data.length <= 4) {
        html += `<ul style="list-style:none; padding:0; margin:0;">`;
        data.forEach(item => {
            html += `<li style="padding:12px; border-bottom:1px solid #f1f5f9; margin-bottom:5px;">`;
            keys.forEach(k => {
                html += `<div style="font-size:13px; margin-bottom:2px;"><strong style="color:#64748b; font-size:10px; text-transform:uppercase; margin-right:5px;">${k.replace(/_/g,' ')}:</strong> <span style="font-weight:500;">${item[k] || "-"}</span></div>`;
            });
            html += `</li>`;
        });
        html += `</ul>`;
    } else {
        html += `
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; font-size:12px; min-width:300px;">
                    <thead style="background:#f8fafc;">
                        <tr>${keys.map(k => `<th style="padding:10px; border:1px solid #e2e8f0; text-align:left; color:#64748b;">${k.replace(/_/g,' ')}</th>`).join("")}</tr>
                    </thead>
                    <tbody>
                        ${data.slice(0, 10).map(row => `
                            <tr>${keys.map(k => `<td style="padding:10px; border:1px solid #e2e8f0;">${row[k] || "-"}</td>`).join("")}</tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
            ${data.length > 10 ? `<div style="padding:5px; font-size:11px; color:#94a3b8; text-align:center;">+ ${data.length - 10} autres résultats</div>` : ""}
        `;
    }
    
    html += `</div>`;
    div.innerHTML = html;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- INITIALIZATION ---
if (chatSend) chatSend.onclick = () => traiterMessage(chatInput.value.trim());

if (chatInput) {
    chatInput.onkeydown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            traiterMessage(chatInput.value.trim());
        }
    };
    
    // Auto-resize
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.scrollHeight > 120) this.style.overflowY = 'auto';
        else this.style.overflowY = 'hidden';
    });
}
