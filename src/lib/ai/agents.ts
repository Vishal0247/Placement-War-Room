import { genai, lemma } from './index.ts';

/**
 * Master Onboarding Agent — combining Strategy, Skill Matrix, and Readiness 
 * into a single unified API call to save Gemini API quota.
 */
export async function masterOnboardingAgent(userProfile: any) {
  try {
    const prompt = `
      You are the Master Onboarding Agent for a student preparing for tech placements.
      User Profile: 
      - Branch: ${userProfile.branch || 'Computer Science'}
      - Target Companies: ${userProfile.targetCompanies || 'Top Tech Companies'}
      - Preferred Role: ${userProfile.preferredRole || 'Software Engineer'}
      - Known Skills: ${userProfile.skills || 'None explicitly mentioned'}
      - Resume Context: ${userProfile.resumeText ? userProfile.resumeText.substring(0, 1000) : 'Not provided'}

      You have THREE tasks:
      1. Generate a comprehensive 10-step Placement Curriculum (Roadmap) for this student to go from their current level to completely Interview-Ready for their target company.
      2. Identify exactly what skills are REQUIRED for this role, and map them against the candidate's KNOWN skills to output what they have ACQUIRED and what is MISSING.
      3. Calculate a true "Readiness Percentage" (0-100) representing how prepared they are RIGHT NOW to pass an interview at this company. Be brutally honest and analytical, and provide a 1-2 sentence reason.

      Format strictly as a SINGLE JSON object:
      {
        "curriculum": [
          { 
            "title": "Specific Mission Title", 
            "type": "DSA|OS|DBMS|RESUME|SYSTEM_DESIGN|MOCK", 
            "description": "Elaborate 2-3 sentence description.",
            "level": 1
          }
        ],
        "skillMatrix": {
          "requiredSkills": ["System Design", "React", ...],
          "acquiredSkills": ["React", ...],
          "missingSkills": ["System Design", ...]
        },
        "readiness": {
          "score": 65,
          "reason": "You have strong frontend skills but lack backend system design..."
        }
      }
    `;

    const getOfflineFallback = () => {
      const role = userProfile.preferredRole || 'Software Engineer';
      const company = userProfile.targetCompanies || 'Top Tech Companies';
      return {
        curriculum: Array.from({ length: 10 }).map((_, i) => ({
          title: `Curriculum Level ${i + 1}: ${company} Prep`,
          type: i < 3 ? 'RESUME' : i < 6 ? 'DSA' : 'SYSTEM_DESIGN',
          description: `Complete stage ${i + 1} of your roadmap for the ${role} position.`,
          level: i + 1
        })),
        skillMatrix: { requiredSkills: [], acquiredSkills: [], missingSkills: [] },
        readiness: { score: 40, reason: "Unable to run deep analysis due to API limits. Keep preparing!" }
      };
    };

    const runGenAI = async (retries = 2) => {
      for (let i = 0; i <= retries; i++) {
        try {
          const response = await genai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
          });
          const text = response.text || "{}";
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(cleanJson);
        } catch (err: any) {
          console.warn(`GenAI attempt ${i + 1} failed:`, err.message?.substring(0, 100));
          if (i < retries) {
            await new Promise(r => setTimeout(r, (i + 1) * 3000));
          }
        }
      }
      return getOfflineFallback();
    };

    let resultData;
    
    if (process.env.LEMMA_API_KEY) {
      try {
        const conversation = await lemma.agents.run('master-agent', prompt);
        const messages = await lemma.conversations.messages.list((conversation as any).id);
        const aiMessage = (messages as any).data[(messages as any).data.length - 1];
        const text = aiMessage.content || "{}";
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        resultData = JSON.parse(cleanJson);
        
        // Store missions in Lemma for cross-session tracking
        if (resultData.curriculum) {
          for (const m of resultData.curriculum) {
            await lemma.records.create('missions', {
              title: m.title,
              type: m.type,
              description: m.description,
              userId: userProfile.uid,
              status: 'PENDING'
            });
          }
        }
      } catch (lemmaError: any) {
        console.warn("Lemma unavailable, falling back to Gemini:", lemmaError.message);
        resultData = await runGenAI();
      }
    } else {
      resultData = await runGenAI();
    }

    return resultData;
  } catch (error) {
    console.error("Master Onboarding Agent Error:", error);
    return {
      curriculum: [
        { title: 'Solve 2 LeetCode Medium problems on Trees', type: 'DSA', description: 'Practice BFS/DFS traversal patterns for coding interviews.', level: 1 }
      ],
      skillMatrix: { requiredSkills: [], acquiredSkills: [], missingSkills: [] },
      readiness: { score: 40, reason: "Fallback error mode triggered." }
    };
  }
}

/**
 * Strategy Agent — (Deprecated, using Master Onboarding Agent)
 */
export async function strategyAgent(userProfile: any) {
  try {
    const prompt = `
      You are the Strategy Agent for a student preparing for tech placements.
      User Profile: 
      - Branch: ${userProfile.branch || 'Computer Science'}
      - Target Companies: ${userProfile.targetCompanies || 'Top Tech Companies'}
      - Preferred Role: ${userProfile.preferredRole || 'SDE-1'}
      - Known Skills: ${userProfile.skills || 'None explicitly mentioned'}
      - Resume Context: ${userProfile.resumeText ? userProfile.resumeText.substring(0, 1000) : 'Not provided'}

      Generate a comprehensive 10-step Placement Curriculum (Roadmap) for this student to go from their current level to completely Interview-Ready for their target company (${userProfile.targetCompanies}).
      Analyze their resume context and known skills, and explicitly bridge the gap.
      The curriculum should flow logically (e.g., Level 1: Basics/Resume -> Level 5: Core Tech/System Design -> Level 10: Mock Interviews/Advanced DSA).

      Format strictly as JSON array of 10 objects:
      [
        { 
          "title": "Specific Mission Title", 
          "type": "DSA|OS|DBMS|RESUME|SYSTEM_DESIGN|MOCK", 
          "description": "Elaborate 2-3 sentence description explaining exactly what to do and why it is crucial for their target role/company based on their current profile.",
          "level": 1
        }
      ]
    `;

    let missionsData: any[] = [];

    const getOfflineMissions = () => {
      const role = userProfile.preferredRole || 'SDE-1';
      const company = userProfile.targetCompanies || 'Top Tech Companies';
      return Array.from({ length: 10 }).map((_, i) => ({
        title: `Curriculum Level ${i + 1}: ${company} Prep`,
        type: i < 3 ? 'RESUME' : i < 6 ? 'DSA' : 'SYSTEM_DESIGN',
        description: `Complete stage ${i + 1} of your roadmap for the ${role} position.`,
        level: i + 1
      }));
    };

    const runGenAI = async (retries = 2): Promise<any[]> => {
      for (let i = 0; i <= retries; i++) {
        try {
          const response = await genai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
          });
          const text = response.text || "[]";
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(cleanJson);
        } catch (err: any) {
          console.warn(`GenAI attempt ${i + 1} failed:`, err.message?.substring(0, 100));
          if (i < retries) {
            await new Promise(r => setTimeout(r, (i + 1) * 2000));
          }
        }
      }
      return getOfflineMissions();
    };

    if (process.env.LEMMA_API_KEY) {
      try {
        const conversation = await lemma.agents.run('strategy-agent', prompt);
        const messages = await lemma.conversations.messages.list((conversation as any).id);
        const aiMessage = (messages as any).data[(messages as any).data.length - 1];
        const text = aiMessage.content || "[]";
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        missionsData = JSON.parse(cleanJson);
        
        // Store missions in Lemma for cross-session tracking
        for (const m of missionsData) {
          await lemma.records.create('missions', {
            title: m.title,
            type: m.type,
            description: m.description,
            userId: userProfile.uid,
            status: 'PENDING'
          });
        }
      } catch (lemmaError: any) {
        console.warn("Lemma unavailable, falling back to Gemini:", lemmaError.message);
        missionsData = await runGenAI();
      }
    } else {
      missionsData = await runGenAI();
    }

    return missionsData;
  } catch (error) {
    console.error("Strategy Agent Error:", error);
    return [
      { title: 'Solve 2 LeetCode Medium problems on Trees', type: 'DSA', description: 'Practice BFS/DFS traversal patterns for coding interviews.' },
      { title: 'Study DBMS: Normalization & Indexing', type: 'DBMS', description: 'Review 1NF-BCNF, B+ Trees, and query optimization.' },
      { title: 'Mock Interview: Behavioral Round Prep', type: 'RESUME', description: 'Prepare STAR method answers for common behavioral questions.' },
    ];
  }
}

/**
 * Resume Agent — analyzes resume text against ATS criteria and
 * provides a compatibility score with actionable feedback.
 */
export async function resumeAgent(resumeText: string, targetRole: string) {
  try {
    const prompt = `
      You are the Resume Agent. Analyze this resume for a ${targetRole} role.
      Resume Text:
      ${resumeText}
      
      Provide an ATS Score (0-100) and 3 bullet points of feedback.
      Output format JSON:
      {
        "atsScore": 85,
        "feedback": ["Missing Kubernetes keyword", "Quantify achievements", "Better formatting"]
      }
    `;

    let analysisData = { atsScore: 0, feedback: [] };

    if (process.env.LEMMA_API_KEY) {
      const conversation = await lemma.agents.run('resume-agent', prompt);
      const messages = await lemma.conversations.messages.list((conversation as any).id);
      const aiMessage = (messages as any).data[(messages as any).data.length - 1];
      
      const cleanJson = aiMessage.content.replace(/```json/g, '').replace(/```/g, '').trim();
      analysisData = JSON.parse(cleanJson);
      
      // Track ATS history for progress monitoring
      await lemma.records.create('resume_history', {
        role: targetRole,
        score: analysisData.atsScore,
        feedback: JSON.stringify(analysisData.feedback)
      });
    } else {
      const response = await genai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      const text = response.text || "{}";
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      analysisData = JSON.parse(cleanJson);
    }

    return analysisData;
  } catch (error) {
    console.error("Resume Agent Error:", error);
    return { atsScore: 0, feedback: ["Failed to analyze resume"] };
  }
}

export async function skillGapAgent(userProfile: any) {
    try {
        const prompt = `
          You are the Skill Matrix Agent.
          Target Role: ${userProfile.preferredRole || 'Software Engineer'}
          Target Company: ${userProfile.targetCompanies || 'Top Tech Companies'}
          Candidate's Currently Known Skills (from CV): ${userProfile.skills || 'None explicitly mentioned'}
          
          Based on the target company and role, identify exactly what skills are REQUIRED.
          Then map them against the candidate's KNOWN skills to output what they have ACQUIRED and what is MISSING.
          
          Output exactly in this JSON format:
          { 
            "requiredSkills": ["System Design", "Algorithms", "React", "Node.js", "AWS", "SQL"],
            "acquiredSkills": ["React", "Node.js"],
            "missingSkills": ["System Design", "Algorithms", "AWS", "SQL"]
          }
        `;
    
        if (process.env.LEMMA_API_KEY) {
            const conversation = await lemma.agents.run('skill-gap-agent', prompt);
            const messages = await lemma.conversations.messages.list((conversation as any).id);
            const cleanJson = (messages as any).data[(messages as any).data.length - 1].content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } else {
            const response = await genai.models.generateContent({
              model: 'gemini-3.5-flash',
              contents: prompt,
            });
        
            const text = response.text || "{}";
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        }
      } catch (error) {
        console.error("Skill Gap Agent Error:", error);
        return { requiredSkills: [], acquiredSkills: [], missingSkills: [] };
      }
}

/**
 * Readiness Agent — calculates a true baseline readiness score by deeply
 * analyzing the user's current CV/skills against the target company's expectations.
 */
export async function readinessAgent(userProfile: any) {
  try {
    const prompt = `
      You are the Readiness Analyst for tech placements.
      
      Analyze the candidate's profile against the expectations for their target role.
      Target Company: ${userProfile.targetCompanies || 'Top Tech Companies'}
      Target Role: ${userProfile.preferredRole || 'Software Engineer'}
      Candidate Skills: ${userProfile.skills || 'None explicitly mentioned'}
      Candidate Resume Text (Truncated): ${userProfile.resumeText ? userProfile.resumeText.substring(0, 1500) : 'Not provided'}

      Calculate a true "Readiness Percentage" (0-100) representing how prepared they are RIGHT NOW to pass an interview at this company. Be brutally honest and analytical.
      Also provide a 1-2 sentence reason justifying the score.

      Output JSON format exactly:
      {
        "score": 65,
        "reason": "You have strong frontend skills but lack backend system design experience and scalable architecture projects required for Meta."
      }
    `;

    const response = await genai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const text = response.text || "{}";
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Readiness Agent Error:", error);
    return { score: 40, reason: "Unable to run deep analysis. Keep preparing!" };
  }
}
