import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { getOrCreateUser } from './src/db/users.ts';
import multer from 'multer';
import { strategyAgent, resumeAgent, skillGapAgent } from './src/lib/ai/agents.ts';
import { parseResumePDF } from './src/lib/ai/resume.ts';
import { eq } from 'drizzle-orm';
import { missions } from './src/db/schema.ts';

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Sync user profile on login
  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await getOrCreateUser(req.user.uid, req.user.email || '');
      res.json(user);
    } catch (error) {
      console.error("Sync user error:", error);
      res.status(500).json({ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Strategy Agent — generates daily placement prep missions
  app.post("/api/agents/strategy", requireAuth, async (req: AuthRequest, res) => {
    try {
      let user: any;
      try {
        user = await getOrCreateUser(req.user!.uid, req.user!.email || '');
      } catch (dbErr: any) {
        console.warn("DB user fetch failed, using fallback profile:", dbErr.message);
        user = { id: 0, uid: req.user!.uid, email: req.user!.email };
      }
      
      const newMissions = await strategyAgent(user);
      
      // Persist missions to database
      try {
        if (newMissions && newMissions.length > 0 && user.id > 0) {
          for (const m of newMissions) {
            await db.insert(missions).values({
              userId: user.id,
              title: m.title || 'Untitled Mission',
              description: m.description || '',
              type: m.type || 'DSA',
              status: 'PENDING'
            });
          }
        }
      } catch (saveErr: any) {
        console.warn("Failed to persist missions (non-critical):", saveErr.message);
      }

      res.json({ success: true, missions: newMissions });
    } catch (error: any) {
      console.error("Strategy Agent error:", error?.message || error);
      const fallback = [
        { title: 'Solve 2 LeetCode Medium problems on Trees', type: 'DSA', description: 'Practice BFS/DFS traversal patterns.' },
        { title: 'Study DBMS: Normalization & Indexing', type: 'DBMS', description: 'Review 1NF-BCNF and B+ Trees.' },
        { title: 'Mock Interview: Behavioral Round Prep', type: 'RESUME', description: 'Prepare STAR method answers.' },
      ];
      res.json({ success: true, missions: fallback });
    }
  });

  // Resume Agent — analyzes uploaded resume and returns ATS score + feedback
  app.post("/api/agents/resume", requireAuth, upload.single('resume'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No resume file provided" });
        return;
      }
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');
      const resumeText = await parseResumePDF(req.file.buffer);
      const result = await resumeAgent(resumeText, user.preferredRole || 'Software Engineer');
      
      res.json({ success: true, atsScore: result.atsScore, feedback: result.feedback });
    } catch (error) {
      console.error("Resume Agent error:", error);
      res.status(500).json({ error: "Resume analysis failed" });
    }
  });

  // Skill Gap Agent — identifies missing skills for target company
  app.post("/api/agents/skill-gap", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');
      const result = await skillGapAgent(
        user.skills || 'JavaScript, React, Node.js',
        user.targetCompanies || 'Top Tech Companies'
      );
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Skill Gap Agent error:", error);
      res.status(500).json({ error: "Skill gap analysis failed" });
    }
  });

  // Development: Vite dev server middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve static build
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Placement War Room running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
