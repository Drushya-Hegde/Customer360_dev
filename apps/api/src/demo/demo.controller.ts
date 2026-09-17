import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { DemoService } from './demo.service';

type DemoRequest = { headers: { authorization?: string } };

@Controller()
export class DemoController {
  constructor(private readonly demo: DemoService) {}

  @Get('auth/users') users() { return this.demo.users(); }

  @Post('auth/login') login(@Body() body: { userId?: string; password?: string }) { return this.demo.login(body.userId ?? '', body.password ?? ''); }

  @Get('customers') customers(@Req() request: DemoRequest, @Query('q') query = '') { return this.demo.search(query, this.user(request)); }
  @Get('customers/:customerId') customer(@Req() request: DemoRequest, @Param('customerId') id: string) { return this.demo.profile(id, this.user(request)); }
  @Get('customers/:customerId/accounts') accounts(@Req() request: DemoRequest, @Param('customerId') id: string) { return this.demo.related(id, 'accounts', this.user(request)); }
  @Get('customers/:customerId/loans') loans(@Req() request: DemoRequest, @Param('customerId') id: string) { return this.demo.related(id, 'loans', this.user(request)); }
  @Get('customers/:customerId/cards') cards(@Req() request: DemoRequest, @Param('customerId') id: string) { return this.demo.related(id, 'cards', this.user(request)); }
  @Get('customers/:customerId/transactions') transactions(@Req() request: DemoRequest, @Param('customerId') id: string) { return this.demo.related(id, 'transactions', this.user(request)); }
  @Get('customers/:customerId/interactions') interactions(@Req() request: DemoRequest, @Param('customerId') id: string) { return this.demo.related(id, 'interactions', this.user(request)); }
  @Get('service-requests') serviceRequests(@Req() request: DemoRequest) { return this.demo.serviceRequests(this.user(request)); }
  @Get('dashboard/summary') dashboard(@Req() request: DemoRequest) { this.user(request); return this.demo.dashboard(); }
  @Get('audit') audit(@Req() request: DemoRequest) { this.user(request); return this.demo.auditLog(); }

  @Post('customers/:customerId/interactions') interaction(@Req() request: DemoRequest, @Param('customerId') id: string, @Body() body: { channel?: string; notes?: string }) {
    const user = this.user(request);
    const interactions = this.demo.related(id, 'interactions', user) as Array<Record<string, string>>;
    const entry = { date: new Date().toISOString().slice(0, 10), rm: user.name, channel: body.channel ?? 'Call', notes: body.notes ?? '' };
    interactions.unshift(entry);
    return entry;
  }

  @Post('customers/:customerId/ai/summary') summary(@Req() request: DemoRequest, @Param('customerId') id: string) {
    const user = this.user(request); const customer = this.demo.profile(id, user) as Record<string, unknown>;
    return { text: `${customer.name} is a ${customer.segment} customer with ${customer.riskFlag?.toString().toLowerCase()} risk and ${customer.openServiceRequests} open service request(s).`, groundedIn: ['customers', 'serviceRequests'] };
  }

  @Post('customers/:customerId/ai/chat') chat(@Req() request: DemoRequest, @Param('customerId') id: string, @Body() body: { question?: string }) {
    const user = this.user(request); const loans = this.demo.related(id, 'loans', user) as Array<Record<string, string | number>>; const missed = loans.reduce((sum, loan) => sum + Number(loan.missedEmis ?? 0), 0);
    const question = body.question?.toLowerCase() ?? '';
    return question.includes('payment') || question.includes('emi') || question.includes('missed') ? { answer: missed ? `Yes, the customer has ${missed} missed EMI payment(s).` : 'No missed EMI payments are recorded.', citations: ['loans', 'transactions'] } : { answer: 'Ask about payments, EMIs, balances, or recent interactions.', citations: [] };
  }

  @Patch('service-requests/:requestId') updateRequest(@Req() request: DemoRequest, @Param('requestId') requestId: string, @Body() body: { status?: string }) {
    const user = this.user(request); const requests = this.demo.serviceRequests(user) as Array<Record<string, unknown>>; const requestRow = requests.find((candidate) => candidate.id === requestId); return { ...requestRow, status: body.status ?? requestRow?.status };
  }

  private user(request: DemoRequest) { return this.demo.userFromToken(request.headers.authorization?.replace(/^Bearer\s+/i, '')); }
}
