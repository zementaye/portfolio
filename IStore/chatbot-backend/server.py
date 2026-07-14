"""
iStore by Sophi — Chatbot Backend
----------------------------------
A tiny Flask server that answers customer questions about the store
using Google's Gemini API (free tier — no credit card needed to start).

Setup:
  1. Get a free API key: https://aistudio.google.com/app/apikey
  2. pip install flask flask-cors google-generativeai
  3. Set the key:   export GEMINI_API_KEY="your-key-here"
  4. Edit STORE_INFO and PRODUCTS below with your real details.
  5. Run:           python server.py
  6. Point the widget's data-api-url at wherever this runs (see README.md
     for how to deploy it for free on Render).
"""

import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai

# ---------------------------------------------------------------------------
# 1. CONFIGURE YOUR STORE — edit this section with real iStore by Sophi info
# ---------------------------------------------------------------------------

STORE_INFO = """
Store name: iStore by Sophi
Location: Bole Road, Near Edna Mall, Addis Ababa, Ethiopia
Phone: +251 911 234 567
WhatsApp: +251 911 234 567 (https://wa.me/251911234567)
Email: hello@istoresophi.com (replies within 24 hours)

Store hours:
  Monday: 9:00 AM – 8:00 PM
  Tuesday: 9:00 AM – 8:00 PM
  Wednesday: 9:00 AM – 8:00 PM
  Thursday: 9:00 AM – 8:00 PM
  Friday: 9:00 AM – 9:00 PM
  Saturday: 9:00 AM – 9:00 PM
  Sunday: 10:00 AM – 7:00 PM

Social media:
  Instagram: instagram.com/istoresophi
  Telegram: t.me/istoresophi
  TikTok: tiktok.com/@istoresophi
  Facebook: facebook.com/istoresophi

Payment: Cash (ETB), bank transfer, mobile money
Delivery: [add delivery info here, e.g. "Free delivery within Addis Ababa, 1-2 days"]
Returns: [add your return policy here]
"""

# Pulled directly from products.html — update this whenever your catalog or prices change.
PRODUCTS = [
    # iPhone
    {"name": "iPhone 17 Pro Max", "price_etb": "99,000", "notes": "128GB / 256GB / 512GB"},
    {"name": "iPhone 17", "price_etb": "99,000", "notes": "128GB / 256GB / 512GB"},
    {"name": "iPhone 16 Pro Max", "price_etb": "99,000", "notes": "128GB / 256GB / 512GB"},
    {"name": "iPhone 16 Pro", "price_etb": "99,000", "notes": "128GB / 256GB / 512GB"},
    {"name": "iPhone 16", "price_etb": "89,000", "notes": "128GB / 256GB"},
    {"name": "iPhone 16 Plus", "price_etb": "95,000", "notes": "128GB / 256GB"},
    {"name": "iPhone 15 Pro Max", "price_etb": "88,000", "notes": "128GB / 256GB"},
    {"name": "iPhone 15 Plus", "price_etb": "72,000", "notes": "128GB / 256GB"},
    {"name": "iPhone 15 Pro", "price_etb": "88,000", "notes": "128GB / 256GB"},
    {"name": "iPhone 15", "price_etb": "88,000", "notes": "128GB / 256GB"},
    {"name": "iPhone 14 Pro Max", "price_etb": "88,000", "notes": "128GB / 256GB"},
    {"name": "iPhone 14 Plus", "price_etb": "72,000", "notes": "128GB / 256GB"},
    {"name": "iPhone 14 Pro", "price_etb": "88,000", "notes": "128GB / 256GB"},
    {"name": "iPhone 14", "price_etb": "88,000", "notes": "128GB / 256GB"},
    {"name": "iPhone 13 Pro Max", "price_etb": "88,000", "notes": "128GB / 256GB"},
    {"name": "iPhone 13 Plus", "price_etb": "72,000", "notes": "128GB / 256GB"},
    {"name": "iPhone 13 Pro", "price_etb": "88,000", "notes": "128GB / 256GB"},
    {"name": "iPhone 13", "price_etb": "88,000", "notes": "128GB / 256GB"},

    # Mac
    {"name": "MacBook Pro 14\"", "price_etb": "185,000", "notes": "M3 Pro, 18GB / 36GB RAM"},
    {"name": "MacBook Pro 16\"", "price_etb": "265,000", "notes": "M3 Max, 36GB / 128GB RAM"},
    {"name": "MacBook Air 13\"", "price_etb": "135,000", "notes": "M3, 8GB / 16GB RAM"},
    {"name": "MacBook Air 15\"", "price_etb": "155,000", "notes": "M3, 8GB / 16GB RAM"},
    {"name": "iMac 24\"", "price_etb": "178,000", "notes": "M3, 8GB / 24GB RAM"},
    {"name": "Mac Studio", "price_etb": "310,000", "notes": "M3 Max / Ultra"},
    {"name": "Mac Pro", "price_etb": "780,000", "notes": "M2 Ultra, up to 192GB memory"},

    # iPad
    {"name": "iPad Pro 13\"", "price_etb": "145,000", "notes": "M4, Wi-Fi / Wi-Fi + Cellular"},
    {"name": "iPad Pro 11\"", "price_etb": "115,000", "notes": "M4, Wi-Fi / Wi-Fi + Cellular"},
    {"name": "iPad Air 13\"", "price_etb": "88,000", "notes": "M2, Wi-Fi / Cellular"},
    {"name": "iPad Air 11\"", "price_etb": "72,000", "notes": "M2, Wi-Fi / Cellular"},
    {"name": "iPad (10th Gen)", "price_etb": "48,000", "notes": "A14, Wi-Fi / Cellular"},
    {"name": "iPad mini (7th Gen)", "price_etb": "62,000", "notes": "A17 Pro, Wi-Fi / Cellular"},

    # Apple Watch
    {"name": "Apple Watch Series 10", "price_etb": "42,000", "notes": "GPS / GPS + Cellular"},
    {"name": "Apple Watch Ultra 2", "price_etb": "88,000", "notes": "Titanium, GPS + Cellular"},
    {"name": "Apple Watch SE (2nd Gen)", "price_etb": "24,000", "notes": "GPS, Aluminium"},

    # Audio
    {"name": "AirPods Pro (2nd Gen)", "price_etb": "18,500", "notes": "USB-C / Lightning"},
    {"name": "AirPods (4th Gen)", "price_etb": "12,500", "notes": "ANC / Standard"},
    {"name": "AirPods Max", "price_etb": "54,000", "notes": "USB-C, 6 colours"},
    {"name": "HomePod (2nd Gen)", "price_etb": "38,000", "notes": "Midnight / White"},
    {"name": "HomePod mini", "price_etb": "14,000", "notes": "5 colours"},

    # Accessories
    {"name": "MagSafe Charger", "price_etb": "2,800", "notes": "1m / 2m cable"},
    {"name": "Magic Keyboard", "price_etb": "9,500", "notes": "Touch ID / Touch ID + Num Pad"},
    {"name": "Magic Mouse", "price_etb": "7,500", "notes": "Space Grey / Silver / Black"},
    {"name": "Apple Pencil Pro", "price_etb": "12,000", "notes": "Compatible: iPad Pro / Air M2+"},
    {"name": "Apple Pencil (USB-C)", "price_etb": "6,500", "notes": "Compatible: most iPads"},
]

SYSTEM_PROMPT = f"""You are the friendly AI shopping assistant for iStore by Sophi, an Apple
retail store. Answer customer questions ONLY using the store info and product
list below. Be warm, concise, and helpful — a few sentences per answer, not
paragraphs. Prices are in Ethiopian Birr (ETB).

If asked about something not in this list (a product we don't carry, or a
policy not listed), say you're not sure and suggest they contact the store
directly or visit in person. Never invent prices, stock, or policies.

STORE INFO:
{STORE_INFO}

PRODUCTS AND PRICES:
{json.dumps(PRODUCTS, indent=2)}
"""

# ---------------------------------------------------------------------------
# 2. SERVER — you shouldn't need to change anything below this line
# ---------------------------------------------------------------------------

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",  # fast + free-tier friendly
    system_instruction=SYSTEM_PROMPT,
)

app = Flask(__name__)
CORS(app)  # allow your website's domain to call this backend


@app.route("/api/chat", methods=["POST"])
def chat():
    body = request.get_json(force=True) or {}
    messages = body.get("messages", [])

    if not messages:
        return jsonify({"reply": "Hi! Ask me anything about our products or store hours."})

    # Convert the widget's message history into Gemini's chat format
    gemini_history = []
    for m in messages[:-1]:
        role = "user" if m.get("role") == "user" else "model"
        gemini_history.append({"role": role, "parts": [m.get("content", "")]})

    last_message = messages[-1].get("content", "")

    try:
        chat_session = model.start_chat(history=gemini_history)
        response = chat_session.send_message(last_message)
        reply = response.text
    except Exception as e:
        print("Error calling Gemini:", e)
        reply = "Sorry, I'm having trouble answering right now — please try again shortly."

    return jsonify({"reply": reply})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)