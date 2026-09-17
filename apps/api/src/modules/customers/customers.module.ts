import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerRepository } from './repositories/customer.repository';

@Module({
  controllers: [CustomersController],
  providers: [CustomerRepository, CustomersService],
  exports: [CustomerRepository, CustomersService],
})
export class CustomersModule {}
