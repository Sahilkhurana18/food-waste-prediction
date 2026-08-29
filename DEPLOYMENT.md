# Deploying Harvest Loop

This deploys your existing `frontend/`, `backend/`, and `ml-service/`
folders exactly as they are — no restructuring needed. It uses:

- **Neon** — free, permanent PostgreSQL database
- **Render** — hosts all three services directly from their existing
  Dockerfiles, deployed straight from a GitHub repo

Both have free tiers suitable for a capstone demo. Total cost: $0.

**One thing to know upfront:** Render's free web services "sleep" after 15
minutes of no traffic, and take 30–60 seconds to wake up on the next
request. This is completely normal — it isn't broken. Before a live demo
or viva, open your backend and ML service URLs once a minute or two ahead
of time to wake them up, so they're warm when you actually present.

---

## 0. Push your project to GitHub

Render deploys from a Git repository, not a zip upload. If you haven't
already:

```bash
cd food-waste-prediction
git init
git add .
git commit -m "Initial commit"
```

Create a new repository on GitHub (via the website), then:

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

Your repo should now show `frontend/`, `backend/`, `ml-service/`, and
`docker-compose.yml` at the top level — this matters because each Render
service will point at one of these subfolders.

---

## 1. Create the database (Neon)

1. Go to [neon.tech](https://neon.tech) and sign up (free).
2. Create a new project — name it anything, e.g. `harvest-loop`.
3. Once created, go to the project dashboard and copy the **connection
   string** — it looks like:
   ```
   postgresql://<user>:<password>@<host>.neon.tech/<dbname>?sslmode=require
   ```
4. Keep this tab open — you'll paste this into the backend's environment
   variables in step 3.

---

## 2. Deploy the ML service (Render)

1. Go to [render.com](https://render.com) and sign up (free), connecting
   your GitHub account.
2. **New +** → **Web Service** → select your repo.
3. Configure:
   - **Root Directory**: `ml-service`
   - **Runtime**: Docker (Render auto-detects the `Dockerfile`)
   - **Instance Type**: Free
4. Deploy. This step trains the model as part of the Docker build (same
   as locally), so the first deploy takes a few minutes.
5. Once live, copy its URL — something like
   `https://harvest-loop-ml.onrender.com`. Test it by visiting
   `<that-url>/health` in a browser; you should see
   `{"status":"ok","model_loaded":true}`.

---

## 3. Deploy the backend (Render)

1. **New +** → **Web Service** → same repo.
2. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: Docker
   - **Instance Type**: Free
3. Add environment variables (Render's "Environment" tab):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string from step 1 |
   | `JWT_SECRET` | any long random string (e.g. generate one with `openssl rand -hex 32`) |
   | `ML_SERVICE_URL` | the ML service URL from step 2 |
   | `CORS_ORIGIN` | `http://localhost:3000` for now — you'll add the real frontend URL in step 5 |

   Don't set `PORT` — Render injects it automatically, and your code
   already reads `process.env.PORT` correctly.
4. Deploy. The container runs `prisma migrate deploy` automatically on
   startup (per your Dockerfile's `CMD`), so your database schema gets
   created on first boot — you don't need to run migrations manually.
5. Copy the backend's URL, e.g. `https://harvest-loop-backend.onrender.com`.
   Test `<that-url>/health` — expect `{"status":"ok"}`.

---

## 4. Deploy the frontend (Render)

1. **New +** → **Static Site** (not Web Service — the frontend doesn't
   need its own always-on server; a static site is faster and free with
   no sleep delay).
2. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. Add environment variables (these get baked into the build, so they
   must be set *before* the first deploy):

   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | the backend URL from step 3 |
   | `VITE_ML_SERVICE_URL` | the ML service URL from step 2 |
4. Deploy. Copy the resulting URL, e.g.
   `https://harvest-loop-frontend.onrender.com`.

---

## 5. Connect the frontend back to the backend (CORS)

Now that you know the real frontend URL, go back to the **backend**
service on Render → Environment → update `CORS_ORIGIN` to:

```
http://localhost:3000,https://harvest-loop-frontend.onrender.com
```

(comma-separated, no spaces needed but they're trimmed automatically if
present). This lets both your local dev environment and the live site
talk to the same backend. Save — Render redeploys automatically.

---

## 6. Test the live deployment

1. Visit your frontend URL.
2. Register a Restaurant, an NGO, and a Volunteer account (or an Admin
   account, same as locally).
3. Walk through the full donation lifecycle once, end to end, exactly
   like you tested locally.
4. Open two browser windows to confirm the real-time notifications still
   work over the live WebSocket connection.

If something doesn't connect, check the browser console first — a CORS
error there points straight at step 5; a "failed to fetch" with no CORS
message usually means a service is still asleep (wait ~60 seconds) or a
URL is mistyped in the environment variables.

---

## Notes and trade-offs

- **Cold starts**: free Render web services sleep after 15 minutes idle.
  Your static frontend never sleeps, but the backend and ML service will
  take a moment to wake up on the first request after a quiet period.
  This is worth mentioning proactively in your viva if a wake-up delay
  happens live — it's expected free-tier behavior, not a bug.
- **Database persistence**: Neon's free tier is permanent (unlike
  Render's own free Postgres, which expires after 90 days), so your data
  won't vanish before your submission deadline.
- **Scaling this later**: if you ever need always-on service (no sleep),
  Render's paid tier starts small; everything else about this setup
  stays the same.
- **Rotating secrets**: the `JWT_SECRET` you set on Render should be
  different from whatever you used locally — treat it as a real secret,
  not something to commit to Git.
