import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { KeycloakGuard } from '../auth/keycloak.guard';
import { SearchCustomerDto } from './dto/search-customer.dto';
import { CustomersService } from './customers.service';

@Controller('customers')
@UseGuards(KeycloakGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  search(@Query() queryDto: SearchCustomerDto) {
    return this.customersService.search(queryDto.q ?? '');
  }

  @Get(':id')
  profile(@Param('id') id: string) {
    return this.customersService.profile(id);
  }
}
