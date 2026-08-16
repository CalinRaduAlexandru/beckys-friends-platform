import assert from 'node:assert/strict';
import {
  createContentPiece,
  createMacroIdea,
  markContentPiecePublished,
  unmarkContentPiecePublished,
  updateContentPiece
} from '../src/content-os/domain/model.mjs';
import { LocalContentRepository } from '../src/content-os/data/local-content-repository.mjs';

const accountId = 'account-test';
const brandWorkspaceId = 'workspace-test';
const scope = { accountId, brandWorkspaceId };

const idea = createMacroIdea({ ...scope, title: 'Joaca dezvoltă lucruri pe care nu le vezi imediat.' });
assert.equal(idea.status, 'active');
assert.equal(idea.brandWorkspaceId, brandWorkspaceId);

const carousel = createContentPiece({
  ...scope,
  macroIdeaId: idea.id,
  format: 'carousel',
  hook: 'În timp ce copilul se joacă, se întâmplă mai mult decât vezi.',
  generatedContent: { slides: [] }
});
const edited = updateContentPiece(carousel, { hook: 'Un hook editat manual.' }, ['hook']);
assert.deepEqual(edited.userEditedFields, ['hook']);

const published = markContentPiecePublished(edited, { platform: 'instagram' });
assert.equal(published.contentPiece.status, 'published');
assert.ok(published.contentPiece.publishedAt);
assert.notEqual(published.publishedRecord.id, published.contentPiece.id);
assert.equal(unmarkContentPiecePublished(published.contentPiece).publishedAt, null);

const memory = new Map();
const storage = {
  getItem: key => memory.get(key) || null,
  setItem: (key, value) => memory.set(key, value)
};
const repository = new LocalContentRepository({ ...scope, storage });
repository.save('macroIdeas', idea);
repository.save('contentPieces', edited);
assert.equal(repository.list('macroIdeas').length, 1);
assert.equal(repository.get('contentPieces', edited.id).hook, 'Un hook editat manual.');
repository.transaction(store => { store.contentPieces[0].status = 'ready'; });
assert.equal(repository.get('contentPieces', edited.id).status, 'ready');

assert.throws(
  () => repository.save('macroIdeas', createMacroIdea({ accountId, brandWorkspaceId: 'other', title: 'Cross tenant' })),
  /workspace-ului activ/
);

console.log('Content OS domain and local repository checks passed.');
