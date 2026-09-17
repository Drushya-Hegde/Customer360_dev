// In-memory mock data — same shape the real DB will hold once
// backend hooks schema.sql up behind these same endpoints.

const USERS = [
  { id: 'u1', username: 'r.mehta', password: 'rm123', name: 'Rohan Mehta', role: 'RM', branch: 'Banjara Hills, Hyderabad', portfolio: ['CU10231', 'CU10245', 'CU10262', 'CU10310'] },
  { id: 'u2', username: 's.iyer', password: 'manager123', name: 'Sanjana Iyer', role: 'Manager', branch: 'Hyderabad Cluster', portfolio: null },
  { id: 'u3', username: 'k.das', password: 'operations123', name: 'Kabir Das', role: 'Operations', branch: 'Central Ops, Chennai', portfolio: null },
  { id: 'u4', username: 'p.singh', password: 'auditor123', name: 'Priya Singh', role: 'Auditor', branch: 'Group Compliance', portfolio: null },
];

function txn(date, description, amount, type, balanceAfter) {
  return { date, description, amount, type, balanceAfter };
}

const CUSTOMERS = [
  {
    id: 'CU10231', name: 'Ananya Rao', email: 'ananya.rao@personalmail.in', phone: '+91 98765 43210',
    segment: 'Premium', kyc: 'Verified', riskFlag: 'Low',
    consent: { marketing: true, dataSharing: true, updatedOn: '2026-02-11' },
    address: 'Flat 402, Manasarovar Residency, Banjara Hills, Hyderabad',
    accounts: [
      { id: 'AC-7741', type: 'Savings', balance: 842300, status: 'Active', opened: '2019-03-14' },
      { id: 'AC-7742', type: 'Current', balance: 125000, status: 'Active', opened: '2021-07-02' },
    ],
    loans: [
      { id: 'LN-3301', type: 'Home Loan', principal: 4500000, outstanding: 3120000, emi: 38500, missedEmis: 1, status: 'Active' },
    ],
    cards: [
      { id: 'CD-9010', type: 'Platinum Credit Card', maskedNumber: '4111 11•• •••• 1111', limit: 500000, used: 352000, status: 'Active' },
    ],
    transactions: [
      txn('2026-08-28', 'Salary credit — Meridian Tech Pvt Ltd', 185000, 'credit', 842300),
      txn('2026-08-24', 'EMI debit — Home Loan LN-3301', -38500, 'debit', 657300),
      txn('2026-08-19', 'UPI — Swiggy', -1240, 'debit', 695800),
      txn('2026-08-12', 'Credit card bill payment', -41200, 'debit', 697040),
      txn('2026-07-30', 'Salary credit — Meridian Tech Pvt Ltd', 185000, 'credit', 738240),
      txn('2026-07-24', 'EMI debit — Home Loan LN-3301 — BOUNCED', 0, 'failed', 553240),
      txn('2026-07-05', 'Fixed deposit maturity credit', 220000, 'credit', 553240),
    ],
    interactions: [
      { date: '2026-08-20', rm: 'Rohan Mehta', channel: 'Call', notes: 'Discussed the bounced July EMI. Customer said it was an oversight after switching salary accounts; auto-debit reminder now set up.' },
    ],
    serviceRequests: [
      { id: 'SR-5581', type: 'Credit limit increase request', status: 'open', assignedTo: 'Rohan Mehta', createdAt: '2026-08-25',
        history: [{ ts: '2026-08-25', by: 'Rohan Mehta', note: 'Raised after customer call — utilisation running high most months.' }] },
    ],
  },
  {
    id: 'CU10245', name: 'Vikram Suresh Nair', email: 'vikram.nair@workmail.com', phone: '+91 90000 12233',
    segment: 'Regular', kyc: 'Verified', riskFlag: 'Medium',
    consent: { marketing: false, dataSharing: true, updatedOn: '2025-11-03' },
    address: '12-4-88, Kukatpally, Hyderabad',
    accounts: [{ id: 'AC-6620', type: 'Savings', balance: 41200, status: 'Active', opened: '2017-01-09' }],
    loans: [
      { id: 'LN-4410', type: 'Personal Loan', principal: 300000, outstanding: 210000, emi: 12500, missedEmis: 3, status: 'Active' },
    ],
    cards: [{ id: 'CD-9044', type: 'Classic Credit Card', maskedNumber: '5241 88•• •••• 7742', limit: 80000, used: 76500, status: 'Active' }],
    transactions: [
      txn('2026-08-27', 'ATM withdrawal', -5000, 'debit', 41200),
      txn('2026-08-20', 'Salary credit — Bluewave Logistics', 42000, 'credit', 46200),
      txn('2026-08-05', 'EMI debit — Personal Loan LN-4410 — BOUNCED', 0, 'failed', 4200),
      txn('2026-07-05', 'EMI debit — Personal Loan LN-4410 — BOUNCED', 0, 'failed', 8000),
      txn('2026-06-05', 'EMI debit — Personal Loan LN-4410 — BOUNCED', 0, 'failed', 8000),
    ],
    interactions: [
      { date: '2026-08-06', rm: 'Rohan Mehta', channel: 'Call', notes: 'Attempted contact regarding missed EMI, no answer. SMS reminder sent.' },
      { date: '2026-07-08', rm: 'Rohan Mehta', channel: 'Call', notes: 'Customer mentioned a temporary cash-flow gap after job change; requested two weeks to regularise.' },
    ],
    serviceRequests: [
      { id: 'SR-5502', type: 'EMI hardship / restructure enquiry', status: 'in_progress', assignedTo: 'Kabir Das', createdAt: '2026-07-09',
        history: [
          { ts: '2026-07-09', by: 'Rohan Mehta', note: 'Escalated to Ops for restructure options after customer mentioned job change.' },
          { ts: '2026-07-15', by: 'Kabir Das', note: 'Reviewed eligibility; awaiting updated income proof from customer.' },
        ] },
    ],
  },
  {
    id: 'CU10262', name: 'Fatima Sheikh', email: 'fatima.sheikh@mailbox.io', phone: '+91 91234 56780',
    segment: 'Premium', kyc: 'Verified', riskFlag: 'Low',
    consent: { marketing: true, dataSharing: false, updatedOn: '2026-01-20' },
    address: 'Villa 7, Lakeview Enclave, Gachibowli, Hyderabad',
    accounts: [
      { id: 'AC-8891', type: 'Savings', balance: 1520000, status: 'Active', opened: '2015-09-01' },
      { id: 'AC-8892', type: 'NRE Savings', balance: 640000, status: 'Active', opened: '2018-02-17' },
    ],
    loans: [],
    cards: [{ id: 'CD-9102', type: 'Signature Credit Card', maskedNumber: '4000 55•• •••• 2200', limit: 1000000, used: 98000, status: 'Active' }],
    transactions: [
      txn('2026-08-29', 'Dividend credit — mutual fund folio', 34000, 'credit', 1520000),
      txn('2026-08-15', 'Large transfer — property advance', -500000, 'debit', 1486000),
      txn('2026-08-01', 'Salary credit — Northbridge Consulting', 310000, 'credit', 1986000),
    ],
    interactions: [
      { date: '2026-08-16', rm: 'Rohan Mehta', channel: 'Branch visit', notes: 'Discussed the property-advance transfer in person; documentation on file. Interested in wealth management consultation.' },
    ],
    serviceRequests: [],
  },
  {
    id: 'CU10310', name: 'Deepak Chandrasekaran', email: 'd.chandra@freelance.net', phone: '+91 99887 66554',
    segment: 'Regular', kyc: 'Pending', riskFlag: 'High',
    consent: { marketing: false, dataSharing: false, updatedOn: '2026-08-01' },
    address: 'Plot 22, Ameerpet, Hyderabad',
    accounts: [{ id: 'AC-5510', type: 'Savings', balance: 3200, status: 'Active', opened: '2023-05-30' }],
    loans: [
      { id: 'LN-5501', type: 'Personal Loan', principal: 150000, outstanding: 138000, emi: 7200, missedEmis: 4, status: 'Active' },
    ],
    cards: [],
    transactions: [
      txn('2026-08-10', 'Cash deposit', 15000, 'credit', 3200),
      txn('2026-08-05', 'EMI debit — Personal Loan LN-5501 — BOUNCED', 0, 'failed', -11800),
      txn('2026-07-05', 'EMI debit — Personal Loan LN-5501 — BOUNCED', 0, 'failed', -4600),
    ],
    interactions: [
      { date: '2026-08-11', rm: 'Rohan Mehta', channel: 'Call', notes: 'No response on three attempts this month. Flagged to collections queue.' },
    ],
    serviceRequests: [
      { id: 'SR-5610', type: 'Delinquency review', status: 'open', assignedTo: 'Kabir Das', createdAt: '2026-08-12',
        history: [{ ts: '2026-08-12', by: 'Rohan Mehta', note: 'Fourth consecutive missed EMI, KYC still pending. Referring to Ops for review.' }] },
    ],
  },
];

const AUDIT_LOG = [];
const AI_INTERACTIONS = []; // { customerId, kind, text, decision, status }
const CHAT_HISTORY = {};    // { customerId: [{role, text}] }

module.exports = { USERS, CUSTOMERS, AUDIT_LOG, AI_INTERACTIONS, CHAT_HISTORY };
