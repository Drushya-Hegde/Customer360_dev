import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { CustomerSummary } from '../../../types';

@Injectable()
export class CustomerRepository {
  constructor(@Inject('POSTGRES_POOL') private readonly pool: Pool) {}

  async search(query: string): Promise<CustomerSummary[]> {
    const pattern = `%${query}%`;
    const result = await this.pool.query<CustomerSummary>(
      `SELECT id, name, email, phone, segment, risk_flag AS "riskFlag", 0 AS "openServiceRequests"
       FROM customer
       WHERE name ILIKE $1 OR id ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1
       ORDER BY name
       LIMIT 50`,
      [pattern]
    );

    return result.rows;
  }

  async profile(id: string) {
    const result = await this.pool.query<CustomerSummary>(
      `SELECT id, name, email, phone, segment, risk_flag AS "riskFlag", 0 AS "openServiceRequests"
       FROM customer WHERE id = $1 LIMIT 1`,
      [id]
    );

    const customer = result.rows[0];
    if (!customer) {
      return null;
    }

    return {
      ...customer,
      address: 'Plot 18, Jubilee Hills, Hyderabad, Telangana',
      kyc: 'Verified',
      consent: { marketing: true, dataSharing: true, updatedOn: '2026-08-12' },
      assignedRm: 'Rohan Mehta',
    };
  }
}
