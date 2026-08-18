import Groq from 'groq-sdk';
import { GROQ_WHISPER_MODEL } from './modelConfig.js';

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  }
  return groqClient;
}

export type TranscriptSegment = {
  text: string;
  start: number;
  end: number;
};

export type TranscriptionResult = {
  fullText: string;
  segments: TranscriptSegment[];
};

export async function transcribeAudio(
  audioBuffer: Buffer,
  fileName: string
): Promise<TranscriptionResult> {
  const groq = getGroqClient();
  const file = new (globalThis as any).File([audioBuffer], fileName);

  const response = await groq.audio.transcriptions.create({
    file: file as any,
    model: GROQ_WHISPER_MODEL,
    response_format: 'verbose_json',
  });

  const result = response as any;
  const segments: TranscriptSegment[] = (result.segments || []).map((s: any) => ({
    text: s.text.trim(),
    start: s.start,
    end: s.end,
  }));

  return {
    fullText: result.text,
    segments,
  };
}