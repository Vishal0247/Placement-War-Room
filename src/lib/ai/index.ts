import 'dotenv/config';
import { LemmaClient } from 'lemma-sdk';
import { GoogleGenAI } from '@google/genai';

export const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const lemma = new LemmaClient({
  apiUrl: process.env.LEMMA_API_URL || 'https://api.lemma.work',
  podId: process.env.LEMMA_POD_ID || 'placement-war-pod',
});

export { LemmaClient };
