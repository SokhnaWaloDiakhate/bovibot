// =============================================
//  chat.js — BoviBot
//  Chat IA (mock en Semaine 1, vrai LLM en Semaine 2)
// =============================================

const chatMessages = document.getElementById("chat-messages");
const chatInput    = document.getElementById("chat-input");
const chatSend     = document.getElementById("chat-send");

// ---- Réponses mock (simulées) ----
// En Semaine 2, ces appels iront vers : POST http://localhost:8002/chat
const MOCK_RESPONSES = [
  { pattern: /gmq/i,        reply: "📊 2 animaux ont un GMQ inférieur à 0.3 kg/jour : TAG-007 (0.25 kg/j) et TAG-006 (0.18 kg/j). Je recommande une vérification sanitaire." },
  { pattern: /pesee|pesée|poids/i, reply: "⚖️ Pour enregistrer une pesée, dites par exemple : « Enregistre 320 kg pour TAG-001 aujourd'hui »." },
  { pattern: /vente|vend/i, reply: "💰 Pour déclarer une vente : « Déclare la vente de TAG-005 à Mamadou Sow pour 250 000 FCFA »." },
  { pattern: /velage|vêlage|naissance/i, reply: "🍼 3 vêlages sont prévus dans les 7 prochains jours : TAG-003 (dans 4j), TAG-008 (dans 6j), TAG-015 (dans 7j)." },
  { pattern: /alerte/i,    reply: "🔔 5 alertes actives en ce moment : 2 critiques (poids faible), 2 vaccins dépassés, 1 vêlage imminent." },
  { pattern: /animaux? actif/i, reply: "🐄 24 animaux actifs dans le troupeau. Races : 12 Zébu Gobra, 8 Ndama, 4 Métis." },
];

// ---- Réponse par défaut ----
const DEFAULT_REPLY = "🤔 Je n'ai pas compris votre question. Essayez : « Liste les animaux actifs », « GMQ inférieur à 0.3 », ou « vêlages prévus ».";

// ---- Détection action (pesée/vente) ----
const ACTION_PATTERNS = [
  {
    pattern: /enregistr.{1,10}(\d+)\s*kg.{1,20}(TAG-\d+)/i,
    confirm: (m) => `Confirmer la pesée : ${m[2]} = ${m[1]} kg le ${today()} ? (Oui / Non)`
  },
  {
    pattern: /(TAG-\d+).{1,10}(\d+)\s*kg/i,
    confirm: (m) => `Confirmer la pesée : ${m[1]} = ${m[2]} kg le ${today()} ? (Oui / Non)`
  },
  {
    pattern: /vente.{1,15}(TAG-\d+)/i,
    confirm: (m) => `Confirmer la vente de ${m[1]} ? Précisez l'acheteur et le prix si pas encore fait.`
  }
];

function today() {
  return new Date().toLocaleDateString("fr-FR");
}

// ---- Ajouter un message ----
function addMessage(text, role = "bot", isConfirm = false) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;

  const avatar = role === "bot" ? "🤖" : "👤";

  if (isConfirm) {
    div.innerHTML = `
      <span class="msg-avatar">${avatar}</span>
      <div class="msg-bubble">
        <div class="msg-confirm">
          <span>${text}</span>
          <div class="confirm-btns">
            <button class="btn-oui" onclick="confirmerAction(this)">✅ Oui</button>
            <button class="btn-non" onclick="annulerAction(this)">❌ Non</button>
          </div>
        </div>
      </div>`;
  } else {
    div.innerHTML = `
      <span class="msg-avatar">${avatar}</span>
      <div class="msg-bubble">${text}</div>`;
  }

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
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
let pendingAction = null;

async function traiterMessage(texte) {
  addMessage(texte, "user");
  chatInput.value = "";

  showTyping();
  await delay(900);
  hideTyping();

  // Vérifier si c'est une action (pesée / vente)
  for (const a of ACTION_PATTERNS) {
    const m = texte.match(a.pattern);
    if (m) {
      pendingAction = { texte, match: m };
      addMessage(a.confirm(m), "bot", true);
      return;
    }
  }

  // Sinon : mode consultation (mock)
  const found = MOCK_RESPONSES.find(r => r.pattern.test(texte));
  addMessage(found ? found.reply : DEFAULT_REPLY, "bot");
}

function confirmerAction(btn) {
  btn.closest(".confirm-btns").remove();
  addMessage("✅ Action confirmée ! (En Semaine 2, j'appellerai la procédure stockée via FastAPI.)", "bot");
  pendingAction = null;
}

function annulerAction(btn) {
  btn.closest(".confirm-btns").remove();
  addMessage("❌ Action annulée. Aucune modification effectuée.", "bot");
  pendingAction = null;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

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
