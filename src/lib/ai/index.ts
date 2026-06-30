import 'dotenv/config';
// import { LemmaClient } from 'lemma-sdk';
import { GoogleGenAI } from '@google/genai';

export const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Mocking lemma to avoid deployment ESM errors since we are using Gemini API directly
export const lemma = {
  agents: { run: async () => { throw new Error("Lemma disabled"); } },
  conversations: { messages: { list: async () => ({ data: [] }) } },
  records: { create: async () => {} }
} as any;
