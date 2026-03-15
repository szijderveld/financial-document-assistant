# Deployment Guide — FinDoc AI

## Prerequisites

- Cloudflare account with API token (for Pages deployment)
- Render account (for backend hosting)
- GitHub repo pushed and up-to-date

## 1. Deploy Backend to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Create a **New Web Service**
3. Connect your GitHub repo: `szijderveld/financial-document-assistant`
4. Configure:
   - **Root directory:** `backend`
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID
   - `CLOUDFLARE_API_TOKEN` — your Cloudflare Workers AI API token
   - `ALLOWED_ORIGINS` — set to your Cloudflare Pages URL (e.g., `https://findoc-ai.pages.dev`)
6. Deploy. Note the Render URL (e.g., `https://findoc-api.onrender.com`)

Alternatively, the repo includes `backend/render.yaml` for Render Blueprint deployment.

## 2. Deploy Frontend to Cloudflare Pages

### Option A: Wrangler CLI

```bash
# Authenticate first
npx wrangler login

# Build with production API URL
cd frontend
VITE_API_URL=https://YOUR-RENDER-URL.onrender.com npm run build

# Deploy
npx wrangler pages deploy dist --project-name findoc-ai
```

### Option B: Cloudflare Dashboard

1. Go to [Cloudflare Pages](https://dash.cloudflare.com/?to=/:account/pages)
2. Create a project, connect your GitHub repo
3. Configure:
   - **Framework preset:** None
   - **Build command:** `cd frontend && npm run build`
   - **Build output directory:** `frontend/dist`
4. Add environment variable:
   - `VITE_API_URL` = your Render backend URL (e.g., `https://findoc-api.onrender.com`)
5. Deploy

## 3. Connect Frontend and Backend

After both are deployed:

1. Update Render env var `ALLOWED_ORIGINS` to include your Pages URL
2. Rebuild frontend with correct `VITE_API_URL` if needed
3. Test the live deployment end-to-end

## Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

The frontend dev server proxies `/api` to `localhost:8000` automatically.
