import { Routes } from '@angular/router';
import { AuditPage, CopilotPage, CustomerProfilePage, CustomersPage, DashboardPage, RequestsPage } from './pages';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardPage },
  { path: 'customers', component: CustomersPage },
  { path: 'customers/:id', component: CustomerProfilePage },
  { path: 'copilot', component: CopilotPage },
  { path: 'copilot/:id', component: CopilotPage },
  { path: 'requests', component: RequestsPage },
  { path: 'audit', component: AuditPage },
  { path: '**', redirectTo: 'dashboard' }
];
