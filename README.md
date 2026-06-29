# Placement War Room 🎯

AI-powered tactical command center for placement preparation. Track your readiness, get personalized daily missions, analyze your resume, and identify skill gaps — all powered by a multi-agent Gemini AI system.

## Features

- **🧠 Strategy Agent** — Generates personalized daily missions based on your profile, target companies, and current skills using Gemini 2.0 Flash
- **📄 Resume Agent** — Upload your resume PDF and get an ATS compatibility score with actionable feedback
- **🔍 Skill Gap Agent** — Identifies missing skills and topics you need to learn for your target role
- **🔐 Authentication** — Google Sign-In via Firebase Auth with guest demo mode
- **📊 Readiness Tracker** — Dynamic readiness score that updates as you complete missions

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TailwindCSS 4, Framer Motion |
| Backend | Express.js, TypeScript |
| AI | Google Gemini 2.0 Flash, Lemma SDK |
| Database | PostgreSQL (Neon), Drizzle ORM |
| Auth | Firebase Authentication |
| Build | Vite, esbuild |

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React Client  │────▶│  Express Server  │────▶│   Gemini 2.0    │
│   (Vite + TW)   │     │  (TypeScript)    │     │   Flash API     │
└─────────────────┘     └──────┬───────────┘     └─────────────────┘
                               │                          │
                    ┌──────────┴──────────┐    ┌─────────┴────────┐
                    │  Neon PostgreSQL    │    │   Lemma SDK      │
                    │  (Drizzle ORM)     │    │   (Optional)     │
                    └────────────────────┘    └──────────────────┘
```

### Multi-Agent System

The app uses three specialized AI agents, each with a specific role:

1. **Strategy Agent** — Long-term planner that creates daily missions and study roadmaps based on user profile
2. **Resume Agent** — Analyzes uploaded PDFs against ATS criteria and provides improvement suggestions
3. **Skill Gap Agent** — Compares current skills against target company requirements and identifies gaps

Each agent uses Gemini 2.0 Flash as the primary LLM, with Lemma SDK as an optional secondary provider for cross-session memory and record tracking.

## Getting Started

### Prerequisites
- Node.js 18+
- A [Gemini API Key](https://aistudio.google.com/apikey)
- A [Neon PostgreSQL](https://neon.tech) database
- A [Firebase](https://console.firebase.google.com) project with Google Auth enabled

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/placement-war.git
   cd placement-war
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Fill in your environment variables in `.env`:
   ```env
   GEMINI_API_KEY="your_key"
   DATABASE_URL="your_neon_connection_string"
   APP_URL="http://localhost:3000"
   ```

5. Push the database schema:
   ```bash
   npx drizzle-kit push
   ```

6. Start the dev server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

## Database Schema

| Table | Purpose |
|---|---|
| `users` | User profiles, skills, target companies, readiness scores |
| `missions` | AI-generated daily missions with status tracking |
| `agent_memory` | Cross-session agent memory for personalization |
| `opportunities` | Tracked placement opportunities with match scores |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run lint` | Type check with TypeScript |

## License

MIT
