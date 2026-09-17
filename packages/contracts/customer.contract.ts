export interface CustomerSummaryContract {
  id: string;
  name: string;
  email: string;
  phone: string;
  segment: string;
  riskFlag: string;
  openServiceRequests: number;
}

export interface CustomerSearchRequest {
  q?: string;
}
