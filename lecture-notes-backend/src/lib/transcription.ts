import Groq from 'groq-sdk';
import fs from 'node:fs';
import { GROQ_WHISPER_MODEL } from './modelConfig.js';
import { splitAudioIntoChunks, cleanupAudioSegments } from './audioChunking.js';

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

const TRANSCRIPTION_CONCURRENCY = 3;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index]!, index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function translateSingleFile(filePath: string): Promise<any> {
  const groq = getGroqClient();
  const fileStream = fs.createReadStream(filePath);

  // translations.create() converts any spoken language directly to English text
  const response = await groq.audio.translations.create(
    {
      file: fileStream as any,
      model: GROQ_WHISPER_MODEL,
      response_format: 'verbose_json',
    },
    { timeout: 60_000 }
  );

  return response as any;
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  fileName: string
): Promise<TranscriptionResult> {
  const segments = await splitAudioIntoChunks(audioBuffer, fileName);

  try {
    const results = await mapWithConcurrency(
      segments,
      TRANSCRIPTION_CONCURRENCY,
      async (segment) => {
        const result = await translateSingleFile(segment.filePath);
        const segmentTexts: TranscriptSegment[] = (result.segments || []).map((s: any) => ({
          text: s.text.trim(),
          start: s.start + segment.offsetSeconds,
          end: s.end + segment.offsetSeconds,
        }));
        return { segmentTexts, text: result.text as string };
      }
    );

    return {
      fullText: results.map((r) => r.text).join(' '),
      segments: results.flatMap((r) => r.segmentTexts),
    };
  } finally {
    await cleanupAudioSegments(segments);
  }
}