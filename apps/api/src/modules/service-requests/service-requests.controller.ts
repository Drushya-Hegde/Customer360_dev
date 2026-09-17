import { Controller, Get, Query } from '@nestjs/common';
import type { ServiceRequestStatus } from '../../../../../packages/contracts';
import { ServiceRequestsService } from './service-requests.service';

@Controller('service-requests')
export class ServiceRequestsController {
  constructor(private readonly serviceRequestsService: ServiceRequestsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    const validStatus = status && ['open', 'in_progress', 'closed'].includes(status)
      ? (status as ServiceRequestStatus)
      : undefined;

    return this.serviceRequestsService.findAll(validStatus);
  }
}
