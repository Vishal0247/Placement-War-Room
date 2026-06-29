import { genai, lemma } from './index.ts';

/**
 * Strategy Agent — generates personalized daily placement prep missions
 * based on the user's profile, target companies, and skill set.
 */
export async function strategyAgent(userProfile: any) {
  try {
    const prompt = `
      You are the Strategy Agent for a student preparing for tech placements.
      User Profile: 
      - Branch: ${userProfile.branch || 'Computer Science'}
      - Target Companies: ${userProfile.targetCompanies || 'Top Tech Companies'}
      - Preferred Role: ${userProfile.preferredRole || 'SDE-1'}
      - Known Skills: ${userProfile.skills || 'JavaScript, React, Node.js'}

      Generate 3 daily missions for them in JSON format.
      Format: [{ "title": "Mission title", "type": "DSA|OS|DBMS|RESUME|SYSTEM_DESIGN", "description": "short description" }]
    `;

    let missionsData: any[] = [];

    const getOfflineMissions = () => {
      const role = userProfile.preferredRole || 'SDE-1';
      const company = userProfile.targetCompanies || 'Top Tech Companies';
      return [
        { title: `Solve 3 Medium-level LeetCode problems on Arrays & Hashing`, type: 'DSA', description: `Practice pattern recognition for ${company} coding rounds. Focus on two-pointer and sliding window techniques.` },
        { title: `Study ${role} System Design: Design a URL Shortener`, type: 'SYSTEM_DESIGN', description: `Cover load balancing, database sharding, and caching strategies commonly asked at ${company}.` },
        { title: `Review OS Concepts: Process Scheduling & Deadlocks`, type: 'OS', description: `Deep dive into CPU scheduling algorithms, deadlock prevention, and memory management for technical interviews.` },
      ];
    };

    const runGenAI = async (retries = 2): Promise<any[]> => {
      for (let i = 0; i <= retries; i++) {
        try {
          const response = await genai.models.generateContent({
            model: 'gemini-2.0-flash',
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
        const messages = await lemma.conversations.messages.list(conversation.id);
        const aiMessage = messages.data[messages.data.length - 1];
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
      const messages = await lemma.conversations.messages.list(conversation.id);
      const aiMessage = messages.data[messages.data.length - 1];
      
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
        model: 'gemini-2.0-flash',
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

/**
 * Skill Gap Agent — identifies missing skills based on the user's
 * current tech stack and their target company requirements.
 */
export async function skillGapAgent(userSkills: string, targetCompany: string) {
    try {
        const prompt = `
          You are the Skill Gap Agent.
          User currently knows: ${userSkills}.
          They are targeting: ${targetCompany}.
          
          What are the top 3 missing skills or topics they need?
          Output JSON format:
          { "missingSkills": ["System Design", "Dynamic Programming", "AWS"] }
        `;
    
        if (process.env.LEMMA_API_KEY) {
            const conversation = await lemma.agents.run('skill-gap-agent', prompt);
            const messages = await lemma.conversations.messages.list(conversation.id);
            const cleanJson = messages.data[messages.data.length - 1].content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } else {
            const response = await genai.models.generateContent({
              model: 'gemini-2.0-flash',
              contents: prompt,
            });
        
            const text = response.text || "{}";
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        }
      } catch (error) {
        console.error("Skill Gap Agent Error:", error);
        return { missingSkills: [] };
      }
}
