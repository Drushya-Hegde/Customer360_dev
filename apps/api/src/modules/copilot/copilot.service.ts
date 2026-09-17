import { Injectable } from '@nestjs/common';

@Injectable()
export class CopilotService {
  async getSummary(customerId: string) {
    return {
      customerId,
      summary: 'Customer is active with strong repayment behavior and a recent service request on billing review.',
      confidence: 0.92,
      suggestedActions: ['Review recent transaction anomalies', 'Offer renewal discussion', 'Share portfolio risk summary'],
    };
  }
}
