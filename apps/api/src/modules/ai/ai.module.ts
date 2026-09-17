import { Module } from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { RagService } from './rag.service';

@Module({
  providers: [OllamaService, RagService],
  exports: [OllamaService, RagService],
})
export class AiModule {}
