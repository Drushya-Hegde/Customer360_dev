import { Injectable } from '@nestjs/common';

@Injectable()
export class OllamaService {
  private readonly url = process.env.OLLAMA_URL ?? 'http://localhost:11434';
  private readonly model = process.env.OLLAMA_MODEL ?? 'qwen2.5:3b';

  async groundedAnswer(context: string, question: string): Promise<string> {
    const response = await fetch(`${this.url}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: `Use only this context and cite its source IDs.\n${context}\nQuestion: ${question}`,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status}`);
    }

    const body = await response.json() as { response?: string };
    return body.response ?? 'No grounded answer was returned.';
  }
}
