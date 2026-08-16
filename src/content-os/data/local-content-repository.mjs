import { assertWorkspaceEntity } from '../domain/model.mjs';

const COLLECTIONS = Object.freeze([
  'personas',
  'contentPillars',
  'campaigns',
  'macroIdeas',
  'angles',
  'contentPieces',
  'publishedRecords'
]);

const emptyStore = (accountId, brandWorkspaceId) => ({
  schemaVersion: 1,
  accountId,
  brandWorkspaceId,
  updatedAt: null,
  personas: [],
  contentPillars: [],
  campaigns: [],
  macroIdeas: [],
  angles: [],
  contentPieces: [],
  publishedRecords: []
});

export class LocalContentRepository {
  constructor({ accountId, brandWorkspaceId, storage = globalThis.localStorage }) {
    if (!accountId || !brandWorkspaceId) throw new Error('Repository-ul are nevoie de accountId și brandWorkspaceId.');
    if (!storage) throw new Error('Storage indisponibil.');
    this.accountId = accountId;
    this.brandWorkspaceId = brandWorkspaceId;
    this.storage = storage;
    this.key = `content-os:v1:${brandWorkspaceId}`;
  }

  read() {
    const raw = this.storage.getItem(this.key);
    if (!raw) return emptyStore(this.accountId, this.brandWorkspaceId);
    const value = JSON.parse(raw);
    if (value.schemaVersion !== 1 || value.accountId !== this.accountId || value.brandWorkspaceId !== this.brandWorkspaceId) {
      throw new Error('Datele locale nu corespund workspace-ului activ.');
    }
    return { ...emptyStore(this.accountId, this.brandWorkspaceId), ...value };
  }

  write(value) {
    const next = { ...value, schemaVersion: 1, accountId: this.accountId, brandWorkspaceId: this.brandWorkspaceId, updatedAt: new Date().toISOString() };
    this.storage.setItem(this.key, JSON.stringify(next));
    return next;
  }

  list(collection, predicate = () => true) {
    this.#assertCollection(collection);
    return this.read()[collection].filter(predicate).map(item => structuredClone(item));
  }

  get(collection, entityId) {
    this.#assertCollection(collection);
    const entity = this.read()[collection].find(item => item.id === entityId);
    return entity ? structuredClone(entity) : null;
  }

  save(collection, entity) {
    this.#assertCollection(collection);
    assertWorkspaceEntity(entity, this.accountId, this.brandWorkspaceId);
    const store = this.read();
    const position = store[collection].findIndex(item => item.id === entity.id);
    const nextEntity = structuredClone(entity);
    if (position < 0) store[collection].push(nextEntity);
    else store[collection][position] = nextEntity;
    this.write(store);
    return structuredClone(nextEntity);
  }

  remove(collection, entityId) {
    this.#assertCollection(collection);
    const store = this.read();
    const before = store[collection].length;
    store[collection] = store[collection].filter(item => item.id !== entityId);
    if (store[collection].length !== before) this.write(store);
    return store[collection].length !== before;
  }

  transaction(mutator) {
    const store = this.read();
    const draft = structuredClone(store);
    const result = mutator(draft);
    return this.write(result || draft);
  }

  #assertCollection(collection) {
    if (!COLLECTIONS.includes(collection)) throw new Error(`Colecție necunoscută: ${collection}`);
  }
}

export { COLLECTIONS as CONTENT_COLLECTIONS };
