import { Injectable } from '@nestjs/common';
import type { ServiceRequestContract, ServiceRequestStatus } from '../../../../../packages/contracts';

@Injectable()
export class ServiceRequestsService {
  async findAll(status?: ServiceRequestStatus) {
    const items: ServiceRequestContract[] = [
      { id: 'SR-1001', customerId: 'C-1001', status: 'open', type: 'Billing inquiry' },
      { id: 'SR-1002', customerId: 'C-1002', status: 'in_progress', type: 'Credit review' },
      { id: 'SR-1003', customerId: 'C-1003', status: 'closed', type: 'Account update' },
    ];

    const filtered = status ? items.filter((item) => item.status === status) : items;

    return {
      items: filtered,
      total: filtered.length,
      statusFilter: status ?? null,
    };
  }
}
