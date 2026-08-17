import type { TranscriptSegment } from './transcription.js';

export type Chunk = {
  content: string;
  startTime: number;
  endTime: number;
};

const CHUNK_WINDOW_SECONDS = 60;

export function chunkTranscript(segments: TranscriptSegment[]): Chunk[] {
  if (segments.length === 0) return [];

  const chunks: Chunk[] = [];
  let currentTexts: string[] = [];

  const firstSegment = segments[0];
  if (!firstSegment) return [];
  let windowStart = firstSegment.start;

  for (const segment of segments) {
    currentTexts.push(segment.text);

    const windowDuration = segment.end - windowStart;
    if (windowDuration >= CHUNK_WINDOW_SECONDS) {
      chunks.push({
        content: currentTexts.join(' ').trim(),
        startTime: windowStart,
        endTime: segment.end,
      });
      currentTexts = [];
      windowStart = segment.end;
    }
  }

  if (currentTexts.length > 0) {
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) {
      chunks.push({
        content: currentTexts.join(' ').trim(),
        startTime: windowStart,
        endTime: lastSegment.end,
      });
    }
  }

  return chunks;
}