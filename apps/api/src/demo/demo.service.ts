import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DEMO_CUSTOMERS, DEMO_USERS, DemoCustomer, DemoRole, DemoUser } from './demo-data';

export interface DemoSessionUser extends DemoUser { token: string }

@Injectable()
export class DemoService {
  private readonly sessions = new Map<string, DemoSessionUser>();
  private readonly audit: Array<Record<string, string>> = [];

  users(): DemoUser[] {
    return DEMO_USERS.map(({ id, username, name, role, branch }) => ({ id, username, name, role, branch, portfolio: null }));
  }

  login(userId: string, password: string): { token: string; user: DemoUser } {
    const user = DEMO_USERS.find((candidate) => candidate.id === userId || candidate.username === userId);
    if (!user || user.password !== password) throw new UnauthorizedException('Invalid username or password');
    const token = `demo-token-${user.id}-${Date.now()}`;
    this.sessions.set(token, { ...user, token });
    this.record(user, 'LOGIN', `Signed in as ${user.role}`);
    const { password: _password, ...safeUser } = user;
    return { token, user: safeUser };
  }

  userFromToken(token?: string): DemoSessionUser {
    const user = token ? this.sessions.get(token) : undefined;
    if (!user) throw new UnauthorizedException('Missing or invalid demo token');
    return user;
  }

  search(query: string, user: DemoUser): Array<Record<string, unknown>> {
    const normalized = query.toLowerCase();
    return this.viewableCustomers(user)
      .filter((customer) => !normalized || [customer.name, customer.id, customer.email, customer.phone].join(' ').toLowerCase().includes(normalized))
      .map((customer) => this.summary(customer, user));
  }

  profile(id: string, user: DemoUser): Record<string, unknown> {
    const customer = this.customer(id);
    this.assertViewable(customer, user);
    this.record(user, 'VIEW_PROFILE', `Opened profile ${id}`);
    return { ...this.summary(customer, user), address: user.role === 'RM' && user.portfolio?.includes(id) ? customer.address : '•••• (masked for your role)', kyc: customer.kyc, consent: customer.consent, assignedRm: 'Rohan Mehta' };
  }

  related(id: string, property: keyof DemoCustomer, user: DemoUser): unknown {
    const customer = this.customer(id);
    this.assertViewable(customer, user);
    return customer[property];
  }

  serviceRequests(user: DemoUser): unknown[] {
    return this.viewableCustomers(user).flatMap((customer) => customer.serviceRequests.map((request) => ({ ...request, customerId: customer.id, customerName: customer.name })));
  }

  dashboard(): Record<string, unknown> {
    const requests = DEMO_CUSTOMERS.flatMap((customer) => customer.serviceRequests);
    return { customerCount: DEMO_CUSTOMERS.length, totalBalance: DEMO_CUSTOMERS.reduce((sum, customer) => sum + customer.accounts.reduce((inner, account) => inner + Number(account.balance), 0), 0), serviceRequestsByStatus: { open: requests.filter((r) => r.status === 'open').length, in_progress: requests.filter((r) => r.status === 'in_progress').length, closed: requests.filter((r) => r.status === 'closed').length } };
  }

  auditLog(): Array<Record<string, string>> { return this.audit; }

  private customer(id: string): DemoCustomer { const customer = DEMO_CUSTOMERS.find((candidate) => candidate.id === id); if (!customer) throw new NotFoundException('Customer not found'); return customer; }
  private viewableCustomers(user: DemoUser): DemoCustomer[] { return user.role === 'RM' ? DEMO_CUSTOMERS.filter((customer) => user.portfolio?.includes(customer.id)) : DEMO_CUSTOMERS; }
  private assertViewable(customer: DemoCustomer, user: DemoUser): void { if (!this.viewableCustomers(user).some((candidate) => candidate.id === customer.id)) throw new UnauthorizedException('Customer is outside your portfolio'); }
  private summary(customer: DemoCustomer, user: DemoUser): Record<string, unknown> { const full = user.role === 'RM' && user.portfolio?.includes(customer.id); return { id: customer.id, name: customer.name, email: full ? customer.email : this.maskEmail(customer.email), phone: full ? customer.phone : '••••••', segment: customer.segment, riskFlag: customer.riskFlag, openServiceRequests: customer.serviceRequests.filter((request) => request.status !== 'closed').length }; }
  private maskEmail(email: string): string { const [name, domain] = email.split('@'); return `${name[0]}•••@${domain}`; }
  private record(user: DemoUser, action: string, details: string): void { this.audit.unshift({ ts: new Date().toISOString(), user: user.name, role: user.role, action, details }); }
}
