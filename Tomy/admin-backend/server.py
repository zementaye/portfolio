"""
Tomi Fashion — Admin Backend
-----------------------------
A small Flask API that lets the admin page manage the product catalog.
Products are stored in MongoDB Atlas (free tier) so edits persist and
show up on the live site immediately — no redeploying the frontend.

Setup:
  1. Create a free cluster at https://www.mongodb.com/cloud/atlas/register
     (see README.md in this folder for click-by-click steps).
  2. Grab your connection string and set it as the MONGODB_URI env var.
  3. Pick an admin password and set it as the ADMIN_PASSWORD env var.
  4. Set a random SECRET_KEY env var (any long random string).
  5. pip install -r requirements.txt
  6. Run locally:  python server.py
     Or deploy for free on Render (see README.md).
  7. Point Tomy/products-api.js's API_BASE_URL at wherever this runs.

All product-reading endpoints are public (the storefront needs them).
All product-writing endpoints require the admin token returned by /api/login.
"""

import os
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from flask import Flask, request, jsonify
from flask_cors import CORS
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from pymongo import MongoClient
from pymongo.errors import PyMongoError

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MONGODB_URI = os.environ.get("MONGODB_URI", "")
DB_NAME = os.environ.get("MONGODB_DB_NAME", "tomy_fashion")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "*")  # tighten in production
TOKEN_MAX_AGE_SECONDS = 60 * 60 * 12  # 12 hour admin session

if not MONGODB_URI:
    print("WARNING: MONGODB_URI is not set. Set it before going live.")
if not ADMIN_PASSWORD:
    print("WARNING: ADMIN_PASSWORD is not set. /api/login will reject everyone.")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": FRONTEND_ORIGIN}})

signer = URLSafeTimedSerializer(SECRET_KEY, salt="tomy-admin")

client = MongoClient(MONGODB_URI) if MONGODB_URI else None
db = client[DB_NAME] if client is not None else None
products_col = db["products"] if db is not None else None

VALID_CATEGORIES = {"hoodies", "shirts", "pants", "shoes", "tracksuits", "hats"}
VALID_TYPES = {"simple", "swatch", "slider"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def serialize(doc):
    """Turn a Mongo document into JSON-friendly plain dict."""
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


def require_admin():
    """Returns None if the request is authenticated, otherwise an error response."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return jsonify({"error": "Missing admin token"}), 401
    token = auth[len("Bearer "):]
    try:
        signer.loads(token, max_age=TOKEN_MAX_AGE_SECONDS)
    except SignatureExpired:
        return jsonify({"error": "Session expired, please log in again"}), 401
    except BadSignature:
        return jsonify({"error": "Invalid admin token"}), 401
    return None


def validate_product_payload(data, partial=False):
    """Basic validation. Returns (cleaned_dict, error_message)."""
    cleaned = {}

    if "name" in data or not partial:
        name = (data.get("name") or "").strip()
        if not name:
            return None, "Product name is required"
        cleaned["name"] = name

    if "category" in data or not partial:
        category = (data.get("category") or "").strip().lower()
        if category not in VALID_CATEGORIES:
            return None, f"Category must be one of: {', '.join(sorted(VALID_CATEGORIES))}"
        cleaned["category"] = category

    if "price" in data or not partial:
        try:
            price = float(data.get("price"))
            if price < 0:
                raise ValueError
        except (TypeError, ValueError):
            return None, "Price must be a positive number"
        cleaned["price"] = price

    if "oldPrice" in data:
        old_price = data.get("oldPrice")
        if old_price in ("", None):
            cleaned["oldPrice"] = None
        else:
            try:
                old_price = float(old_price)
                if old_price < 0:
                    raise ValueError
                cleaned["oldPrice"] = old_price
            except (TypeError, ValueError):
                return None, "Old price must be a positive number"

    if "featured" in data:
        cleaned["featured"] = bool(data.get("featured"))

    if "type" in data or not partial:
        p_type = (data.get("type") or "simple").strip().lower()
        if p_type not in VALID_TYPES:
            return None, f"Type must be one of: {', '.join(sorted(VALID_TYPES))}"
        cleaned["type"] = p_type

    if "images" in data or not partial:
        images = data.get("images") or []
        if not isinstance(images, list) or not images:
            return None, "At least one image is required"
        clean_images = []
        for img in images:
            url = (img.get("url") or "").strip() if isinstance(img, dict) else ""
            if not url:
                return None, "Every image needs a URL/path"
            clean_images.append({
                "url": url,
                "color": (img.get("color") or "").strip() or None,
            })
        cleaned["images"] = clean_images

    return cleaned, None


def db_ready():
    return products_col is not None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "db_connected": db_ready(),
        "time": datetime.now(timezone.utc).isoformat(),
    })


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    password = data.get("password", "")
    if not ADMIN_PASSWORD:
        return jsonify({"error": "Server has no ADMIN_PASSWORD configured"}), 500
    if password != ADMIN_PASSWORD:
        return jsonify({"error": "Incorrect password"}), 401
    token = signer.dumps({"role": "admin"})
    return jsonify({"token": token, "expiresInSeconds": TOKEN_MAX_AGE_SECONDS})


@app.route("/api/products", methods=["GET"])
def list_products():
    if not db_ready():
        return jsonify({"error": "Database not configured"}), 503

    query = {}
    category = request.args.get("category")
    if category:
        query["category"] = category.lower()
    if request.args.get("featured") == "true":
        query["featured"] = True

    try:
        docs = list(products_col.find(query).sort("_id", -1))
    except PyMongoError:
        return jsonify({"error": "Database error"}), 503

    return jsonify([serialize(d) for d in docs])


@app.route("/api/products/<product_id>", methods=["GET"])
def get_product(product_id):
    if not db_ready():
        return jsonify({"error": "Database not configured"}), 503
    try:
        doc = products_col.find_one({"_id": ObjectId(product_id)})
    except InvalidId:
        return jsonify({"error": "Invalid product id"}), 400
    if not doc:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(serialize(doc))


@app.route("/api/products", methods=["POST"])
def create_product():
    auth_error = require_admin()
    if auth_error:
        return auth_error
    if not db_ready():
        return jsonify({"error": "Database not configured"}), 503

    data = request.get_json(silent=True) or {}
    cleaned, err = validate_product_payload(data, partial=False)
    if err:
        return jsonify({"error": err}), 400

    cleaned.setdefault("oldPrice", None)
    cleaned.setdefault("featured", False)
    cleaned["createdAt"] = datetime.now(timezone.utc)

    result = products_col.insert_one(cleaned)
    doc = products_col.find_one({"_id": result.inserted_id})
    return jsonify(serialize(doc)), 201


@app.route("/api/products/<product_id>", methods=["PUT"])
def update_product(product_id):
    auth_error = require_admin()
    if auth_error:
        return auth_error
    if not db_ready():
        return jsonify({"error": "Database not configured"}), 503

    try:
        oid = ObjectId(product_id)
    except InvalidId:
        return jsonify({"error": "Invalid product id"}), 400

    data = request.get_json(silent=True) or {}
    cleaned, err = validate_product_payload(data, partial=True)
    if err:
        return jsonify({"error": err}), 400
    if not cleaned:
        return jsonify({"error": "No valid fields to update"}), 400

    cleaned["updatedAt"] = datetime.now(timezone.utc)
    result = products_col.update_one({"_id": oid}, {"$set": cleaned})
    if result.matched_count == 0:
        return jsonify({"error": "Product not found"}), 404

    doc = products_col.find_one({"_id": oid})
    return jsonify(serialize(doc))


@app.route("/api/products/<product_id>", methods=["DELETE"])
def delete_product(product_id):
    auth_error = require_admin()
    if auth_error:
        return auth_error
    if not db_ready():
        return jsonify({"error": "Database not configured"}), 503

    try:
        oid = ObjectId(product_id)
    except InvalidId:
        return jsonify({"error": "Invalid product id"}), 400

    result = products_col.delete_one({"_id": oid})
    if result.deleted_count == 0:
        return jsonify({"error": "Product not found"}), 404
    return jsonify({"deleted": True})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
