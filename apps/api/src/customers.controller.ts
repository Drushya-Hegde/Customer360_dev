import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CustomerRepository } from './repositories/customer.repository';
import { KeycloakGuard } from './security/keycloak.guard';

@Controller('customers')
@UseGuards(KeycloakGuard)
export class CustomersController {
  constructor(private readonly customers: CustomerRepository) {}

  @Get()
  search(@Query('q') query = '') {
    return this.customers.search(query);
  }
}
