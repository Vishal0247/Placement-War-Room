# Placement War Room 🎯

**AI-powered tactical command center for placement preparation.** Track your readiness, get personalized daily missions, analyze your resume, and identify skill gaps — all powered by a multi-agent system built on the **Lemma SDK**.

---

## Features

- 🧠 **Strategy Agent** — Generates personalized daily missions based on your profile, target companies, and current skills, orchestrated through Lemma SDK agents running on Gemini 2.0 Flash
- 📄 **Resume Agent** — Upload your resume PDF and get an ATS compatibility score with actionable feedback
- 🔍 **Skill Gap Agent** — Identifies missing skills and topics you need to learn for your target role
- 📊 **Readiness Tracker** — Dynamic readiness score that updates as you complete missions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TailwindCSS 4, Framer Motion |
| Backend | Express.js, TypeScript |
| AI Orchestration | **Lemma SDK** (multi-agent framework, cross-session memory) |
| LLM Provider | Google Gemini 3.5 Flash |
| Database | PostgreSQL (Neon), Drizzle ORM |
| Auth | Firebase Authentication |
| Build | Vite, esbuild |

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React Client  │────▶│  Express Server  │────▶│   Lemma SDK     │
│   (Vite + TW)   │     │  (TypeScript)    │     │  (Agent Layer)  │
└─────────────────┘     └──────┬───────────┘     └────────┬────────┘
                               │                            │
                    ┌──────────┴──────────┐       ┌─────────▼────────┐
                    │  Neon PostgreSQL    │       │  Gemini 3.5 Flash │
                    │  (Drizzle ORM)      │       │   (LLM Provider)  │
                    └─────────────────────┘       └────────────────────┘
```

Every AI request flows through **Lemma SDK**, which handles agent orchestration, cross-session memory, and record tracking — with Gemini 2.0 Flash as the underlying LLM that powers reasoning for each agent.

---

## Multi-Agent System

The app uses three specialized agents, all built and orchestrated on **Lemma SDK**:

1. **Strategy Agent** — Long-term planner that creates daily missions and study roadmaps based on the user's profile. Uses Lemma's cross-session memory to adapt the roadmap as the student progresses, rather than regenerating from scratch each time.
2. **Resume Agent** — Analyzes uploaded PDFs against ATS criteria and provides improvement suggestions.
3. **Skill Gap Agent** — Compares current skills against target company requirements and identifies precise gaps.

Each agent is registered and run through Lemma SDK, which manages the agent lifecycle, memory persistence, and structured responses — with Gemini 2.0 Flash as the LLM each agent calls under the hood.

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Gemini API Key
- A Neon PostgreSQL database
- A Firebase project with Google Auth enabled


## Database Schema

| Table | Purpose |
|---|---|
| `users` | User profiles, skills, target companies, readiness scores |
| `missions` | AI-generated daily missions with status tracking |
| `agent_memory` | Cross-session Lemma agent memory for personalization |
| `opportunities` | Tracked placement opportunities with match scores |

---
