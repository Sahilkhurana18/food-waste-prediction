# Harvest Loop

Frontend for the AI-powered food waste prediction, redistribution and
impact optimization capstone. Built with React + Vite + Tailwind CSS +
React Router. Includes all four role dashboards from the project plan,
sharing one design system and one mock data layer.

- **Restaurant** (`/restaurant`) — demand forecast, a what-if simulator,
  and a surplus/donation ticket rail
- **NGO** (`/ngo`) — available donations to accept, your open requests,
  incoming deliveries
- **Volunteer** (`/volunteer`) — assigned pickup with a pickup → delivered
  stepper, available pickups to claim, delivery history
- **Admin** (`/admin`) — platform-wide impact metrics, a meals-redistributed
  trend chart, the ML model comparison (Linear Regression vs Random Forest
  vs XGBoost), and restaurant/NGO leaderboards

Use the role switcher at the top of the sidebar to jump between them.

## Project structure

```
harvest-loop-frontend/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── .dockerignore
├── .gitignore
└── src/
    ├── main.jsx              # React Router setup
    ├── App.jsx                # route table
    ├── index.css              # Tailwind + shared design tokens
    ├── layouts/
    │   └── DashboardLayout.jsx
    ├── components/
    │   ├── Sidebar.jsx        # role switcher + secondary nav
    │   ├── TopBar.jsx         # page header
    │   └── ui.jsx             # MetricCard, StatusPill, SectionHeading
    ├── data/
    │   └── mockData.js        # all mock data in one place
    └── pages/
        ├── RestaurantDashboard.jsx
        ├── NgoDashboard.jsx
        ├── VolunteerDashboard.jsx
        └── AdminDashboard.jsx
```

## Run locally (no Docker)

Requires Node.js 20+ and npm.

```bash
cd harvest-loop-frontend
npm install
npm run dev
```

Vite will print a local URL, typically `http://localhost:5173`.

To build a production bundle:

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

## Run with Docker

You don't need Node installed locally for this path — only Docker.

### Option A — Docker Compose (recommended)

```bash
cd harvest-loop-frontend
docker compose up --build
```

Visit `http://localhost:3000`.

Stop it with `Ctrl+C`, or run detached with `docker compose up --build -d`
and stop later with `docker compose down`.

### Option B — plain Docker

```bash
cd harvest-loop-frontend
docker build -t harvest-loop-frontend .
docker run -p 3000:80 harvest-loop-frontend
```

Visit `http://localhost:3000`.

### How the image works

The `Dockerfile` uses a two-stage build:
1. **Build stage** (`node:20-alpine`) — installs dependencies and runs
   `vite build`, producing static files in `dist/`.
2. **Production stage** (`nginx:1.27-alpine`) — copies just the built
   static files into an nginx image and serves them. The final image
   doesn't contain Node, npm, or your source code — just the compiled
   app, so it's small and fast to start.

`nginx.conf` adds a fallback to `index.html` so client-side routing
(once you add pages for NGO/Volunteer/Admin dashboards) won't 404 on
refresh.

## Auth

Login and registration now hit the real backend (`/auth/login`, `/auth/register`).
The session (JWT + user) is kept in `localStorage` via `src/context/AuthContext.jsx`
and attached to future authenticated requests. Each dashboard route is wrapped
in `ProtectedRoute`, which redirects to `/login` if you're not signed in, or to
your own dashboard if you're signed in as the wrong role.

To test: go to `/register`, pick a role, fill in the form (latitude/longitude
can be anything numeric for now — right-click a spot on Google Maps to copy
real coordinates), and you'll land on that role's dashboard already logged in.

Copy `.env.example` to `.env` if you need to point at a backend that isn't at
`http://localhost:4000`.

## Next steps for the capstone

- Replace the mock arrays in `src/data/mockData.js` with real API calls
  now that auth is in place — each authenticated page can use the
  `token` from `useAuth()` with `authRequest()` in `src/lib/api.js`
- Replace the mocked forecast math in `RestaurantDashboard.jsx` with a
  real call to `POST /forecast` on the backend
- If you containerize the backend, ML service, and database too, add
  them as services in `docker-compose.yml` alongside `frontend` so
  `docker compose up` starts the whole stack at once
