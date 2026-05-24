# CipherSolve AI — Captcha Decoder

A Progressive Web App (PWA) that decodes text and mathematical CAPTCHAs from uploaded or pasted images, powered by Google Gemini vision models.

## Features

- Upload, drag-and-drop, or paste CAPTCHA screenshots
- Alphanumeric, numeric-only, and math equation modes
- Solve history stored locally in the browser
- REST API endpoints for programmatic solving
- Installable PWA with offline shell caching
- Deploy-ready for [Vercel](https://vercel.com)

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and add your Gemini API key:

   ```bash
   cp .env.example .env
   ```

   Set `GEMINI_API_KEY` in `.env` to your [Google AI Studio](https://aistudio.google.com/apikey) key.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

1. Push this repository to GitHub.

2. Import the project in [Vercel](https://vercel.com/new):
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`

3. Add the environment variable in Vercel project settings:

   | Variable           | Value              |
   | ------------------ | ------------------ |
   | `GEMINI_API_KEY`   | Your Gemini API key |

   **Important:** After adding or changing env vars, you must **Redeploy** the project (Vercel → Deployments → ⋯ → Redeploy). Env vars are not applied to existing deployments.

4. Deploy. Vercel will serve:
   - Static frontend from `dist/`
   - Serverless API routes from `api/`

### API Routes (production)

| Method | Endpoint            | Description                    |
| ------ | ------------------- | ------------------------------ |
| GET    | `/api/health`       | Health check                   |
| POST   | `/api/solve-captcha`| Full solve with config options |
| POST   | `/api/solve`        | Simple screenshot decode API   |

> **Note:** Vercel serverless functions have a ~4.5 MB request body limit. Keep CAPTCHA images reasonably sized.

## Install as PWA

After deploying (or running locally in production mode), open the app in Chrome, Edge, or Safari and use **Install app** / **Add to Home Screen** from the browser menu.

## Self-hosted (Node.js)

For a traditional Node server instead of Vercel:

```bash
npm run build:server
GEMINI_API_KEY=your_key NODE_ENV=production npm start
```

## License

Apache-2.0
