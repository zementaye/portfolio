# Tomi Fashion — Admin Backend

A tiny Flask API that stores the product catalog in MongoDB Atlas (free)
and powers both the admin page (`../admin.html`) and the storefront pages,
which now load products from this API instead of having them hardcoded
in HTML.

## 1. Create a free MongoDB Atlas database

1. Go to https://www.mongodb.com/cloud/atlas/register and sign up (free).
2. Create a free "M0" cluster (any provider/region is fine).
3. Under **Database Access**, add a database user with a username/password.
4. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) —
   simplest option for a free hobby project.
5. Click **Connect → Drivers**, copy the connection string. It looks like:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/`
6. Replace `<user>` and `<password>` with the database user you created.

That connection string is your `MONGODB_URI`.

## 2. Configure environment variables

This app reads these from the environment (never hardcode them in code):

| Variable          | Example                                   | Notes                              |
|--------------------|--------------------------------------------|-------------------------------------|
| `MONGODB_URI`      | `mongodb+srv://user:pass@cluster0...`     | From step 1                         |
| `MONGODB_DB_NAME`  | `tomy_fashion`                            | Optional, defaults to `tomy_fashion`|
| `ADMIN_PASSWORD`   | pick something strong                     | Password for the admin page login   |
| `SECRET_KEY`       | any long random string                    | Signs admin session tokens          |
| `FRONTEND_ORIGIN`  | `https://yourname.github.io`              | Optional, restricts CORS. Defaults to `*` |

## 3. Run locally (to test before deploying)

```bash
cd Tomy/admin-backend
pip install -r requirements.txt
export MONGODB_URI="your connection string"
export ADMIN_PASSWORD="pick-something-strong"
export SECRET_KEY="any-long-random-string"
python server.py
```

Then seed the catalog once (loads the existing product list into the DB):

```bash
python seed_data.py
```

Visit `http://localhost:5000/api/health` — you should see `"db_connected": true`.

## 4. Deploy for free on Render

1. Push this repo to GitHub (if it isn't already).
2. Go to https://render.com → **New → Web Service** → connect your repo.
3. Set:
   - **Root Directory**: `Tomy/admin-backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn server:app`
   - **Instance Type**: Free
4. Add the environment variables from step 2 in Render's **Environment** tab.
5. Deploy. Render gives you a URL like `https://tomi-admin-backend.onrender.com`.
6. Run `seed_data.py` once against your live `MONGODB_URI` (from your own
   machine — it just needs network access to Atlas, not to Render).

## 5. Point the site at your live API

Open `../products-api.js` and set:

```js
const API_BASE_URL = "https://tomi-admin-backend.onrender.com/api";
```

That's it — `tomy-fashion.html`, `pages/products.html`, and every category
page under `pages/` all pull from this one API, and so does `admin.html`.

## Notes

- Render's free tier spins down after inactivity, so the first request
  after a while can take ~30-50 seconds to wake up. That's normal.
- There's no image upload here — the admin page stores an image *path or
  URL* per product. You can point it at images already in `../Pictures/`,
  or a URL to an image hosted elsewhere.
- The admin login is a single shared password (`ADMIN_PASSWORD`), not
  per-user accounts — fine for a one-person site, not meant for a team.
