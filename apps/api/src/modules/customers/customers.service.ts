import { Injectable } from '@nestjs/common';
import type { CustomerSummaryContract } from '../../../../../packages/contracts';
import { CustomerRepository } from './repositories/customer.repository';

@Injectable()
export class CustomersService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async search(query: string): Promise<CustomerSummaryContract[]> {
    return this.customerRepository.search(query);
  }

  async profile(id: string) {
    return this.customerRepository.profile(id);
  }
}
