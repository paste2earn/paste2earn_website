# Deploy Paste2Earn to Render

## Fix: "Cannot find package 'vite'" Error

Render runs `npm install` with NODE_ENV=production, which **skips devDependencies**. Vite and `@vitejs/plugin-react` are devDependencies, so they never get installed and the build fails.

## Solution

Set your **Build Command** in Render to:

```
npm install --include=dev && npm run build
```

This forces npm to install devDependencies (including Vite) before the build runs.

## Render Static Site Settings

| Setting | Value |
|--------|-------|
| **Root Directory** | `frontend` |
| **Build Command** | `npm install --include=dev && npm run build` |
| **Publish Directory** | `dist` |

## Using render.yaml (Blueprint)

A `render.yaml` file is included in the repo. If you create a new service via **Blueprint**, it will use these settings automatically.

## Backend (API) - Separate Service

If you need to deploy the backend (Express API) as well, create a **second** Web Service:

| Setting | Value |
|--------|-------|
| **Root Directory** | `backend` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` or `npm start` |

Remember to set environment variables (DATABASE_URL, JWT_SECRET, etc.) in the Render dashboard.
