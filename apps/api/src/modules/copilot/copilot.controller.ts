import { Controller, Get, Param } from '@nestjs/common';
import { CopilotService } from './copilot.service';

@Controller('copilot')
export class CopilotController {
  constructor(private readonly copilotService: CopilotService) {}

  @Get('summary/:customerId')
  getSummary(@Param('customerId') customerId: string) {
    return this.copilotService.getSummary(customerId);
  }
}
