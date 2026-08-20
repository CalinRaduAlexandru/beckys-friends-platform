import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = await mkdtemp(join(tmpdir(), 'becky-crm-companions-'));
const crmFile = join(directory, 'crm.json');
await writeFile(crmFile, JSON.stringify({ children: [], visits: [], observations: [] }));

const port = 3361;
const server = spawn(process.execPath, ['server.js'], {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  env: { ...process.env, PORT: String(port), BECKY_CRM_FILE: crmFile },
  stdio: 'ignore'
});
const base = `http://127.0.0.1:${port}`;
const request = async (path, options = {}) => {
  const response = await fetch(base + path, {
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  return { response, body: await response.json() };
};

try {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { if ((await fetch(`${base}/api/runtime`)).ok) break; } catch {}
    if (attempt === 49) throw new Error('CRM companion test server did not start');
    await new Promise(resolve => setTimeout(resolve, 40));
  }

  const mother = await request('/api/admin/crm/companions', {
    method: 'POST', body: JSON.stringify({ first_name: 'Ana', relationship_label: 'mamă' })
  });
  assert.equal(mother.response.status, 201);

  const [firstChild, secondChild] = await Promise.all([
    request('/api/admin/crm/children', { method: 'POST', body: JSON.stringify({ first_name: 'Mara', age: 5, primary_companion_id: mother.body.id, interests: '', continuity: '' }) }),
    request('/api/admin/crm/children', { method: 'POST', body: JSON.stringify({ first_name: 'Luca', age: 7, primary_companion_id: mother.body.id, interests: '', continuity: '' }) })
  ]);
  assert.equal(firstChild.response.status, 201);
  assert.equal(secondChild.response.status, 201);

  const father = await request('/api/admin/crm/companions', {
    method: 'POST', body: JSON.stringify({ first_name: 'Mihai', relationship_label: 'tată' })
  });
  assert.equal(father.response.status, 201);

  const visit = await request('/api/admin/crm/visits', {
    method: 'POST', body: JSON.stringify({ child_id: firstChild.body.id, companion_id: father.body.id, visit_date: '2026-08-20', note: 'A venit după program.' })
  });
  assert.equal(visit.response.status, 201);
  assert.equal(visit.body.companion_id, father.body.id);

  const observation = await request(`/api/admin/crm/companions/${mother.body.id}/observations`, {
    method: 'POST', body: JSON.stringify({ observed_at: '2026-08-20T12:00:00.000Z', observation: 'A întrebat ce au construit copiii.' })
  });
  assert.equal(observation.response.status, 201);

  const companionProfile = await request(`/api/admin/crm/companions/${mother.body.id}`);
  assert.equal(companionProfile.response.status, 200);
  assert.deepEqual(companionProfile.body.companion.children.map(child => child.first_name).sort(), ['Luca', 'Mara']);
  assert.equal(companionProfile.body.observations.length, 1);

  const childProfile = await request(`/api/admin/crm/children/${firstChild.body.id}`);
  assert.equal(childProfile.response.status, 200);
  assert.equal(childProfile.body.child.primary_companion_id, mother.body.id);
  assert.equal(childProfile.body.visits[0].companion_id, father.body.id);

  const stored = JSON.parse(await readFile(crmFile, 'utf8'));
  assert.equal(stored.companions.length, 2);
  assert.equal(stored.child_companions.filter(link => link.companion_id === mother.body.id).length, 2);
  assert.equal(stored.companion_observations.length, 1);
} finally {
  server.kill('SIGTERM');
}

console.log('CRM companion checks passed');
