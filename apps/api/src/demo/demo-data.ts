export type DemoRole = 'RM' | 'Manager' | 'Operations' | 'Auditor';

export interface DemoUser {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: DemoRole;
  branch: string;
  portfolio: string[] | null;
}

export interface DemoCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  segment: string;
  kyc: string;
  riskFlag: string;
  address: string;
  consent: { marketing: boolean; dataSharing: boolean; updatedOn: string };
  accounts: Array<Record<string, string | number>>;
  loans: Array<Record<string, string | number>>;
  cards: Array<Record<string, string | number>>;
  transactions: Array<Record<string, string | number>>;
  interactions: Array<Record<string, string>>;
  serviceRequests: Array<Record<string, unknown>>;
}

export const DEMO_USERS: DemoUser[] = [
  { id: 'u1', username: 'r.mehta', password: 'rm123', name: 'Rohan Mehta', role: 'RM', branch: 'Banjara Hills, Hyderabad', portfolio: ['CU10231', 'CU10245', 'CU10262'] },
  { id: 'u2', username: 's.iyer', password: 'manager123', name: 'Sanjana Iyer', role: 'Manager', branch: 'Hyderabad Cluster', portfolio: null },
  { id: 'u3', username: 'k.das', password: 'operations123', name: 'Kabir Das', role: 'Operations', branch: 'Central Ops, Chennai', portfolio: null },
  { id: 'u4', username: 'p.singh', password: 'auditor123', name: 'Priya Singh', role: 'Auditor', branch: 'Group Compliance', portfolio: null },
];

const transaction = (date: string, description: string, amount: number, type: string, balanceAfter: number) => ({ date, description, amount, type, balanceAfter });

export const DEMO_CUSTOMERS: DemoCustomer[] = [
  {
    id: 'CU10231', name: 'Ananya Rao', email: 'ananya.rao@personalmail.in', phone: '+91 98765 43210', segment: 'Premium', kyc: 'Verified', riskFlag: 'Low',
    address: 'Flat 402, Manasarovar Residency, Banjara Hills, Hyderabad',
    consent: { marketing: true, dataSharing: true, updatedOn: '2026-02-11' },
    accounts: [
      { id: 'AC-7741', type: 'Savings', balance: 842300, status: 'Active' },
      { id: 'AC-7742', type: 'Current', balance: 125000, status: 'Active' },
    ],
    loans: [{ id: 'LN-3301', type: 'Home Loan', outstanding: 3120000, emi: 38500, missedEmis: 1, status: 'Active' }],
    cards: [{ id: 'CD-9010', type: 'Platinum Credit Card', maskedNumber: '4111 11•• •••• 1111', limit: 500000, used: 352000, status: 'Active' }],
    transactions: [
      transaction('2026-08-28', 'Salary credit - Meridian Tech Pvt Ltd', 185000, 'credit', 842300),
      transaction('2026-08-24', 'EMI debit - Home Loan LN-3301', -38500, 'debit', 657300),
      transaction('2026-07-24', 'EMI debit - Home Loan LN-3301 - BOUNCED', 0, 'failed', 553240),
    ],
    interactions: [{ date: '2026-08-20', rm: 'Rohan Mehta', channel: 'Call', notes: 'Discussed the bounced July EMI.' }],
    serviceRequests: [{ id: 'SR-5581', type: 'Credit limit increase request', status: 'open', assignedTo: 'Rohan Mehta', createdAt: '2026-08-25' }],
  },
  {
    id: 'CU10245', name: 'Vikram Suresh Nair', email: 'vikram.nair@workmail.com', phone: '+91 90000 12233', segment: 'Regular', kyc: 'Verified', riskFlag: 'Medium',
    address: '12-4-88, Kukatpally, Hyderabad', consent: { marketing: false, dataSharing: true, updatedOn: '2025-11-03' },
    accounts: [{ id: 'AC-6620', type: 'Savings', balance: 41200, status: 'Active' }],
    loans: [{ id: 'LN-4410', type: 'Personal Loan', outstanding: 210000, emi: 12500, missedEmis: 3, status: 'Active' }],
    cards: [{ id: 'CD-9044', type: 'Classic Credit Card', maskedNumber: '5241 88•• •••• 7742', limit: 80000, used: 76500, status: 'Active' }],
    transactions: [transaction('2026-08-05', 'EMI debit - Personal Loan - BOUNCED', 0, 'failed', 4200)],
    interactions: [{ date: '2026-08-06', rm: 'Rohan Mehta', channel: 'Call', notes: 'Attempted contact regarding missed EMI.' }],
    serviceRequests: [{ id: 'SR-5502', type: 'EMI hardship / restructure enquiry', status: 'in_progress', assignedTo: 'Kabir Das', createdAt: '2026-07-09' }],
  },
  {
    id: 'CU10262', name: 'Fatima Sheikh', email: 'fatima.sheikh@mailbox.io', phone: '+91 91234 56780', segment: 'Premium', kyc: 'Verified', riskFlag: 'Low',
    address: 'Villa 7, Lakeview Enclave, Gachibowli, Hyderabad', consent: { marketing: true, dataSharing: false, updatedOn: '2026-01-20' },
    accounts: [{ id: 'AC-8891', type: 'Savings', balance: 1520000, status: 'Active' }, { id: 'AC-8892', type: 'NRE Savings', balance: 640000, status: 'Active' }],
    loans: [], cards: [{ id: 'CD-9102', type: 'Signature Credit Card', maskedNumber: '4000 55•• •••• 2200', limit: 1000000, used: 98000, status: 'Active' }],
    transactions: [transaction('2026-08-29', 'Dividend credit - mutual fund folio', 34000, 'credit', 1520000)],
    interactions: [{ date: '2026-08-16', rm: 'Rohan Mehta', channel: 'Branch visit', notes: 'Discussed wealth management consultation.' }], serviceRequests: [],
  },
  {
    id: 'CU10310', name: 'Deepak Chandrasekaran', email: 'd.chandra@freelance.net', phone: '+91 99887 66554', segment: 'Regular', kyc: 'Pending', riskFlag: 'High',
    address: 'Plot 22, Ameerpet, Hyderabad', consent: { marketing: false, dataSharing: false, updatedOn: '2026-08-01' },
    accounts: [{ id: 'AC-5510', type: 'Savings', balance: 3200, status: 'Active' }],
    loans: [{ id: 'LN-5501', type: 'Personal Loan', outstanding: 138000, emi: 7200, missedEmis: 4, status: 'Active' }], cards: [],
    transactions: [transaction('2026-08-05', 'EMI debit - Personal Loan - BOUNCED', 0, 'failed', -11800)], interactions: [],
    serviceRequests: [{ id: 'SR-5610', type: 'Delinquency review', status: 'open', assignedTo: 'Kabir Das', createdAt: '2026-08-12' }],
  },
];
