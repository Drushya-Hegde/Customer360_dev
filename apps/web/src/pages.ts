import { AsyncPipe, NgFor, NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { debounceTime, distinctUntilChanged, shareReplay, startWith, switchMap } from 'rxjs';
import { CustomerApiService } from './core/customer-api.service';
import { CustomerSummary } from './core/models';

@Component({
  standalone: true,
  imports: [MatProgressBarModule, RouterLink],
  template: `
    <section class="page-intro"><div><p class="eyebrow">PORTFOLIO / AUG 2026</p><h1>Good relationships start with the right signal.</h1><p class="lede">A focused view of the customers, risks, and follow-ups that need your attention today.</p></div><div class="orbit"><strong>360</strong><span>VIEW</span></div></section>
    <section class="metric-grid"><div class="metric"><span>Customers in book</span><strong>3</strong><small>All relationship-owned</small></div><div class="metric warm"><span>Open requests</span><strong>4</strong><small>Needs follow-through</small></div><div class="metric mint"><span>Portfolio health</span><strong>82%</strong><mat-progress-bar mode="determinate" value="82"></mat-progress-bar></div></section>
    <section class="quick-grid"><a class="quick-link" routerLink="/customers"><span class="quick-number">01</span><strong>Find a customer</strong><small>Search the relationship book</small><span>→</span></a><a class="quick-link" routerLink="/requests"><span class="quick-number">02</span><strong>Work the queue</strong><small>Review open service requests</small><span>→</span></a><a class="quick-link dark" routerLink="/copilot"><span class="quick-number">03</span><strong>Open Copilot</strong><small>Turn context into action</small><span>→</span></a></section>
  `
})
export class DashboardPage {}

@Component({
  standalone: true,
  imports: [AsyncPipe, NgFor, ReactiveFormsModule, MatFormFieldModule, MatInputModule, RouterLink],
  template: `
    <div class="page-title"><div><p class="eyebrow">CUSTOMER DIRECTORY</p><h1>Search the relationship book</h1><p class="lede">Find a customer by name, ID, email, or phone.</p></div><span class="page-count">{{ (customers$ | async)?.length || 0 }} visible</span></div>
    <mat-form-field appearance="outline" class="wide-search"><mat-label>Name, ID, email, or phone</mat-label><input matInput [formControl]="query"></mat-form-field>
    <div class="customer-list"><a class="customer-row" *ngFor="let customer of customers$ | async" [routerLink]="['/customers', customer.id]"><div class="customer-initials">{{ customer.name.slice(0, 2).toUpperCase() }}</div><div class="customer-main"><strong>{{ customer.name }}</strong><span>{{ customer.id }} · {{ customer.email }}</span></div><span class="tag">{{ customer.segment }}</span><span class="risk" [class.medium]="customer.riskFlag === 'Medium'">{{ customer.riskFlag }} risk</span><div class="request-count"><strong>{{ customer.openServiceRequests }}</strong><small>open requests</small></div><span class="row-arrow">→</span></a></div>
  `
})
export class CustomersPage {
  private readonly api = inject(CustomerApiService);
  readonly query = new FormControl('', { nonNullable: true });
  readonly customers$ = this.query.valueChanges.pipe(startWith(''), debounceTime(150), distinctUntilChanged(), switchMap((query) => this.api.search(query)), shareReplay(1));
}

@Component({
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, NgSwitch, NgSwitchCase, RouterLink],
  template: `
    <ng-container *ngIf="customer$ | async as customer">
      <div class="profile-header"><a routerLink="/customers" class="back-link">← Customer directory</a><div class="profile-heading"><div class="detail-avatar">{{ customer.name.slice(0, 2).toUpperCase() }}</div><div><p class="eyebrow">CUSTOMER 360 / {{ customer.id }}</p><h1>{{ customer.name }}</h1><p class="lede">{{ customer.segment }} segment · {{ customer.email }} · {{ customer.phone }}</p></div><a class="copilot-button" [routerLink]="['/copilot', customer.id]">Open Copilot →</a></div></div>
      <nav class="profile-nav"><a *ngFor="let tab of tabs" [class.active]="activeTab === tab.key" [routerLink]="['/customers', customer.id]" [queryParams]="{ tab: tab.key }">{{ tab.label }}</a></nav>
      <section class="profile-layout"><div class="profile-main" [ngSwitch]="activeTab"><div *ngSwitchCase="'info'" class="info-grid"><article><span>Contact</span><strong>{{ customer.email }}<br>{{ customer.phone }}</strong></article><article><span>Address</span><strong>Plot 18, Jubilee Hills<br>Hyderabad, Telangana</strong></article><article><span>KYC status</span><strong class="positive">● Verified</strong></article><article><span>Risk posture</span><strong>{{ customer.riskFlag }} risk</strong></article></div><div *ngSwitchCase="'accounts'"><h2>Accounts</h2><div class="data-line"><span>Primary savings · **** 4821</span><strong>₹12.8L</strong></div><div class="data-line"><span>Current account · **** 1904</span><strong>₹5.6L</strong></div></div><div *ngSwitchCase="'cards'"><h2>Cards</h2><div class="data-line"><span>Platinum credit card · **** 7762</span><strong>34% utilised</strong></div><div class="data-line"><span>Payment due</span><strong>28 Aug 2026</strong></div></div><div *ngSwitchCase="'loans'"><h2>Loans</h2><div class="data-line"><span>Home loan · repayment on track</span><strong>₹42.6L outstanding</strong></div><div class="data-line"><span>Next EMI</span><strong>₹38,450 · 05 Sep</strong></div></div><div *ngSwitchCase="'transactions'"><h2>Transactions</h2><div class="data-line"><span>14 Aug · Transfer received</span><strong class="positive">+₹1.2L</strong></div><div class="data-line"><span>12 Aug · Card purchase</span><strong>-₹8,420</strong></div></div><div *ngSwitchCase="'interactions'"><h2>Interactions</h2><div class="timeline"><strong>12 Aug 2026 · Relationship review</strong><span>RM call · Renewal discussion scheduled</span></div><div class="timeline"><strong>06 Aug 2026 · Service follow-up</strong><span>Email · Billing inquiry acknowledged</span></div></div><div *ngSwitchCase="'requests'"><h2>Service requests</h2><div class="data-line"><span>SR-1001 · Billing inquiry</span><strong class="risk-text">Open</strong></div><div class="data-line"><span>Owner · SLA</span><strong>Operations · 2 days</strong></div></div></div><aside class="profile-aside"><p class="eyebrow">RELATIONSHIP SIGNAL</p><strong class="signal-score">82</strong><span>portfolio health</span><hr><p>{{ customer.openServiceRequests }} open service requests need follow-through.</p><a class="text-link" [routerLink]="['/copilot', customer.id]">Ask Copilot about this customer →</a></aside></section>
    </ng-container>
  `
})
export class CustomerProfilePage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CustomerApiService);
  readonly tabs = [{ key: 'info', label: 'Customer information' }, { key: 'accounts', label: 'Accounts' }, { key: 'cards', label: 'Cards' }, { key: 'loans', label: 'Loans' }, { key: 'transactions', label: 'Transactions' }, { key: 'interactions', label: 'Interactions' }, { key: 'requests', label: 'Service requests' }];
  readonly activeTab = this.route.snapshot.queryParamMap.get('tab') ?? 'info';
  readonly customer$ = this.route.paramMap.pipe(switchMap((params) => this.api.profile(params.get('id') ?? '')));
}

@Component({
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  template: `
    <div class="page-title"><div><p class="eyebrow">AI COPILOT</p><h1>Context into action.</h1><p class="lede">A governed assistant for customer conversations and service decisions.</p></div><span class="confidence">92% confidence</span></div>
    <div class="copilot-layout"><div class="copilot-menu"><button *ngFor="let item of modes" [class.active]="mode === item" (click)="mode = item">{{ item }}<span>→</span></button></div><section class="copilot-workspace"><p class="eyebrow">{{ mode }}</p><h2>{{ heading }}</h2><p>{{ body }}</p><div *ngIf="mode === 'Ask Customer 360'" class="ask-row"><input [(ngModel)]="question" placeholder="What should I know before my next call?"><button (click)="answer = question ? 'Lead with the open billing request and confirm the preferred follow-up channel.' : 'Ask a question to receive a contextual answer.'">Ask</button></div><p class="answer" *ngIf="answer">{{ answer }}</p><div class="decision-bar"><span>Review recommendation</span><button (click)="decision = 'Accepted'">Accept</button><button (click)="decision = 'Edited'">Edit</button><button class="reject" (click)="decision = 'Rejected'">Reject</button></div><div class="feedback"><span>Was this useful?</span><button (click)="feedback = 'Feedback recorded'">Yes</button><button (click)="feedback = 'Feedback recorded'">No</button><small>{{ feedback }}</small></div></section></div>
  `
})
export class CopilotPage {
  readonly modes = ['Customer summary', 'Ask Customer 360', 'Next best action', 'Product / policy Q&A', 'Service assistant'];
  mode = this.modes[0]; question = ''; answer = ''; decision = ''; feedback = '';
  get heading(): string { return this.mode === 'Next best action' ? 'Review the open request, then offer a renewal discussion.' : this.mode; }
  get body(): string { return this.mode === 'Customer summary' ? 'Active relationship with strong repayment behavior and a recent billing review request.' : this.mode === 'Service assistant' ? 'Draft a clear response to the customer and keep the SLA visible.' : 'Use customer context, policy, and audit history together before taking action.'; }
}

@Component({
  standalone: true,
  imports: [NgFor, RouterLink],
  template: `<div class="page-title"><div><p class="eyebrow">OPERATIONS / SERVICE QUEUE</p><h1>Service requests</h1><p class="lede">Keep customer follow-through visible and accountable.</p></div><span class="page-count">4 open</span></div><div class="request-list"><a *ngFor="let request of requests" class="request-card" [routerLink]="['/customers', request.customerId]"><div><span class="request-id">{{ request.id }}</span><h2>{{ request.type }}</h2><p>{{ request.customer }}</p></div><span class="request-status">{{ request.status }}</span><span>→</span></a></div>`
})
export class RequestsPage { requests = [{ id: 'SR-1001', type: 'Billing inquiry', customer: 'Ananya Rao · CU10231', customerId: 'CU10231', status: 'Open' }, { id: 'SR-1002', type: 'Card payment review', customer: 'Vikram Suresh Nair · CU10245', customerId: 'CU10245', status: 'In progress' }, { id: 'SR-1003', type: 'Address update', customer: 'Fatima Sheikh · CU10262', customerId: 'CU10262', status: 'Open' }]; }

@Component({
  standalone: true,
  template: `<div class="page-title"><div><p class="eyebrow">COMPLIANCE / AUDIT</p><h1>Audit history</h1><p class="lede">Review access and decision activity across the customer workspace.</p></div><span class="page-count">Live log</span></div><div class="request-list"><article class="request-card"><div><span class="request-id">ACCESS</span><h2>Customer profile activity</h2><p>Search, profile, and workflow events are recorded by the API.</p></div><span class="request-status">Tracked</span></article><article class="request-card"><div><span class="request-id">AI DECISIONS</span><h2>Copilot recommendations</h2><p>Generated suggestions and human decisions remain attributable to a role.</p></div><span class="request-status">Tracked</span></article></div>`
})
export class AuditPage {}
