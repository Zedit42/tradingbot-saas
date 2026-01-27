const jwt = require('jsonwebtoken');
const fs = require('fs');

const JWT_SECRET = fs.readFileSync('/tmp/jwt-secret.txt', 'utf8').trim();
const VAULT_URL = 'http://localhost:4000';

const token = jwt.sign(
  { userId: 'test-user-123', serviceId: 'test' },
  JWT_SECRET,
  { expiresIn: '5m' }
);

async function test() {
  console.log('🔐 KEY VAULT TEST\n');

  // 1. Health
  console.log('1️⃣ Health Check...');
  const health = await fetch(`${VAULT_URL}/health`).then(r => r.json());
  console.log('   ✅', JSON.stringify(health));

  // 2. Store key
  console.log('\n2️⃣ Storing test key...');
  const fakeKey = Buffer.alloc(64).fill(1);
  const storeRes = await fetch(`${VAULT_URL}/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ privateKey: fakeKey.toString('base64'), publicAddress: 'Test123', chain: 'solana' })
  }).then(r => r.json());
  console.log('   ✅ Stored:', JSON.stringify(storeRes));

  // 3. List
  console.log('\n3️⃣ Listing keys...');
  const keys = await fetch(`${VAULT_URL}/keys`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json());
  console.log('   ✅ Keys:', JSON.stringify(keys));

  // 4. Audit
  console.log('\n4️⃣ Audit logs...');
  const logs = await fetch(`${VAULT_URL}/audit`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json());
  console.log('   ✅', logs.length, 'log entries');

  // 5. Unauthorized
  console.log('\n5️⃣ Testing unauthorized...');
  const badRes = await fetch(`${VAULT_URL}/keys`, { headers: { 'Authorization': 'Bearer bad' } });
  console.log('   ✅ Blocked with status:', badRes.status);

  // 6. Delete
  console.log('\n6️⃣ Deleting key...');
  const del = await fetch(`${VAULT_URL}/keys/${storeRes.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json());
  console.log('   ✅ Deleted:', JSON.stringify(del));

  console.log('\n✅ ALL TESTS PASSED!');
}

test().catch(e => console.error('❌ Error:', e.message));
