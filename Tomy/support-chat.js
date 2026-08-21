/*
 * support-chat.js
 * ----------------
 * Floating "Ask Tomi" support chat, same self-injecting pattern as cart.js —
 * just include this script anywhere cart.js is included. Talks to the
 * admin-backend's /api/chat endpoint, which is grounded in the live product
 * catalog (see admin-backend/server.py). No product data is hardcoded here.
 *
 * Conversation history is kept in sessionStorage so a page refresh doesn't
 * lose it mid-chat, but a new tab/session starts fresh.
 */
(function () {
    const CHAT_API_URL = "https://tomy-k4ad.onrender.com/api/chat";
    const HISTORY_KEY = "tomiChatHistory";
    const MAX_STORED_TURNS = 24;

    const SUGGESTIONS = [
        "What are your store hours?",
        "Is this in stock?",
        "Where are your locations?"
    ];

    let history = readHistory();
    let sending = false;

    function readHistory() {
        try {
            const raw = sessionStorage.getItem(HISTORY_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function saveHistory() {
        try {
            sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_STORED_TURNS)));
        } catch (e) {
            // storage unavailable (private browsing, quota, etc.) — chat still works, just won't persist
        }
    }

    function escapeHTML(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    /* ---------- UI ---------- */

    function buildUI() {
        const fab = document.createElement("button");
        fab.id = "tomiChatFab";
        fab.type = "button";
        fab.setAttribute("aria-label", "Chat with Tomi Fashion support");
        fab.innerHTML = "&#128172;"; // speech balloon
        document.body.appendChild(fab);

        const overlay = document.createElement("div");
        overlay.id = "tomiChatOverlay";
        overlay.className = "tomi-overlay";
        document.body.appendChild(overlay);

        const panel = document.createElement("aside");
        panel.id = "tomiChatPanel";
        panel.className = "tomi-drawer tomi-drawer-right";
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-modal", "true");
        panel.setAttribute("aria-label", "Customer support chat");
        panel.innerHTML =
            '<div class="tomi-cart-head"><h3>Ask Tomi</h3><button type="button" id="tomiChatClose" aria-label="Close chat">&times;</button></div>' +
            '<div id="tomiChatMessages" class="tomi-chat-messages" role="log" aria-live="polite"></div>' +
            '<div id="tomiChatSuggestions" class="tomi-chat-suggestions"></div>' +
            '<form id="tomiChatForm" class="tomi-chat-form">' +
                '<input type="text" id="tomiChatInput" placeholder="Ask about sizing, stock, hours\u2026" autocomplete="off" maxlength="500">' +
                '<button type="submit" id="tomiChatSend" aria-label="Send message">&#10148;</button>' +
            '</form>';
        document.body.appendChild(panel);

        fab.addEventListener("click", toggleChat);
        overlay.addEventListener("click", closeChat);
        document.getElementById("tomiChatClose").addEventListener("click", closeChat);
        document.getElementById("tomiChatForm").addEventListener("submit", function (e) {
            e.preventDefault();
            const input = document.getElementById("tomiChatInput");
            const text = input.value.trim();
            if (!text || sending) return;
            input.value = "";
            sendMessage(text);
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeChat();
        });

        renderMessages();
        renderSuggestions();
    }

    function syncPanelBodyClass() {
        const anyOpen = ["tomiCartDrawer", "tomiWishDrawer", "tomiChatPanel"].some(function (id) {
            const el = document.getElementById(id);
            return el && el.classList.contains("open");
        });
        document.body.classList.toggle("tomi-panel-open", anyOpen);
    }

    function openChat() {
        const panel = document.getElementById("tomiChatPanel");
        const overlay = document.getElementById("tomiChatOverlay");
        if (!panel || !overlay) return;
        panel.classList.add("open");
        overlay.classList.add("open");

        // Cart/wishlist drawers live in the same right-hand slot — close them
        // so two panels can't stack on top of each other.
        ["tomiCartDrawer", "tomiWishDrawer", "tomiCartOverlay", "tomiWishOverlay"].forEach(function (id) {
            const el = document.getElementById(id);
            if (el) el.classList.remove("open");
        });
        syncPanelBodyClass();

        if (history.length === 0) greet();
        setTimeout(function () {
            const input = document.getElementById("tomiChatInput");
            if (input) input.focus();
        }, 150);
    }

    function closeChat() {
        const panel = document.getElementById("tomiChatPanel");
        const overlay = document.getElementById("tomiChatOverlay");
        if (panel) panel.classList.remove("open");
        if (overlay) overlay.classList.remove("open");
        syncPanelBodyClass();
    }

    function toggleChat() {
        const panel = document.getElementById("tomiChatPanel");
        if (panel && panel.classList.contains("open")) closeChat();
        else openChat();
    }

    function greet() {
        appendMessage("model", "Hey! I can help with sizing, stock, store hours, or anything else about Tomi Fashion. What can I help you find?");
    }

    function appendMessage(role, text) {
        history.push({ role: role, text: text });
        saveHistory();
        renderMessages();
    }

    function renderMessages() {
        const wrap = document.getElementById("tomiChatMessages");
        if (!wrap) return;
        wrap.innerHTML = history.map(function (m) {
            const cls = m.role === "user" ? "user" : "assistant";
            return '<div class="tomi-chat-msg ' + cls + '">' + escapeHTML(m.text) + "</div>";
        }).join("");
        wrap.scrollTop = wrap.scrollHeight;
    }

    function renderSuggestions() {
        const wrap = document.getElementById("tomiChatSuggestions");
        if (!wrap) return;
        if (history.length > 0) {
            wrap.style.display = "none";
            wrap.innerHTML = "";
            return;
        }
        wrap.style.display = "flex";
        wrap.innerHTML = SUGGESTIONS.map(function (s) {
            return '<button type="button" class="tomi-chat-chip">' + escapeHTML(s) + "</button>";
        }).join("");
        wrap.querySelectorAll(".tomi-chat-chip").forEach(function (chip) {
            chip.addEventListener("click", function () { sendMessage(chip.textContent); });
        });
    }

    function setTyping(show) {
        const wrap = document.getElementById("tomiChatMessages");
        if (!wrap) return;
        let typing = document.getElementById("tomiChatTyping");
        if (show) {
            if (!typing) {
                typing = document.createElement("div");
                typing.id = "tomiChatTyping";
                typing.className = "tomi-chat-msg assistant typing";
                typing.innerHTML = "<span></span><span></span><span></span>";
                wrap.appendChild(typing);
            }
            wrap.scrollTop = wrap.scrollHeight;
        } else if (typing) {
            typing.remove();
        }
    }

    /* ---------- networking ---------- */

    function sendMessage(text) {
        if (sending || !text) return;
        sending = true;

        const sendBtn = document.getElementById("tomiChatSend");
        if (sendBtn) sendBtn.disabled = true;

        const suggestions = document.getElementById("tomiChatSuggestions");
        if (suggestions) { suggestions.style.display = "none"; }

        const priorTurns = history.slice(); // everything before this message
        appendMessage("user", text);
        setTyping(true);

        fetch(CHAT_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, history: priorTurns })
        })
            .then(function (res) {
                return res.json().catch(function () { return {}; }).then(function (data) {
                    return { ok: res.ok, data: data };
                });
            })
            .then(function (result) {
                setTyping(false);
                if (!result.ok || !result.data || !result.data.reply) {
                    const errText = (result.data && result.data.error) ||
                        "Sorry, I couldn't get an answer just now \u2014 try again in a moment, or message us on WhatsApp.";
                    appendMessage("model", errText);
                } else {
                    appendMessage("model", result.data.reply);
                }
            })
            .catch(function () {
                setTyping(false);
                appendMessage("model", "I'm having trouble connecting right now \u2014 please try again, or reach us on WhatsApp.");
            })
            .finally(function () {
                sending = false;
                if (sendBtn) sendBtn.disabled = false;
            });
    }

    /* ---------- init ---------- */

    function init() {
        if (document.getElementById("tomiChatFab")) return; // already injected
        buildUI();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
