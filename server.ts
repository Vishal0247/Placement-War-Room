import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { getOrCreateUser, updateUserProfile } from './src/db/users.ts';
import { getUserMissions, createMissions, addCustomMission, updateMissionStatus } from './src/db/missions.ts';
import multer from 'multer';
import { masterOnboardingAgent, resumeAgent } from './src/lib/ai/agents.ts';
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

  // Update user profile (onboarding & settings)
  app.put("/api/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const { name, branch, gradYear, cgpa, targetCompanies, preferredRole, skills } = req.body;
      const updated = await updateUserProfile(req.user.uid, {
        name, branch, gradYear, cgpa, targetCompanies, preferredRole, skills
      });
      res.json({ success: true, user: updated });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Master Onboarding Agent — Curriculum Strategy, Skill Matrix & Readiness
  app.post("/api/agents/strategy", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');
      
      // Check if they already have missions
      const existingMissions = await getUserMissions(req.user!.uid);
      if (existingMissions.length > 0 && !req.body.force) {
        res.json({ success: true, missions: existingMissions });
        return;
      }

      // Generate full onboarding data (Curriculum, Skill Matrix, Readiness) in ONE API call
      const onboardingData = await masterOnboardingAgent(user);
      
      // Persist missions to DB
      const savedMissions = await createMissions(req.user!.uid, onboardingData.curriculum);
      
      // Update profile with readiness score and skill matrix
      const readinessScoreStr = JSON.stringify(onboardingData.readiness);
      const skillMatrixStr = JSON.stringify(onboardingData.skillMatrix);
      await updateUserProfile(user.uid, { 
        readinessScore: readinessScoreStr,
        skillMatrix: skillMatrixStr
      });

      res.json({ 
        success: true, 
        missions: savedMissions,
        skillMatrix: onboardingData.skillMatrix,
        readiness: onboardingData.readiness
      });
    } catch (error: any) {
      console.error("Strategy Agent error:", error?.message || error);
      res.status(500).json({ error: "Failed to generate roadmap curriculum" });
    }
  });

  // Fetch Existing Missions
  app.get("/api/missions", requireAuth, async (req: AuthRequest, res) => {
    try {
      const missions = await getUserMissions(req.user!.uid);
      res.json({ success: true, missions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch missions" });
    }
  });

  // Add Custom Mission
  app.post("/api/missions/custom", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { title, description, type } = req.body;
      if (!title) return res.status(400).json({ error: "Title required" });
      const mission = await addCustomMission(req.user!.uid, { title, description, type: type || 'CUSTOM' });
      res.json({ success: true, mission });
    } catch (error) {
      res.status(500).json({ error: "Failed to add mission" });
    }
  });

  // Update Mission Status
  app.put("/api/missions/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const mission = await updateMissionStatus(parseInt(req.params.id), req.body.status);
      res.json({ success: true, mission });
    } catch (error) {
      res.status(500).json({ error: "Failed to update mission" });
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
      
      const resumeResultStr = JSON.stringify({ atsScore: result.atsScore, feedback: result.feedback });
      await updateUserProfile(user.uid, { resumeResult: resumeResultStr });

      res.json({ success: true, atsScore: result.atsScore, feedback: result.feedback });
    } catch (error) {
      console.error("Resume Agent error:", error);
      res.status(500).json({ error: "Resume analysis failed" });
    }
  });



  // Extract skills from uploaded resume/CV
  app.post("/api/extract-skills", requireAuth, upload.single('resume'), async (req: AuthRequest, res) => {
    try {
      console.log(`[Extract Skills] Request received from ${req.user!.uid}`);
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }
      const resumeText = await parseResumePDF(req.file.buffer);
      console.log(`[Extract Skills] PDF parsed. Length: ${resumeText.length}`);

      // Use Gemini to extract skills from the resume text
      const { genai } = await import('./src/lib/ai/index.ts');
      let skills = '';
      
      try {
        const response = await genai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: `Extract all technical skills, programming languages, frameworks, tools, and technologies mentioned in this resume. Return ONLY a comma-separated list of skills, nothing else. No explanations, no categories, just the skills separated by commas.

Resume:
${resumeText}`,
        });
        skills = (response.text || '').trim();
        console.log(`[Extract Skills] Extracted successfully: ${skills}`);
      } catch (genaiErr: any) {
        console.error("[Extract Skills] Gemini API error:", genaiErr?.message);
        if (genaiErr?.status === 429 || (genaiErr?.message && genaiErr.message.includes('429'))) {
          res.status(429).json({ error: "API Quota Exceeded. Please try again later or check your Gemini plan." });
          return;
        }
        res.status(500).json({ error: "Failed to extract skills via AI." });
        return;
      }

      const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');

      // Save extracted skills and resume text to user profile
      try {
        await updateUserProfile(req.user!.uid, {
          skills,
          resumeText
        });
      } catch (dbErr: any) {
        console.warn("Failed to save extracted skills to DB:", dbErr.message);
      }

      res.json({ success: true, skills, resumeText: resumeText.substring(0, 500) });
    } catch (error: any) {
      console.error("Skill extraction error:", error?.message || error);
      res.status(500).json({ error: "Failed to extract skills from resume" });
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
