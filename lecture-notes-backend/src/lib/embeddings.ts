import { CohereClient } from 'cohere-ai';

let cohereClient: CohereClient | null = null;

function getCohereClient(): CohereClient {
  if (!cohereClient) {
    cohereClient = new CohereClient({ token: process.env.COHERE_API_KEY! });
  }
  return cohereClient;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const cohere = getCohereClient();

  const response = await cohere.embed({
    texts,
    model: 'embed-multilingual-v3.0',
    inputType: 'search_document',
  });

  const embeddings = response.embeddings as number[][];
  if (!embeddings || embeddings.length !== texts.length) {
    throw new Error('Embedding response did not match expected shape');
  }

  return embeddings;
}

export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const cohere = getCohereClient();

  const response = await cohere.embed({
    texts: [query],
    model: 'embed-multilingual-v3.0',
    inputType: 'search_query',
  });

  const embeddings = response.embeddings as number[][];
  const first = embeddings?.[0];

  if (!first) {
    throw new Error('Failed to generate query embedding');
  }

  return first;
}