export type UserRole = 'RM' | 'Manager' | 'Operations' | 'Auditor';

export interface CurrentUser { id: string; name: string; role: UserRole; branch: string; }
export interface CustomerSummary { id: string; name: string; email: string; phone: string; segment: string; riskFlag: string; openServiceRequests: number; }
export interface CustomerProfile extends CustomerSummary { address: string; kyc: string; consent: { marketing: boolean; dataSharing: boolean; updatedOn: string }; assignedRm: string | null; }
