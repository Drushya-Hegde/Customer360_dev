import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(@Query('user') user?: string, @Query('action') action?: string) {
    return this.auditService.findAll(user, action);
  }
}
