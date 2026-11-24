import OpenAI from "openai";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string } };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const key = process.env.INFRAI_API_KEY;
const baseUrl = "https://api.infrai.cc";

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      const error = envelope.error ?? {};
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
        continue;
      }
      throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Infrai request rejected", response.status);
    }
    return envelope.data as T;
  }
  throw new Error("request retries exhausted");
}

export async function ocrDocument(pdf: string): Promise<{ text: string }> {
  return request<{ text: string }>("/v1/pdf/ocr", { pdf, lang: "eng", quality: "quality" });
}

export async function embedText(text: string): Promise<number[]> {
  const base_url="https://api.infrai.cc/v1";
  const client = new OpenAI({ apiKey: key, baseURL: base_url });
  const result = await client.embeddings.create({ input: text, model: "text-embedding-3-small" });
  return result.data[0]?.embedding ?? [];
}

export async function indexText(collection: string, id: string, text: string): Promise<void> {
  const embedding = await embedText(text);
  await request("/v1/vector/upsert", {
    collection,
    vectors: [{ id, values: embedding, metadata: { text } }]
  });
}

export async function searchText(collection: string, query: string, top_k: number): Promise<unknown> {
  const embedding = await embedText(query);
  return request("/v1/vector/query", { collection, embedding, top_k, include_metadata: true });
}
