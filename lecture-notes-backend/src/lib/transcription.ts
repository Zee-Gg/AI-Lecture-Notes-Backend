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

async function translateSingleFile(filePath: string): Promise<any> {
  const groq = getGroqClient();
  const fileStream = fs.createReadStream(filePath);

  // translations.create() converts any spoken language directly to English text
  const response = await groq.audio.translations.create({
    file: fileStream as any,
    model: GROQ_WHISPER_MODEL,
    response_format: 'verbose_json',
  });

  return response as any;
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  fileName: string
): Promise<TranscriptionResult> {
  const segments = await splitAudioIntoChunks(audioBuffer, fileName);

  try {
    const allSegments: TranscriptSegment[] = [];
    const allText: string[] = [];

    for (const segment of segments) {
      const result = await translateSingleFile(segment.filePath);

      const segmentTexts: TranscriptSegment[] = (result.segments || []).map((s: any) => ({
        text: s.text.trim(),
        start: s.start + segment.offsetSeconds,
        end: s.end + segment.offsetSeconds,
      }));

      allSegments.push(...segmentTexts);
      allText.push(result.text);
    }

    return {
      fullText: allText.join(' '),
      segments: allSegments,
    };
  } finally {
    await cleanupAudioSegments(segments);
  }
}