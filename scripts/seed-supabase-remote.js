const fs = require('fs');
const path = require('path');
const { loadWorkspaces } = require('./load-workspaces');

const root = path.resolve(__dirname, '..');
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const documents = [
  {
    key: 'manual',
    payload: JSON.parse(fs.readFileSync(path.join(root, 'data', 'manual.json'), 'utf8'))
  },
  {
    key: 'styles',
    payload: { css: fs.readFileSync(path.join(root, 'data', 'custom.css'), 'utf8') }
  },
  {
    key: 'workspaces',
    payload: loadWorkspaces(root)
  }
];

async function main() {
  const response = await fetch(`${supabaseUrl}/rest/v1/app_documents?on_conflict=key`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(documents)
  });
  if (!response.ok) {
    console.error(`Supabase seed failed (${response.status}): ${await response.text()}`);
    process.exit(1);
  }
  console.log('Seeded manual, styles and workspaces in Supabase.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
