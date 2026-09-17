import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health(): { status: string; services: string[] } {
    return { status: 'ok', services: ['postgres-pgvector', 'mongodb', 'keycloak', 'ollama', 'opentelemetry'] };
  }
}
