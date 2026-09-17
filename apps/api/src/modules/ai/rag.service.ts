import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { OllamaService } from './ollama.service';

export interface RagCitation {
  sourceId: string;
  sourceType: string;
}

@Injectable()
export class RagService {
  constructor(
    @Inject('POSTGRES_POOL') private readonly pool: Pool,
    private readonly ollama: OllamaService,
  ) {}

  async answer(customerId: string, question: string, queryEmbedding: number[]): Promise<{ answer: string; citations: RagCitation[] }> {
    const result = await this.pool.query<{ source_id: string; source_type: string; content: string }>(
      `SELECT source_id, source_type, content
       FROM customer_embedding
       WHERE customer_id = $1
       ORDER BY embedding <=> $2::vector
       LIMIT 6`,
      [customerId, `[${queryEmbedding.join(',')}]`],
    );

    const context = result.rows.map((row) => `[${row.source_id}] ${row.content}`).join('\n');
    const answer = await this.ollama.groundedAnswer(context, question);

    return {
      answer,
      citations: result.rows.map((row) => ({ sourceId: row.source_id, sourceType: row.source_type })),
    };
  }
}
