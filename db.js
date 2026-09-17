const { Pool } = require('pg');
const { USERS, CUSTOMERS } = require('./data');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://customer360:customer360_dev@postgres:5432/customer360',
});

async function seed() {
  await pool.query(`
    INSERT INTO app_user (username, name, role, branch)
    VALUES ${USERS.map((user) => `('${user.username}', '${user.name}', '${user.role}', '${user.branch}')`).join(',')}
    ON CONFLICT (username) DO NOTHING
  `);

  for (const customer of CUSTOMERS) {
    await pool.query(`
      INSERT INTO customer (id, name, email, phone, address, segment, kyc_status, risk_flag, marketing_consent, data_sharing_consent, consent_updated_on)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, phone=EXCLUDED.phone, address=EXCLUDED.address,
        segment=EXCLUDED.segment, kyc_status=EXCLUDED.kyc_status, risk_flag=EXCLUDED.risk_flag,
        marketing_consent=EXCLUDED.marketing_consent, data_sharing_consent=EXCLUDED.data_sharing_consent,
        consent_updated_on=EXCLUDED.consent_updated_on
    `, [customer.id, customer.name, customer.email, customer.phone, customer.address, customer.segment, customer.kyc, customer.riskFlag, customer.consent.marketing, customer.consent.dataSharing, customer.consent.updatedOn]);

    const rm = await pool.query('SELECT id FROM app_user WHERE username = $1', ['r.mehta']);
    if (rm.rows[0] && USERS.find((user) => user.portfolio?.includes(customer.id))) {
      await pool.query('INSERT INTO portfolio_assignment (rm_user_id, customer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [rm.rows[0].id, customer.id]);
    }

    for (const account of customer.accounts) await pool.query('INSERT INTO account (id, customer_id, type, balance, status, opened_on) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [account.id, customer.id, account.type, account.balance, account.status, account.opened || '2020-01-01']);
    for (const loan of customer.loans) await pool.query('INSERT INTO loan (id, customer_id, type, principal, outstanding, emi, status, missed_emis) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING', [loan.id, customer.id, loan.type, loan.principal || loan.outstanding, loan.outstanding, loan.emi, loan.status, loan.missedEmis]);
    for (const card of customer.cards) await pool.query('INSERT INTO card (id, customer_id, type, masked_number, card_limit, used, status) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING', [card.id, customer.id, card.type, card.maskedNumber, card.limit, card.used, card.status]);
    for (const item of customer.transactions) await pool.query('INSERT INTO transaction (customer_id, txn_date, description, type, amount, balance_after) SELECT $1,$2,$3,$4,$5,$6 WHERE NOT EXISTS (SELECT 1 FROM transaction WHERE customer_id=$1 AND txn_date=$2 AND description=$3)', [customer.id, item.date, item.description, item.type, item.amount, item.balanceAfter]);
    for (const item of customer.interactions) {
      const rmUser = await pool.query('SELECT id FROM app_user WHERE name = $1', [item.rm]);
      if (rmUser.rows[0]) await pool.query('INSERT INTO interaction (customer_id, rm_user_id, interaction_date, channel, notes) SELECT $1,$2,$3,$4,$5 WHERE NOT EXISTS (SELECT 1 FROM interaction WHERE customer_id=$1 AND interaction_date=$3 AND notes=$5)', [customer.id, rmUser.rows[0].id, item.date, item.channel, item.notes]);
    }
    for (const request of customer.serviceRequests) {
      const assignee = await pool.query('SELECT id FROM app_user WHERE name = $1', [request.assignedTo]);
      await pool.query('INSERT INTO service_request (id, customer_id, type, status, assigned_to_user_id, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING', [request.id, customer.id, request.type, request.status, assignee.rows[0]?.id || null, request.createdAt]);
    }
  }
}

async function hydrate() {
  const [customers, accounts, loans, cards, transactions, interactions, requests, assignments] = await Promise.all([
    pool.query('SELECT id, name, email, phone, address, segment, kyc_status AS kyc, risk_flag AS "riskFlag", marketing_consent AS marketing, data_sharing_consent AS "dataSharing", consent_updated_on AS "updatedOn" FROM customer'),
    pool.query('SELECT id, customer_id, type, balance, status, opened_on AS opened FROM account'),
    pool.query('SELECT id, customer_id, type, principal, outstanding, emi, missed_emis AS "missedEmis", status FROM loan'),
    pool.query('SELECT id, customer_id, type, masked_number AS "maskedNumber", card_limit AS "limit", used, status FROM card'),
    pool.query('SELECT customer_id, txn_date AS date, description, amount, type, balance_after AS "balanceAfter" FROM transaction ORDER BY txn_date DESC'),
    pool.query('SELECT i.customer_id, i.interaction_date AS date, u.name AS rm, i.channel, i.notes FROM interaction i JOIN app_user u ON u.id = i.rm_user_id ORDER BY i.interaction_date DESC'),
    pool.query('SELECT sr.*, c.name AS customer_name, u.name AS assigned_to FROM service_request sr JOIN customer c ON c.id = sr.customer_id LEFT JOIN app_user u ON u.id = sr.assigned_to_user_id'),
    pool.query('SELECT u.username, pa.customer_id FROM portfolio_assignment pa JOIN app_user u ON u.id = pa.rm_user_id'),
  ]);

  for (const user of USERS) {
    if (user.role === 'RM') user.portfolio = assignments.rows.filter((row) => row.username === user.username).map((row) => row.customer_id);
  }

  for (const source of customers.rows) {
    if (!CUSTOMERS.some((customer) => customer.id === source.id)) {
      CUSTOMERS.push({ id: source.id, name: source.name, email: source.email, phone: source.phone, address: source.address, segment: source.segment, kyc: source.kyc, riskFlag: source.riskFlag, consent: { marketing: source.marketing, dataSharing: source.dataSharing, updatedOn: source.updatedOn }, accounts: [], loans: [], cards: [], transactions: [], interactions: [], serviceRequests: [] });
    }
  }

  for (const target of CUSTOMERS) {
    const source = customers.rows.find((row) => row.id === target.id);
    if (!source) continue;
    Object.assign(target, { ...source, consent: { marketing: source.marketing, dataSharing: source.dataSharing, updatedOn: source.updatedOn }, accounts: [], loans: [], cards: [], transactions: [], interactions: [], serviceRequests: [] });
    target.accounts.push(...accounts.rows.filter((row) => row.customer_id === target.id));
    target.loans.push(...loans.rows.filter((row) => row.customer_id === target.id));
    target.cards.push(...cards.rows.filter((row) => row.customer_id === target.id));
    target.transactions.push(...transactions.rows.filter((row) => row.customer_id === target.id));
    target.interactions.push(...interactions.rows.filter((row) => row.customer_id === target.id));
    target.serviceRequests.push(...requests.rows.filter((row) => row.customer_id === target.id).map(({ id, type, status, assigned_to: assignedTo, created_at: createdAt }) => ({ id, type, status, assignedTo, createdAt, history: [] })));
  }
}

async function startDatabase() {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      await seed();
      return;
    } catch (error) {
      if (attempt === 20) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function userIdFor(user) {
  const result = await pool.query('SELECT id FROM app_user WHERE username = $1', [user.username]);
  return result.rows[0]?.id || null;
}

async function persistCustomer(customer, user) {
  const userId = await userIdFor(user);
  await pool.query(`
    INSERT INTO customer (id, name, email, phone, address, segment, kyc_status, risk_flag, marketing_consent, data_sharing_consent, consent_updated_on)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      address = EXCLUDED.address,
      segment = EXCLUDED.segment,
      kyc_status = EXCLUDED.kyc_status,
      risk_flag = EXCLUDED.risk_flag,
      marketing_consent = EXCLUDED.marketing_consent,
      data_sharing_consent = EXCLUDED.data_sharing_consent,
      consent_updated_on = EXCLUDED.consent_updated_on
  `, [
    customer.id,
    customer.name,
    customer.email,
    customer.phone,
    customer.address || '',
    customer.segment || 'Regular',
    customer.kyc || 'Pending',
    customer.riskFlag || 'Low',
    customer.consent?.marketing ?? false,
    customer.consent?.dataSharing ?? false,
    customer.consent?.updatedOn || new Date().toISOString().slice(0, 10),
  ]);

  if (user && user.role === 'RM') {
    const rmUser = await pool.query('SELECT id FROM app_user WHERE username = $1', [user.username]);
    if (rmUser.rows[0]) {
      await pool.query('INSERT INTO portfolio_assignment (rm_user_id, customer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [rmUser.rows[0].id, customer.id]);
    }
  }

  const openedOn = customer.accounts[0]?.opened || new Date().toISOString().slice(0, 10);
  const account = customer.accounts[0];
  if (account) {
    await pool.query(
      'INSERT INTO account (id, customer_id, type, balance, status, opened_on) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING',
      [account.id, customer.id, account.type, account.balance, account.status, openedOn],
    );
  }

  for (const item of customer.transactions || []) {
    await pool.query(
      'INSERT INTO transaction (customer_id, txn_date, description, type, amount, balance_after) SELECT $1,$2,$3,$4,$5,$6 WHERE NOT EXISTS (SELECT 1 FROM transaction WHERE customer_id=$1 AND txn_date=$2 AND description=$3)',
      [customer.id, item.date, item.description, item.type, item.amount, item.balanceAfter],
    );
  }

  for (const item of customer.interactions || []) {
    await pool.query(
      'INSERT INTO interaction (customer_id, rm_user_id, interaction_date, channel, notes) SELECT $1,$2,$3,$4,$5 WHERE NOT EXISTS (SELECT 1 FROM interaction WHERE customer_id=$1 AND interaction_date=$3 AND notes=$5)',
      [customer.id, userId, item.date, item.channel, item.notes],
    );
  }

  await pool.query('INSERT INTO audit_log (user_id, role, action, details) VALUES ($1,$2,$3,$4)', [userId, user.role, 'CUSTOMER_CREATED', `Created customer ${customer.id}`]);
}

async function persistAudit(user, action, details) {
  const userId = await userIdFor(user);
  await pool.query('INSERT INTO audit_log (user_id, role, action, details) VALUES ($1,$2,$3,$4)', [userId, user.role, action, details || '']);
}

async function persistInteraction(user, customerId, entry) {
  const userId = await userIdFor(user);
  await pool.query('INSERT INTO interaction (customer_id, rm_user_id, interaction_date, channel, notes) VALUES ($1,$2,$3,$4,$5)', [customerId, userId, entry.date, entry.channel, entry.notes]);
}

async function persistServiceRequest(user, customerId, request) {
  const userId = await userIdFor(user);
  await pool.query('INSERT INTO service_request (id, customer_id, type, status, assigned_to_user_id) VALUES ($1,$2,$3,$4,$5)', [request.id, customerId, request.type, request.status, userId]);
  await pool.query('INSERT INTO service_request_history (service_request_id, changed_by_user_id, note) VALUES ($1,$2,$3)', [request.id, userId, request.history[0].note]);
}

async function persistServiceRequestStatus(user, requestId, status, note) {
  const userId = await userIdFor(user);
  await pool.query('UPDATE service_request SET status = $1 WHERE id = $2', [status, requestId]);
  await pool.query('INSERT INTO service_request_history (service_request_id, changed_by_user_id, note) VALUES ($1,$2,$3)', [requestId, userId, note]);
}

async function persistAiInteraction(user, customerId, kind, outputText, inputContext, options = {}) {
  const userId = await userIdFor(user);
  await pool.query(
    'INSERT INTO ai_interaction (customer_id, user_id, kind, input_context, output_text, decision, plan_status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [customerId, userId, kind, JSON.stringify(inputContext || {}), outputText || '', options.decision || null, options.planStatus || null],
  );
}

async function persistAiDecision(user, customerId, decision) {
  const userId = await userIdFor(user);
  await pool.query(
    `UPDATE ai_interaction SET decision = $1
     WHERE id = (SELECT id FROM ai_interaction WHERE customer_id = $2 AND user_id = $3 AND kind = 'next_best_action' ORDER BY created_at DESC LIMIT 1)`,
    [decision, customerId, userId],
  );
}

async function persistContactPlanStatus(user, customerId, status, text) {
  const userId = await userIdFor(user);
  await pool.query(
    `UPDATE ai_interaction SET plan_status = $1, output_text = COALESCE($2, output_text)
     WHERE id = (SELECT id FROM ai_interaction WHERE customer_id = $3 AND user_id = $4 AND kind = 'contact_plan' ORDER BY created_at DESC LIMIT 1)`,
    [status, text || null, customerId, userId],
  );
}

module.exports = {
  pool,
  startDatabase,
  hydrate,
  persistCustomer,
  persistAudit,
  persistInteraction,
  persistServiceRequest,
  persistServiceRequestStatus,
  persistAiInteraction,
  persistAiDecision,
  persistContactPlanStatus,
};
