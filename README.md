# FarmAdvisory

FarmAdvisory is a farmer-focused advisory web app for crop recommendation, yield prediction, calamity risk hints, prediction history, and a multilingual voice assistant.

The project combines a React/Vite frontend, a Node/Express API server, local JSON storage, and a separate Python FastAPI voice-assistant service.

## What It Includes

- Crop recommendation based on soil and weather inputs
- Yield prediction for supported crops and seasons
- Calamity risk guidance for drought, flood, heat stress, pest risk, and erosion
- Farmer login/profile flow
- Prediction history stored locally in JSON files
- Multilingual interface and voice assistant support
- PWA assets through `manifest.json` and service worker

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS
- UI: Radix UI, shadcn-style components, lucide-react
- API: Express with TypeScript
- Storage: local JSON files in `server/data`
- Voice backend: FastAPI, Uvicorn, Pydantic
- Optional database tooling: Drizzle ORM

## Requirements

Install these before running the project:

- Node.js 18 or newer
- npm
- Python 3.8 or newer
- Modern browser with microphone permission for voice features

## Setup

Run Node setup from the project root:

```bash
npm install --legacy-peer-deps
```

The `--legacy-peer-deps` flag is currently needed because the project has a Vite peer-dependency conflict.

Install Python backend dependencies:

```bash
cd backend
pip install -r requirements.txt
```

## Run The Main App

From the project root:

```bash
npm run dev
```

Open:

```text
http://localhost:5000
```

The Node server serves both the API and the React app.

## Run The Voice Assistant Backend

In a second terminal:

```bash
cd backend
python app.py
```

Voice backend runs at:

```text
http://localhost:8002
```

Health check:

```text
http://localhost:8002/health
```

## Useful Commands

```bash
npm run dev
npm run build
npm run start
npm run check
```

`npm run build` creates the production output in `dist`.

## Environment Variables

Create or update `.env` in the project root:

```env
OPENWEATHER_API_KEY=your_openweather_key
```

Weather can fall back to mock/default values if no API key is available.

`DATABASE_URL` is only required if you use Drizzle database commands such as:

```bash
npm run db:push
```

The app currently runs with local JSON storage and does not require PostgreSQL for normal local usage.

## Project Structure

```text
client/       React frontend
server/       Express API and local storage
backend/      Python voice-assistant backend
shared/       Shared schema and types
attached_assets/ ML model assets and reference files
server/data/  Local JSON data storage
```

## Notes

- Run npm commands from the project root, not from `client`.
- The `frontend` folder is not the active app entry.
- The voice assistant uses `localhost:8002`.
- TypeScript checking currently reports type errors, but the production build succeeds.
- Before deployment, review and fix npm audit warnings.

