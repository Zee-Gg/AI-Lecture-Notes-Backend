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

async function transcribeSingleFile(filePath: string): Promise<any> {
  const groq = getGroqClient();
  const fileStream = fs.createReadStream(filePath);

  const response = await groq.audio.transcriptions.create({
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
      const result = await transcribeSingleFile(segment.filePath);

      const segmentTexts: TranscriptSegment[] = (result.segments || []).map((s: any) => ({
        text: s.text.trim(),
        start: s.start + segment.offsetSeconds, // shift timestamps to the full-lecture timeline
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