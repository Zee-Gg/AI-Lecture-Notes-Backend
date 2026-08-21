import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const ffmpegPath = ffmpegStatic as unknown as string;
const ffprobePath = ffprobeStatic.path;

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}
if (ffprobePath) {
  ffmpeg.setFfprobePath(ffprobePath);
}

const MAX_SEGMENT_BYTES = 24 * 1024 * 1024; // stay safely under Groq's 25MB free-tier cap
const TARGET_BITRATE_KBPS = 64; // speech-quality bitrate, keeps files small

export type AudioSegmentFile = {
  filePath: string;
  offsetSeconds: number;
};

async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

async function compressAudio(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioBitrate(`${TARGET_BITRATE_KBPS}k`)
      .audioChannels(1) // mono — halves size again, fine for speech transcription
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });
}

async function extractSegment(
  inputPath: string,
  outputPath: string,
  startSeconds: number,
  durationSeconds: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startSeconds)
      .setDuration(durationSeconds)
      .audioBitrate(`${TARGET_BITRATE_KBPS}k`)
      .audioChannels(1)
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });
}

export async function splitAudioIntoChunks(
  audioBuffer: Buffer,
  originalFileName: string
): Promise<AudioSegmentFile[]> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lecture-audio-'));
  const inputPath = path.join(tempDir, originalFileName);
  await fs.writeFile(inputPath, audioBuffer);

  // Step 0: file's already small enough — send as-is, skip transcoding entirely
  const inputStat = await fs.stat(inputPath);
  if (inputStat.size <= MAX_SEGMENT_BYTES) {
    return [{ filePath: inputPath, offsetSeconds: 0 }];
  }

  // Step 1: too large — compress, which fixes most oversized files
  const compressedPath = path.join(tempDir, 'compressed.mp3');
  await compressAudio(inputPath, compressedPath);

  const compressedStat = await fs.stat(compressedPath);
  const duration = await getAudioDuration(compressedPath);

  // Step 2: if the compressed file is already small enough, no splitting needed
  if (compressedStat.size <= MAX_SEGMENT_BYTES) {
    return [{ filePath: compressedPath, offsetSeconds: 0 }];
  }

  // Step 3: still too large — split proportionally based on size-to-duration ratio
  const bytesPerSecond = compressedStat.size / duration;
  const secondsPerSegment = Math.floor(MAX_SEGMENT_BYTES / bytesPerSecond);

  const segments: AudioSegmentFile[] = [];
  let offset = 0;
  let index = 0;

  while (offset < duration) {
    const segmentPath = path.join(tempDir, `segment-${index}.mp3`);
    const segmentDuration = Math.min(secondsPerSegment, duration - offset);

    await extractSegment(compressedPath, segmentPath, offset, segmentDuration);

    segments.push({ filePath: segmentPath, offsetSeconds: offset });
    offset += secondsPerSegment;
    index++;
  }

  return segments;
}

export async function cleanupAudioSegments(segments: AudioSegmentFile[]): Promise<void> {
  const dirs = new Set(segments.map((s) => path.dirname(s.filePath)));
  for (const dir of dirs) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}