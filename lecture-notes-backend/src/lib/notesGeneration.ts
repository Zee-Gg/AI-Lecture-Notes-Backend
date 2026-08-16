import Groq from 'groq-sdk';
import { buildNotesPrompt } from './prompts.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export type GeneratedNotes = {
  concepts: string[];
  definitions: { term: string; definition: string }[];
  formulas: string[];
  emphasized_points: string[];
};

function extractJson(raw: string): string {
  // Strip markdown code fences if the model added them despite instructions
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) return fenceMatch[1];
  return raw.trim();
}

function isValidNotesShape(obj: any): obj is GeneratedNotes {
  return (
    Array.isArray(obj?.concepts) &&
    Array.isArray(obj?.definitions) &&
    Array.isArray(obj?.formulas) &&
    Array.isArray(obj?.emphasized_points)
  );
}

async function callGroqForNotes(transcript: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: buildNotesPrompt(transcript) }],
    temperature: 0.2, // low temperature — we want consistent structure, not creativity
  });

  return completion.choices[0]?.message?.content || '';
}

export async function generateStructuredNotes(
  transcript: string,
  maxRetries = 2
): Promise<GeneratedNotes> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const raw = await callGroqForNotes(transcript);
      const jsonStr = extractJson(raw);
      const parsed = JSON.parse(jsonStr);

      if (!isValidNotesShape(parsed)) {
        throw new Error('Response did not match expected notes shape');
      }

      return parsed;
    } catch (err) {
      lastError = err;
      console.warn(`Notes generation attempt ${attempt + 1} failed:`, err);
    }
  }

  throw new Error(`Failed to generate structured notes after ${maxRetries + 1} attempts: ${lastError}`);
}