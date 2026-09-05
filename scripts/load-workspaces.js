const fs = require('fs');
const path = require('path');

function loadWorkspaces(root) {
  const payload = JSON.parse(fs.readFileSync(path.join(root, 'data', 'workspaces.json'), 'utf8'));
  const children = (payload.workspaces || []).find(item => item.id === 'children');
  if (!children) return payload;
  const cupGames = JSON.parse(fs.readFileSync(path.join(root, 'data', 'cup-games.json'), 'utf8'));
  const tools = JSON.parse(fs.readFileSync(path.join(root, 'data', 'facilitator-tools.json'), 'utf8'));
  const existing = new Set((children.activities || []).map(item => item.id));
  children.activities = [...(children.activities || []), ...cupGames.filter(item => !existing.has(item.id))];
  Object.assign(children, tools);
  return payload;
}

module.exports = { loadWorkspaces };
