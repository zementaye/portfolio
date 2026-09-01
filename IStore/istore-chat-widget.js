/**
 * iStore by Sophi — AI Shopping Assistant Widget
 * -----------------------------------------------
 * Drop this one file into any page:
 *   <script src="istore-chat-widget.js" data-api-url="https://YOUR-BACKEND-URL/api/chat"></script>
 *
 * It renders a floating "Ask Sophi" button in the bottom-right corner.
 * Clicking it opens a chat panel styled to match the store's ink + signal-blue look.
 * Every message the visitor sends is POSTed to your backend (server.py),
 * which asks the AI model and returns a reply.
 *
 * No frameworks, no build step — just this script tag.
 */

(function () {
  const scriptTag = document.currentScript;
  const API_URL = scriptTag?.getAttribute("data-api-url") || "/api/chat";
  const STORE_NAME = scriptTag?.getAttribute("data-store-name") || "iStore by Sophi";

  // ---------- Styles ----------
  const style = document.createElement("style");
  style.textContent = `
    :root {
      --istore-ink: #14161C;
      --istore-ink-soft: #1E212B;
      --istore-accent: #3450E0;
      --istore-accent-light: #7288F0;
      --istore-paper: #F5F6F8;
      --istore-line: rgba(114, 136, 240, 0.28);
    }

    #istore-chat-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--istore-accent);
      color: #fff;
      border: none;
      padding: 14px 22px;
      font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(20,22,28,0.28);
      transition: transform 0.2s ease, background 0.2s ease;
    }
    #istore-chat-launcher:hover {
      transform: translateY(-2px);
      background: var(--istore-ink);
    }
    #istore-chat-launcher svg { width: 18px; height: 18px; flex-shrink: 0; }

    #istore-chat-panel {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      width: 360px;
      max-width: calc(100vw - 32px);
      height: 520px;
      max-height: calc(100vh - 48px);
      background: var(--istore-paper);
      border: 1px solid var(--istore-line);
      box-shadow: 0 20px 60px rgba(20,22,28,0.28);
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
    }
    #istore-chat-panel.open { display: flex; }

    #istore-chat-header {
      background: var(--istore-ink);
      padding: 16px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    #istore-chat-header .title {
      font-family: "Space Grotesk", sans-serif;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
    }
    #istore-chat-header .subtitle {
      color: rgba(245,246,248,0.6);
      font-size: 11px;
      margin-top: 2px;
    }
    #istore-chat-close {
      background: none;
      border: none;
      color: rgba(245,246,248,0.7);
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
    }
    #istore-chat-close:hover { color: #fff; }

    #istore-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: #fff;
    }
    .istore-msg {
      max-width: 82%;
      padding: 10px 13px;
      font-size: 13.5px;
      line-height: 1.45;
    }
    .istore-msg.bot {
      background: var(--istore-paper);
      color: var(--istore-ink);
      border: 1px solid #E6E9EE;
      align-self: flex-start;
    }
    .istore-msg.user {
      background: var(--istore-accent);
      color: #fff;
      align-self: flex-end;
      font-weight: 500;
    }
    .istore-msg.typing { opacity: 0.6; font-style: italic; }

    #istore-chat-input-row {
      border-top: 1px solid #E6E9EE;
      padding: 12px;
      display: flex;
      gap: 8px;
      background: var(--istore-paper);
    }
    #istore-chat-input {
      flex: 1;
      background: #fff;
      border: 1px solid #D9DCE4;
      padding: 10px 12px;
      color: var(--istore-ink);
      font-size: 13.5px;
      outline: none;
    }
    #istore-chat-input:focus { border-color: var(--istore-accent); }
    #istore-chat-send {
      background: var(--istore-ink);
      color: #fff;
      border: none;
      padding: 0 16px;
      font-weight: 500;
      cursor: pointer;
      font-size: 13px;
    }
    #istore-chat-send:hover { background: var(--istore-accent); }
    #istore-chat-send:disabled { opacity: 0.5; cursor: default; }
  `;
  document.head.appendChild(style);

  // ---------- Markup ----------
  const launcher = document.createElement("button");
  launcher.id = "istore-chat-launcher";
  launcher.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
    Ask Sophi
  `;

  const panel = document.createElement("div");
  panel.id = "istore-chat-panel";
  panel.innerHTML = `
    <div id="istore-chat-header">
      <div>
        <div class="title">${STORE_NAME}</div>
        <div class="subtitle">Ask about products, prices &amp; hours</div>
      </div>
      <button id="istore-chat-close" aria-label="Close chat">&times;</button>
    </div>
    <div id="istore-chat-messages"></div>
    <div id="istore-chat-input-row">
      <input id="istore-chat-input" type="text" placeholder="Ask about a product…" autocomplete="off" />
      <button id="istore-chat-send">Send</button>
    </div>
  `;

  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  // ---------- Behavior ----------
  const messagesEl = panel.querySelector("#istore-chat-messages");
  const inputEl = panel.querySelector("#istore-chat-input");
  const sendBtn = panel.querySelector("#istore-chat-send");
  const closeBtn = panel.querySelector("#istore-chat-close");

  let history = []; // { role: 'user' | 'assistant', content: string }
  let opened = false;

  function addMessage(role, text) {
    const div = document.createElement("div");
    div.className = `istore-msg ${role === "user" ? "user" : "bot"}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function openPanel() {
    panel.classList.add("open");
    if (!opened) {
      opened = true;
      addMessage("bot", `Hi! I'm the ${STORE_NAME} assistant. Ask me about our Apple products, pricing, or store hours.`);
    }
    inputEl.focus();
  }

  launcher.addEventListener("click", openPanel);
  closeBtn.addEventListener("click", () => panel.classList.remove("open"));

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = "";
    sendBtn.disabled = true;

    addMessage("user", text);
    history.push({ role: "user", content: text });

    const typingEl = addMessage("bot", "Typing…");
    typingEl.classList.add("typing");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      typingEl.remove();

      const reply = data.reply || "Sorry, I couldn't get a response just now — please try again.";
      addMessage("bot", reply);
      history.push({ role: "assistant", content: reply });
    } catch (err) {
      typingEl.remove();
      addMessage("bot", "Sorry, something went wrong reaching our assistant. Please try again in a moment.");
    } finally {
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });
})();
