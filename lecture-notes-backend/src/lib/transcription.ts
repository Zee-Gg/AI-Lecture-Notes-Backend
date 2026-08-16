import Groq from 'groq-sdk';

let groq: Groq | null = null;

function getGroqClient(): Groq {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }
    groq = new Groq({ apiKey });
  }
  return groq;
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  fileName: string
): Promise<string> {
  // Groq's SDK expects a File-like object, not a raw Buffer
  // Use the global File constructor (available in Node.js 18+)
  const file = new (globalThis as any).File([audioBuffer], fileName);

  const response = await getGroqClient().audio.transcriptions.create({
    file: file as any,
    model: 'whisper-large-v3',
    response_format: 'text',
    // No 'language' param set deliberately — Whisper auto-detects,
    // which handles code-switched Urdu-English better than forcing 'ur' or 'en'
  });

  return response as unknown as string;
}