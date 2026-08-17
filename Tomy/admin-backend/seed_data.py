"""
One-time import: loads the products that used to be hardcoded across
tomy-fashion.html / pages/products.html / pages/<category>.html into
MongoDB, so the admin page has something to start editing.

Usage:
    export MONGODB_URI="your connection string"
    python seed_data.py

Safe to re-run: it clears the "products" collection first, so running
it twice won't create duplicates. Don't run it again once you've
started editing real data in the admin page — it will wipe your edits.
"""

import os
from pymongo import MongoClient

MONGODB_URI = os.environ.get("MONGODB_URI", "")
DB_NAME = os.environ.get("MONGODB_DB_NAME", "tomy_fashion")

if not MONGODB_URI:
    raise SystemExit("Set MONGODB_URI before running this script.")


def img(url, color=None):
    return {"url": url, "color": color}


PRODUCTS = [
    # ---- Hoodies ----
    {"name": "Classic Black Hoodie", "category": "hoodies", "price": 4900,
     "oldPrice": None, "featured": True, "type": "simple",
     "images": [img("../Pictures/Hoodie/hoodie1.jpg")]},
    {"name": "Oversized Grey Hoodie", "category": "hoodies", "price": 5900,
     "oldPrice": None, "featured": False, "type": "simple",
     "images": [img("../Pictures/Hoodie/hoodie2.jpg")]},
    {"name": "Minimal White Hoodie", "category": "hoodies", "price": 5400,
     "oldPrice": None, "featured": False, "type": "simple",
     "images": [img("../Pictures/Hoodie/hoodie3.jpg")]},
    {"name": "Minimal Hoodie", "category": "hoodies", "price": 9900,
     "oldPrice": None, "featured": True, "type": "simple",
     "images": [img("../Pictures/Hoodie/hoodie1.jpg")]},

    # ---- Shirts ----
    {"name": "Polo Shirts", "category": "shirts", "price": 5000,
     "oldPrice": None, "featured": False, "type": "swatch",
     "images": [
         img("../Pictures/Shirts/s1.jpg", "linear-gradient(135deg, #4b2e2b 50%, #7a7d3a 50%)"),
         img("../Pictures/Shirts/s2.jpg", "linear-gradient(135deg, #aebbbe 50%, #000308 50%)"),
         img("../Pictures/Shirts/s3.jpg", "linear-gradient(135deg, #483235 50%, #fffdf6 50%)"),
         img("../Pictures/Shirts/s5.jpg", "#a0aab7"),
         img("../Pictures/Shirts/s6.jpg", "#98858c"),
     ]},
    {"name": "BLACK OFF", "category": "shirts", "price": 5000,
     "oldPrice": None, "featured": False, "type": "swatch",
     "images": [
         img("../Pictures/Shirts/s7.jpg", "#ffffff"),
         img("../Pictures/Shirts/s8.jpg", "#a6aaab"),
         img("../Pictures/Shirts/s9.jpg", "#000000"),
     ]},
    {"name": "USA Shirts", "category": "shirts", "price": 5000,
     "oldPrice": None, "featured": False, "type": "swatch",
     "images": [
         img("../Pictures/Shirts/s10.jpg", "#c49e85"),
         img("../Pictures/Shirts/s11.jpg", "#ffffff"),
         img("../Pictures/Shirts/s12.jpg", "#000000"),
     ]},
    {"name": "OFFBEAT", "category": "shirts", "price": 5000,
     "oldPrice": None, "featured": False, "type": "swatch",
     "images": [
         img("../Pictures/Shirts/s16.jpg", "#474d57"),
         img("../Pictures/Shirts/s17.jpg", "#ffffff"),
         img("../Pictures/Shirts/s18.jpg", "#000000"),
     ]},
    {"name": "OFFBEAT Shirt", "category": "shirts", "price": 2900,
     "oldPrice": None, "featured": True, "type": "swatch",
     "images": [
         img("../Pictures/Shirts/s13.jpg", "#474d57"),
         img("../Pictures/Shirts/s14.jpg", "#ffffff"),
         img("../Pictures/Shirts/s15.jpg", "#6ab2c0"),
     ]},
    {"name": "OFF-WHITE", "category": "shirts", "price": 5000,
     "oldPrice": None, "featured": False, "type": "swatch",
     "images": [
         img("../Pictures/Shirts/s19.jpg", "#b5c088"),
         img("../Pictures/Shirts/s20.jpg", "#ffffff"),
         img("../Pictures/Shirts/s21.jpg", "#b78f6a"),
     ]},

    # ---- Pants ----
    {"name": "Amiri & Purple Jeans", "category": "pants", "price": 5000,
     "oldPrice": None, "featured": False, "type": "simple",
     "images": [img("../Pictures/Pants/Pants1.jpg")]},
    {"name": "Baggy Jeans Collection 1", "category": "pants", "price": 5000,
     "oldPrice": None, "featured": False, "type": "swatch",
     "images": [
         img("../Pictures/Pants/pants2_7.jpg", "#3c4656"),
         img("../Pictures/Pants/pants2_8.jpg", "#a6aaab"),
         img("../Pictures/Pants/pants2_9.jpg", "#9b8478"),
         img("../Pictures/Pants/pants2_10.jpg", "#8caaae"),
         img("../Pictures/Pants/pants2_11.jpg", "#949f9d"),
         img("../Pictures/Pants/pants2_13.jpg", "#000000"),
     ]},
    {"name": "Baggy Jeans Collection 2", "category": "pants", "price": 5000,
     "oldPrice": None, "featured": False, "type": "swatch",
     "images": [
         img("../Pictures/Pants/pants2_1.jpg", "#a0aab7"),
         img("../Pictures/Pants/pants2_2.jpg", "#7b7174"),
         img("../Pictures/Pants/pants2_3.jpg", "#5a7590"),
         img("../Pictures/Pants/pants2_4.jpg", "#000000"),
         img("../Pictures/Pants/pants2_5.jpg", "#b0a89d"),
         img("../Pictures/Pants/pants2_6.jpg", "#b0a89d"),
     ]},
    {"name": "Ripped Baggy Jeans", "category": "pants", "price": 5000,
     "oldPrice": None, "featured": False, "type": "swatch",
     "images": [
         img("../Pictures/Pants/pants2_14.jpg", "#90aec4"),
         img("../Pictures/Pants/pants2_15.jpg", "#99a195"),
         img("../Pictures/Pants/pants2_16.jpg", "#2d2f35"),
         img("../Pictures/Pants/pants2_17.jpg", "#4c668b"),
         img("../Pictures/Pants/pants2_18.jpg", "#2d2f35"),
         img("../Pictures/Pants/pants2_19.jpg", "#212d2e"),
     ]},

    # ---- Shoes ----
    {"name": "Urban Sneakers", "category": "shoes", "price": 5900,
     "oldPrice": 7900, "featured": True, "type": "simple",
     "images": [img("../Pictures/Shoes/sh6.jpg")]},
    {"name": "Balenciaga Track Sneakers", "category": "shoes", "price": 13000,
     "oldPrice": None, "featured": False, "type": "slider",
     "images": [img("../Pictures/Shoes/sh1.jpg"), img("../Pictures/Shoes/sh2.jpg")]},
    {"name": "Classic Sneakers", "category": "shoes", "price": 15000,
     "oldPrice": None, "featured": False, "type": "slider",
     "images": [img("../Pictures/Shoes/sh3.jpg"), img("../Pictures/Shoes/sh4.jpg")]},
    {"name": "Dr. Martens", "category": "shoes", "price": 10000,
     "oldPrice": None, "featured": False, "type": "slider",
     "images": [img("../Pictures/Shoes/sh36.jpg"), img("../Pictures/Shoes/sh37.jpg")]},
    {"name": "Osiris D3", "category": "shoes", "price": 10000,
     "oldPrice": None, "featured": False, "type": "slider",
     "images": [img("../Pictures/Shoes/sh5.jpg"), img("../Pictures/Shoes/sh6.jpg"), img("../Pictures/Shoes/sh7.jpg")]},
    {"name": "New Asics", "category": "shoes", "price": 7000,
     "oldPrice": None, "featured": False, "type": "swatch",
     "images": [
         img("../Pictures/Shoes/sh8.jpg", "#ffffff"),
         img("../Pictures/Shoes/sh9.jpg", "#0f8cb5"),
         img("../Pictures/Shoes/sh10.jpg", "#e5dbdb"),
         img("../Pictures/Shoes/sh11.jpg", "#000000"),
         img("../Pictures/Shoes/sh12.jpg", "#000000"),
         img("../Pictures/Shoes/sh13.jpg", "#ffffff"),
     ]},
    {"name": "Jordan 4 Bricks", "category": "shoes", "price": 7000,
     "oldPrice": None, "featured": False, "type": "swatch",
     "images": [
         img("../Pictures/Shoes/sh14.jpg", "#2100dc"),
         img("../Pictures/Shoes/sh15.jpg", "#ff0000"),
     ]},
    {"name": "Jordan 4", "category": "shoes", "price": 7000,
     "oldPrice": None, "featured": False, "type": "swatch",
     "images": [
         img("../Pictures/Shoes/sh16.jpg", "#a9adaa"),
         img("../Pictures/Shoes/sh18.jpg", "#000000"),
         img("../Pictures/Shoes/sh17.jpg", "#232121"),
         img("../Pictures/Shoes/sh19.jpg", "#f2ff00"),
     ]},
    {"name": "Nike Air", "category": "shoes", "price": 6000,
     "oldPrice": None, "featured": False, "type": "swatch",
     "images": [
         img("../Pictures/Shoes/sh20.jpg", "#ffffff"),
         img("../Pictures/Shoes/sh21.jpg", "#d5d4df"),
         img("../Pictures/Shoes/sh22.jpg", "#000000"),
         img("../Pictures/Shoes/sh23.jpg", "#262823"),
     ]},
    {"name": "Nike AirForce", "category": "shoes", "price": 4000,
     "oldPrice": None, "featured": False, "type": "swatch",
     "images": [
         img("../Pictures/Shoes/sh26.jpg", "#ffffff"),
         img("../Pictures/Shoes/sh25.jpg", "#ff0000"),
     ]},
    {"name": "Jordan 4's", "category": "shoes", "price": 7000,
     "oldPrice": None, "featured": False, "type": "swatch",
     "images": [
         img("../Pictures/Shoes/sh27.jpg", "#009b2f"),
         img("../Pictures/Shoes/sh28.jpg", "#ff0000"),
         img("../Pictures/Shoes/sh29.jpg", "#ffffff"),
         img("../Pictures/Shoes/sh30.jpg", "#000000"),
     ]},
    {"name": "Vans", "category": "shoes", "price": 5000,
     "oldPrice": None, "featured": False, "type": "swatch",
     "images": [
         img("../Pictures/Shoes/sh31.jpg", "#ffffff"),
         img("../Pictures/Shoes/sh32.jpg", "#ffffff"),
         img("../Pictures/Shoes/sh35.jpg", "#119ca9"),
         img("../Pictures/Shoes/sh34.jpg", "#d2d4ca"),
     ]},

    # ---- Tracksuits ----
    {"name": "Hellstar Tracksuit — Red", "category": "tracksuits", "price": 5000,
     "oldPrice": None, "featured": False, "type": "swatch",
     "images": [
         img("../Pictures/Track/track1.jpg", "#c65143"),
         img("../Pictures/Track/track2.jpg", "#000000"),
     ]},
    {"name": "Hellstar Tracksuit — Black", "category": "tracksuits", "price": 5000,
     "oldPrice": None, "featured": False, "type": "swatch",
     "images": [img("../Pictures/Track/track3.jpg", "#000000")]},
    {"name": "Red Leather Spiderweb Set", "category": "tracksuits", "price": 5000,
     "oldPrice": None, "featured": False, "type": "swatch",
     "images": [
         img("../Pictures/Track/track4.jpg", "#c65143"),
         img("../Pictures/Track/track5.jpg", "#000000"),
     ]},

    # ---- Hats ----
    {"name": "Winter Hats", "category": "hats", "price": 500,
     "oldPrice": None, "featured": False, "type": "simple",
     "images": [img("../Pictures/Hats/hat1.jpg")]},
    {"name": "Fashion Hats", "category": "hats", "price": 500,
     "oldPrice": None, "featured": False, "type": "simple",
     "images": [img("../Pictures/Hats/hat2.jpg")]},
    {"name": "Sweater Hats", "category": "hats", "price": 300,
     "oldPrice": None, "featured": False, "type": "simple",
     "images": [img("../Pictures/Hats/hat3.jpg")]},
    {"name": "Sweater Hats (Grey)", "category": "hats", "price": 300,
     "oldPrice": None, "featured": False, "type": "simple",
     "images": [img("../Pictures/Hats/hat4.jpg")]},
]


def main():
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    col = db["products"]

    col.delete_many({})
    result = col.insert_many(PRODUCTS)
    print(f"Inserted {len(result.inserted_ids)} products into '{DB_NAME}.products'.")


if __name__ == "__main__":
    main()
