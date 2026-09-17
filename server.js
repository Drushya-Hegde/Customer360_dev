// ============================================================
// DEMO-ONLY LEGACY MOCK SERVER
// This Express server is not the production implementation.
// The real enterprise application lives in apps/api (NestJS)
// and apps/web (Angular). This file is retained only for demo
// workflow validation and local mock testing.
//
// Run:  npm install && npm run start:demo   (defaults to :4000)
// ============================================================

const express = require('express');
const cors = require('cors');
const { USERS, CUSTOMERS, AUDIT_LOG, AI_INTERACTIONS, CHAT_HISTORY } = require('./data');
const {
  startDatabase,
  hydrate,
  persistAudit,
  persistInteraction,
  persistServiceRequest,
  persistServiceRequestStatus,
  persistAiInteraction,
  persistAiDecision,
  persistContactPlanStatus,
} = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 4000;
const KEYCLOAK_TOKEN_URL = process.env.KEYCLOAK_TOKEN_URL || 'http://keycloak:8080/realms/customer360/protocol/openid-connect/token';
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'customer360-web';
const KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER || 'http://localhost:8080/realms/customer360';

// ---------------- fake session store (real backend: JWT/OIDC) ----------------
const SESSIONS = {}; // token -> user

function decodeJwtPayload(token) {
  const payload = token?.split('.')[1];
  if (!payload) throw new Error('Missing Keycloak token claims');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

function logAudit(user, action, details) {
  AUDIT_LOG.unshift({ ts: new Date().toISOString(), user: user ? user.name : 'system', role: user ? user.role : '-', action, details: details || '' });
  if (user) persistAudit(user, action, details).catch((error) => console.error('Unable to persist audit event', error.message));
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = token && SESSIONS[token];
  if (!user) return res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid token' });
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden', message: `Role ${req.user.role} cannot access this resource` });
    }
    next();
  };
}

function getCustomerOr404(req, res) {
  const c = CUSTOMERS.find(c => c.id === req.params.customerId);
  if (!c) { res.status(404).json({ error: 'not_found', message: 'Customer not found' }); return null; }
  return c;
}

function getViewableCustomer(req, res) {
  const c = getCustomerOr404(req, res);
  if (!c) return null;
  if (!canViewCustomer(req.user, c.id)) {
    res.status(403).json({ error: 'forbidden', message: 'Not in your portfolio' });
    return null;
  }
  return c;
}

// Every customer has exactly one owning RM. RM/Ops can act on any SR they're
// assigned, but full unmasked contact detail is only for the assigned RM.
function isAssignedRm(user, customerId) {
  return user.role === 'RM' && user.portfolio.includes(customerId);
}
function canViewCustomer(user, customerId) {
  if (user.role === 'RM') return user.portfolio.includes(customerId);
  return true; // Manager / Operations / Auditor see the whole book, masked
}

function maskPhone(phone) {
  const parts = phone.split(' ');
  if (parts.length < 3) return '••••••';
  return `${parts[0]} ${parts[1].slice(0, 2)}•••  ••${parts[2].slice(-2)}`;
}
function maskEmail(email) {
  const [n, d] = email.split('@');
  return `${n[0]}${'•'.repeat(Math.max(2, n.length - 1))}@${d}`;
}

function toCustomerSummary(c, user) {
  const full = isAssignedRm(user, c.id);
  const lastInteraction = c.interactions[0]?.date || null;
  return {
    id: c.id, name: c.name,
    email: full ? c.email : maskEmail(c.email),
    phone: full ? c.phone : maskPhone(c.phone),
    segment: c.segment, riskFlag: c.riskFlag,
    openServiceRequests: c.serviceRequests.filter(s => s.status !== 'closed').length,
    lastActivity: lastInteraction,
  };
}
function toCustomerProfile(c, user) {
  const full = isAssignedRm(user, c.id);
  return {
    ...toCustomerSummary(c, user),
    address: full ? c.address : '•••• (masked for your role)',
    kyc: c.kyc,
    consent: c.consent,
    assignedRm: USERS.find(u => u.role === 'RM' && u.portfolio && u.portfolio.includes(c.id))?.name || null,
  };
}

// ---------------- Auth ----------------

app.get('/api/auth/users', (req, res) => {
  res.json(USERS.map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role, branch: u.branch })));
});

app.post('/api/auth/login', async (req, res) => {
  const user = USERS.find(u => u.id === req.body.userId && u.username === req.body.username);
  if (!user) {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid username or password' });
  }

  try {
    const keycloakResponse = await fetch(KEYCLOAK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: KEYCLOAK_CLIENT_ID,
        grant_type: 'password',
        username: req.body.username,
        password: req.body.password || '',
      }),
    });
    if (!keycloakResponse.ok) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Keycloak authentication unavailable:', error.message);
    return res.status(503).json({ error: 'identity_provider_unavailable', message: 'Keycloak authentication is unavailable' });
  }

  const token = 'demo-token-' + user.id + '-' + Date.now();
  SESSIONS[token] = user;
  logAudit(user, 'LOGIN', `Signed in as ${user.role}`);
  res.json({ token, user: { id: user.id, name: user.name, role: user.role, branch: user.branch } });
});

app.post('/api/auth/keycloak/callback', async (req, res) => {
  const { code, codeVerifier, redirectUri } = req.body || {};
  if (!code || !codeVerifier || !redirectUri) {
    return res.status(400).json({ error: 'bad_request', message: 'Keycloak authorization code, verifier, and redirect URI are required' });
  }

  try {
    const tokenResponse = await fetch(KEYCLOAK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: KEYCLOAK_CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenResponse.ok) {
      const details = await tokenResponse.text();
      console.error('Keycloak authorization failed:', details);
      return res.status(401).json({ error: 'unauthorized', message: 'Keycloak authorization failed' });
    }
    const tokenData = await tokenResponse.json();
    const profile = decodeJwtPayload(tokenData.id_token || tokenData.access_token);
    if (profile.iss !== KEYCLOAK_ISSUER || (profile.exp && profile.exp <= Math.floor(Date.now() / 1000))) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid Keycloak token claims' });
    }
    const user = USERS.find(candidate => candidate.username === profile.preferred_username);
    if (!user) return res.status(403).json({ error: 'forbidden', message: 'Keycloak user is not mapped to a Customer 360 role' });

    const token = 'demo-token-' + user.id + '-' + Date.now();
    SESSIONS[token] = user;
    logAudit(user, 'LOGIN', `Signed in through Keycloak as ${user.role}`);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, branch: user.branch } });
  } catch (error) {
    console.error('Keycloak callback unavailable:', error.message);
    res.status(503).json({ error: 'identity_provider_unavailable', message: 'Keycloak authentication is unavailable' });
  }
});

app.use('/api', (req, res, next) => {
  if (req.path === '/auth/users' || req.path === '/auth/login' || req.path === '/auth/keycloak/callback') return next();
  auth(req, res, next);
});

// ---------------- Customers ----------------

app.get('/api/customers', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  let list = req.user.role === 'RM' ? CUSTOMERS.filter(c => req.user.portfolio.includes(c.id)) : CUSTOMERS;
  if (q) {
    list = list.filter(c =>
      c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) || c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')));
  }
  res.json(list.map(c => toCustomerSummary(c, req.user)));
});

app.post('/api/customers', requireRole('RM', 'Manager', 'Operations'), async (req, res) => {
  const { name, email, phone, address, segment, riskFlag, kyc, consent } = req.body || {};
  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'bad_request', message: 'name, email and phone are required' });
  }

  const id = `CU${String(Math.floor(100000 + Math.random() * 900000))}`;
  const customer = {
    id,
    name: String(name).trim(),
    email: String(email).trim(),
    phone: String(phone).trim(),
    address: String(address || '').trim(),
    segment: segment || 'Regular',
    kyc: kyc || 'Pending',
    riskFlag: riskFlag || 'Low',
    consent: {
      marketing: Boolean(consent?.marketing),
      dataSharing: Boolean(consent?.dataSharing),
      updatedOn: new Date().toISOString().slice(0, 10),
    },
    accounts: [{ id: `AC-${id}`, type: 'Savings', balance: 0, status: 'Active', opened: new Date().toISOString().slice(0, 10) }],
    loans: [],
    cards: [],
    transactions: [{ date: new Date().toISOString().slice(0, 10), description: 'Account opened', type: 'credit', amount: 0, balanceAfter: 0 }],
    interactions: [{ date: new Date().toISOString().slice(0, 10), rm: req.user.name, channel: 'Account opening', notes: 'Customer profile and primary account created.' }],
    serviceRequests: [],
  };

  CUSTOMERS.unshift(customer);
  if (req.user.role === 'RM') {
    req.user.portfolio = Array.from(new Set([...(req.user.portfolio || []), customer.id]));
  }

  try {
    const { persistCustomer } = require('./db');
    await persistCustomer(customer, req.user);
    logAudit(req.user, 'CUSTOMER_CREATED', `Created ${customer.id} (${customer.name})`);
    res.status(201).json(toCustomerProfile(customer, req.user));
  } catch (error) {
    console.error('Unable to persist customer creation', error.message);
    res.status(500).json({ error: 'internal_error', message: 'Customer was created in memory but failed to persist to PostgreSQL' });
  }
});

app.get('/api/customers/:customerId', (req, res) => {
  const c = getViewableCustomer(req, res); if (!c) return;
  logAudit(req.user, 'VIEW_PROFILE', `Opened profile ${c.id}`);
  res.json(toCustomerProfile(c, req.user));
});

app.get('/api/customers/:customerId/accounts', (req, res) => {
  const c = getViewableCustomer(req, res); if (!c) return;
  logAudit(req.user, 'VIEW_ACCOUNTS', `Viewed accounts for ${c.id}`);
  res.json(c.accounts);
});
app.get('/api/customers/:customerId/loans', (req, res) => {
  const c = getViewableCustomer(req, res); if (!c) return;
  logAudit(req.user, 'VIEW_LOANS', `Viewed loans for ${c.id}`);
  res.json(c.loans);
});
app.get('/api/customers/:customerId/cards', (req, res) => {
  const c = getViewableCustomer(req, res); if (!c) return;
  logAudit(req.user, 'VIEW_CARDS', `Viewed cards for ${c.id}`);
  res.json(c.cards); // numbers already pre-masked in the data layer
});

app.get('/api/customers/:customerId/transactions', (req, res) => {
  const c = getViewableCustomer(req, res); if (!c) return;
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = parseInt(req.query.pageSize || '20', 10);
  let items = c.transactions;
  if (req.query.type) items = items.filter(t => t.type === req.query.type);
  const start = (page - 1) * pageSize;
  logAudit(req.user, 'VIEW_TRANSACTIONS', `Viewed transactions for ${c.id}`);
  res.json({ page, pageSize, total: items.length, items: items.slice(start, start + pageSize) });
});

app.get('/api/customers/:customerId/interactions', (req, res) => {
  const c = getViewableCustomer(req, res); if (!c) return;
  logAudit(req.user, 'VIEW_INTERACTIONS', `Viewed interactions for ${c.id}`);
  res.json(c.interactions);
});
app.post('/api/customers/:customerId/interactions', requireRole('RM'), async (req, res) => {
  const c = getViewableCustomer(req, res); if (!c) return;
  const { channel, notes } = req.body;
  if (!channel || !notes) return res.status(400).json({ error: 'bad_request', message: 'channel and notes are required' });
  const entry = { date: new Date().toISOString().slice(0, 10), rm: req.user.name, channel, notes };
  c.interactions.unshift(entry);
  await persistInteraction(req.user, c.id, entry);
  logAudit(req.user, 'INTERACTION_LOGGED', `${c.id} — ${channel}`);
  res.status(201).json(entry);
});

// ---------------- Service requests ----------------

const SR_TRANSITIONS = { open: ['in_progress'], in_progress: ['closed', 'open'], closed: [] };

app.get('/api/customers/:customerId/service-requests', (req, res) => {
  const c = getViewableCustomer(req, res); if (!c) return;
  logAudit(req.user, 'VIEW_SERVICE_REQUESTS', `Viewed service requests for ${c.id}`);
  res.json(c.serviceRequests);
});
app.post('/api/customers/:customerId/service-requests', requireRole('RM'), async (req, res) => {
  const c = getViewableCustomer(req, res); if (!c) return;
  const type = (req.body.type || '').trim();
  if (!type) return res.status(400).json({ error: 'bad_request', message: 'type is required' });
  const id = 'SR-' + Math.floor(5700 + Math.random() * 900);
  const sr = { id, type, status: 'open', assignedTo: req.user.name, createdAt: new Date().toISOString().slice(0, 10),
    history: [{ ts: new Date().toISOString().slice(0, 10), by: req.user.name, note: 'Created.' }] };
  c.serviceRequests.unshift(sr);
  await persistServiceRequest(req.user, c.id, sr);
  logAudit(req.user, 'SR_CREATED', `${id} — ${type} — ${c.id}`);
  res.status(201).json(sr);
});

app.get('/api/service-requests', (req, res) => {
  const mine = req.user.role === 'RM';
  let all = CUSTOMERS.flatMap(c => c.serviceRequests.map(sr => ({ ...sr, customerId: c.id, customerName: c.name })));
  if (mine) all = all.filter(sr => req.user.portfolio.includes(sr.customerId));
  if (req.query.status) all = all.filter(sr => sr.status === req.query.status);
  res.json(all);
});

app.patch('/api/service-requests/:srId', requireRole('RM', 'Operations'), async (req, res) => {
  const { srId } = req.params;
  const { status } = req.body;
  for (const c of CUSTOMERS) {
    const sr = c.serviceRequests.find(s => s.id === srId);
    if (sr) {
      if (!SR_TRANSITIONS[sr.status].includes(status)) {
        return res.status(409).json({ error: 'invalid_transition', message: `Cannot move from ${sr.status} to ${status}` });
      }
      sr.status = status;
      sr.history.push({ ts: new Date().toISOString().slice(0, 10), by: req.user.name, note: `Status changed to ${status.replace('_', ' ')}.` });
      await persistServiceRequestStatus(req.user, srId, status, sr.history.at(-1).note);
      logAudit(req.user, 'SR_STATUS_CHANGE', `${srId} → ${status}`);
      return res.json(sr);
    }
  }
  res.status(404).json({ error: 'not_found', message: 'Service request not found' });
});

// ---------------- Copilot (AI) — mocked responses for Milestone 1 ----------------
// These return realistic, template-based mock text so the frontend can build
// and demo the full flow today. Swap the body of each handler for a real LLM
// call later; request/response shape stays identical, so the frontend never changes.

function requireAiRole(req, res, next) { return requireRole('RM')(req, res, next); }

app.post('/api/customers/:customerId/ai/summary', requireAiRole, async (req, res) => {
  const c = getCustomerOr404(req, res); if (!c) return;
  const missed = c.loans.reduce((s, l) => s + l.missedEmis, 0);
  const balance = c.accounts.reduce((s, a) => s + a.balance, 0);
  const text = `${c.name} holds ${c.accounts.length} account(s) with a combined balance of ₹${balance.toLocaleString('en-IN')} and is flagged ${c.riskFlag.toLowerCase()} risk. ` +
    (missed > 0 ? `There have been ${missed} missed EMI payment(s) on file. ` : 'No missed EMI payments are on record. ') +
    (c.interactions[0] ? `Most recent contact was a ${c.interactions[0].channel.toLowerCase()} on ${c.interactions[0].date}.` : 'No interactions have been logged yet.');
  AI_INTERACTIONS.push({ customerId: c.id, kind: 'summary', text });
  await persistAiInteraction(req.user, c.id, 'summary', text, { accounts: c.accounts, loans: c.loans, interactions: c.interactions, riskFlag: c.riskFlag });
  logAudit(req.user, 'AI_SUMMARY', `Generated AI summary for ${c.id}`);
  res.json({ text, groundedIn: ['accounts', 'loans', 'interactions', 'riskFlag'] });
});

function eligibleActions(c) {
  const actions = [];
  const totalBalance = c.accounts.reduce((s, a) => s + a.balance, 0);
  if (c.cards.length) {
    const cd = c.cards[0];
    const util = cd.limit ? cd.used / cd.limit : 0;
    if (util > 0.65 && c.consent.marketing) actions.push({ id: 'limit_increase', label: 'Offer credit limit increase', rule: `Card utilisation at ${Math.round(util * 100)}% and marketing consent is on file.` });
  }
  if (c.loans.some(l => l.missedEmis >= 1)) actions.push({ id: 'repayment_outreach', label: 'Schedule a repayment discussion', rule: 'One or more missed EMIs recorded on an active loan.' });
  if (c.segment === 'Premium' && totalBalance > 1000000 && c.consent.marketing) actions.push({ id: 'wealth_referral', label: 'Refer to the wealth management desk', rule: 'Premium segment, combined balance above ₹10,00,000, and marketing consent is on file.' });
  if (c.kyc === 'Pending') actions.push({ id: 'kyc_followup', label: 'Follow up on pending KYC', rule: 'KYC status is Pending — required before further product offers.' });
  if (actions.length === 0) actions.push({ id: 'none', label: 'No eligible action right now', rule: "No business rule currently matches this customer's profile or consent status." });
  return actions;
}

app.post('/api/customers/:customerId/ai/next-best-action', requireAiRole, async (req, res) => {
  const c = getCustomerOr404(req, res); if (!c) return;
  const actions = eligibleActions(c);
  const top = actions[0];
  const explanation = top.id === 'none' ? null :
    `This is suggested because: ${top.rule} Reviewing this with the customer keeps the account in good standing and reflects their current usage pattern.`;
  AI_INTERACTIONS.push({ customerId: c.id, kind: 'next_best_action', actionId: top.id, text: explanation, decision: null });
  await persistAiInteraction(req.user, c.id, 'next_best_action', explanation, { eligibleActions: actions });
  logAudit(req.user, 'AI_NBA', `Generated next-best-action "${top.label}" for ${c.id}`);
  res.json({ eligibleActions: actions, topAction: { id: top.id, label: top.label, explanation } });
});

app.post('/api/customers/:customerId/ai/next-best-action/:actionId/decision', requireAiRole, async (req, res) => {
  const c = getCustomerOr404(req, res); if (!c) return;
  const { decision } = req.body;
  await persistAiDecision(req.user, c.id, decision);
  logAudit(req.user, decision === 'accept' ? 'NBA_ACCEPTED' : 'NBA_REJECTED', `${req.params.actionId} — ${c.id}`);
  res.json({ ok: true });
});

app.post('/api/customers/:customerId/ai/chat', requireAiRole, async (req, res) => {
  const c = getCustomerOr404(req, res); if (!c) return;
  const q = (req.body.question || '').toLowerCase();
  let answer, citations;
  if (q.includes('missed') || q.includes('payment') || q.includes('emi')) {
    const missed = c.loans.filter(l => l.missedEmis > 0);
    if (missed.length) {
      answer = `Yes — ${c.name} has ${missed[0].missedEmis} missed EMI payment(s) on the ${missed[0].type} (source: loans). The most recent failed transaction was on ${(c.transactions.find(t => t.type === 'failed') || {}).date || 'an earlier date'} (source: transactions).`;
      citations = ['loans', 'transactions'];
    } else {
      answer = `No missed payments are recorded for ${c.name} (source: loans).`;
      citations = ['loans'];
    }
  } else if (q.includes('balance')) {
    const bal = c.accounts.reduce((s, a) => s + a.balance, 0);
    answer = `Combined account balance is ₹${bal.toLocaleString('en-IN')} across ${c.accounts.length} account(s) (source: accounts).`;
    citations = ['accounts'];
  } else {
    answer = "That isn't available in this customer's current data (source: none found). Try asking about payments, balances, or recent interactions.";
    citations = [];
  }
  CHAT_HISTORY[c.id] = CHAT_HISTORY[c.id] || [];
  CHAT_HISTORY[c.id].push({ role: 'user', text: req.body.question }, { role: 'ai', text: answer });
  await persistAiInteraction(req.user, c.id, 'chat', answer, { question: req.body.question, citations });
  logAudit(req.user, 'AI_CHAT', `Asked "${req.body.question}" about ${c.id}`);
  res.json({ answer, citations });
});

app.post('/api/customers/:customerId/ai/contact-plan', requireAiRole, async (req, res) => {
  const c = getCustomerOr404(req, res); if (!c) return;
  const text = `Call ${c.name} this week. Open by referencing the ${c.interactions[0] ? c.interactions[0].channel.toLowerCase() + ' on ' + c.interactions[0].date : 'account activity'}. ` +
    (c.loans.some(l => l.missedEmis > 0) ? 'Ask whether the missed EMI was a one-off and confirm the auto-debit is active. ' : 'Confirm satisfaction with current products. ') +
    'Follow up by SMS in 7 days if no response.';
  AI_INTERACTIONS.push({ customerId: c.id, kind: 'contact_plan', text, status: 'draft' });
  await persistAiInteraction(req.user, c.id, 'contact_plan', text, { interactions: c.interactions, loans: c.loans }, { planStatus: 'draft' });
  logAudit(req.user, 'AI_CONTACT_PLAN', `Drafted contact plan for ${c.id}`);
  res.json({ text, groundedIn: ['interactions', 'loans'] });
});
app.patch('/api/customers/:customerId/ai/contact-plan', requireAiRole, async (req, res) => {
  const c = getCustomerOr404(req, res); if (!c) return;
  if (req.body.status) logAudit(req.user, req.body.status === 'accepted' ? 'CONTACT_PLAN_ACCEPTED' : 'CONTACT_PLAN_REJECTED', c.id);
  await persistContactPlanStatus(req.user, c.id, req.body.status, req.body.text);
  res.json({ ok: true });
});

// ---------------- Manager dashboard ----------------

app.get('/api/dashboard/summary', requireRole('Manager'), (req, res) => {
  const openSR = CUSTOMERS.flatMap(c => c.serviceRequests).filter(s => s.status === 'open').length;
  const progSR = CUSTOMERS.flatMap(c => c.serviceRequests).filter(s => s.status === 'in_progress').length;
  const closedSR = CUSTOMERS.flatMap(c => c.serviceRequests).filter(s => s.status === 'closed').length;
  const risk = { Low: 0, Medium: 0, High: 0 };
  CUSTOMERS.forEach(c => risk[c.riskFlag]++);
  const totalBalance = CUSTOMERS.reduce((s, c) => s + c.accounts.reduce((s2, a) => s2 + a.balance, 0), 0);
  res.json({
    customerCount: CUSTOMERS.length,
    totalBalance,
    serviceRequestsByStatus: { open: openSR, in_progress: progSR, closed: closedSR },
    riskDistribution: risk,
  });
});

// ---------------- Audit ----------------

app.get('/api/audit', requireRole('Auditor'), (req, res) => {
  let rows = AUDIT_LOG;
  if (req.query.user) rows = rows.filter(r => r.user === req.query.user);
  if (req.query.action) rows = rows.filter(r => r.action.toLowerCase().includes(req.query.action.toLowerCase()) || r.details.toLowerCase().includes(req.query.action.toLowerCase()));
  res.json(rows);
});

app.get('/api/audit/export', requireRole('Auditor'), (req, res) => {
  const csv = ['timestamp,user,role,action,details', ...AUDIT_LOG.map(r => `"${r.ts}","${r.user}","${r.role}","${r.action}","${r.details.replace(/"/g, '""')}"`)].join('\n');
  logAudit(req.user, 'AUDIT_EXPORT', `${AUDIT_LOG.length} rows`);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="audit_log.csv"');
  res.send(csv);
});

startDatabase()
  .then(hydrate)
  .then(() => app.listen(PORT, () => console.log(`Customer 360 demo connected to PostgreSQL on http://localhost:${PORT}/api`)))
  .catch((error) => { console.error('Unable to connect to PostgreSQL', error); process.exit(1); });

module.exports = app;
