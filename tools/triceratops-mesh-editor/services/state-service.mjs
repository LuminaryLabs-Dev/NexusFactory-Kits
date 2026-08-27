import { applyJsonPatch } from './transaction-service.mjs';
import { deepClone, assert, signature } from './runtime-service.mjs';

export class MeshStateManager {
  constructor({ document, evaluator, validateResult }) {
    this.evaluator = evaluator;
    this.validateResult = validateResult;
    this.revision = 0;
    this.committedDocument = deepClone(document);
    this.committedResult = null;
    this.committedValidation = null;
    this.previewState = null;
    this.history = [];
    this.snapshots = [deepClone(document)];
    this.snapshotIndex = 0;
    this.branches = new Map([['main', { revision: 0, document: deepClone(document) }]]);
    this.branchName = 'main';
  }

  async initialize() {
    this.committedResult = await this.evaluator.evaluate(this.committedDocument, {}, { forceClean: true });
    this.committedValidation = await this.validateResult(this.committedResult);
    assert(this.committedValidation.verdict === 'pass', 'Initial mesh program failed validation', 'BASELINE_INVALID');
    return this.getState();
  }

  async preview(transaction) {
    assert(transaction && typeof transaction === 'object', 'Transaction is required', 'INVALID_TRANSACTION');
    assert(typeof transaction.transactionId === 'string' && transaction.transactionId.length > 0, 'transactionId is required', 'INVALID_TRANSACTION');
    assert(transaction.baseRevision === this.revision, `Stale revision ${transaction.baseRevision}; current revision is ${this.revision}`, 'STALE_REVISION');
    const patched = applyJsonPatch(this.committedDocument, transaction.patch);
    const result = await this.evaluator.evaluate(patched.document);
    const validation = await this.validateResult(result);
    this.previewState = {
      transaction: deepClone(transaction),
      document: patched.document,
      touched: patched.touched,
      result,
      validation,
      previewSignature: signature({ baseRevision: this.revision, transactionId: transaction.transactionId, result: result.semanticSignature })
    };
    if (transaction.mode === 'commit') return this.commit(transaction.transactionId);
    return this.getState();
  }

  async commit(transactionId = this.previewState?.transaction.transactionId) {
    assert(this.previewState, 'No preview exists to commit', 'NO_PREVIEW');
    assert(this.previewState.transaction.transactionId === transactionId, 'Transaction ID does not match current preview', 'TRANSACTION_MISMATCH');
    assert(this.previewState.validation.verdict === 'pass', 'Preview failed validation and cannot be committed', 'VALIDATION_FAILED');
    this.committedDocument = deepClone(this.previewState.document);
    this.committedResult = this.previewState.result;
    this.committedValidation = this.previewState.validation;
    this.revision++;
    const record = {
      transactionId,
      baseRevision: this.previewState.transaction.baseRevision,
      committedRevision: this.revision,
      patch: deepClone(this.previewState.transaction.patch),
      touched: [...this.previewState.touched],
      semanticSignature: this.committedResult.semanticSignature,
      validation: this.committedValidation.verdict
    };
    this.history.push(record);
    this.snapshots = this.snapshots.slice(0, this.snapshotIndex + 1);
    this.snapshots.push(deepClone(this.committedDocument));
    this.snapshotIndex++;
    this.branches.set(this.branchName, { revision: this.revision, document: deepClone(this.committedDocument) });
    this.previewState = null;
    return this.getState();
  }

  async rollback() {
    this.previewState = null;
    this.committedResult = await this.evaluator.evaluate(this.committedDocument);
    this.committedValidation = await this.validateResult(this.committedResult);
    return this.getState();
  }

  async undo() {
    assert(this.snapshotIndex > 0, 'Nothing to undo', 'UNDO_EMPTY');
    this.snapshotIndex--;
    return this.#restoreSnapshot('undo');
  }

  async redo() {
    assert(this.snapshotIndex < this.snapshots.length - 1, 'Nothing to redo', 'REDO_EMPTY');
    this.snapshotIndex++;
    return this.#restoreSnapshot('redo');
  }

  createBranch(name) {
    assert(/^[a-z0-9][a-z0-9._-]*$/i.test(name), 'Invalid branch name', 'INVALID_BRANCH');
    assert(!this.branches.has(name), `Branch already exists: ${name}`, 'BRANCH_EXISTS');
    this.branches.set(name, { revision: this.revision, document: deepClone(this.committedDocument) });
    return this.getState();
  }

  async checkoutBranch(name) {
    const branch = this.branches.get(name);
    assert(branch, `Unknown branch: ${name}`, 'UNKNOWN_BRANCH');
    this.branchName = name;
    this.committedDocument = deepClone(branch.document);
    this.revision++;
    this.previewState = null;
    this.committedResult = await this.evaluator.evaluate(this.committedDocument);
    this.committedValidation = await this.validateResult(this.committedResult);
    return this.getState();
  }

  async #restoreSnapshot(action) {
    this.committedDocument = deepClone(this.snapshots[this.snapshotIndex]);
    this.previewState = null;
    this.revision++;
    this.committedResult = await this.evaluator.evaluate(this.committedDocument);
    this.committedValidation = await this.validateResult(this.committedResult);
    this.history.push({ transactionId: action, committedRevision: this.revision, semanticSignature: this.committedResult.semanticSignature, validation: this.committedValidation.verdict });
    this.branches.set(this.branchName, { revision: this.revision, document: deepClone(this.committedDocument) });
    return this.getState();
  }

  getState() {
    const active = this.previewState?.result ?? this.committedResult;
    const validation = this.previewState?.validation ?? this.committedValidation;
    return {
      revision: this.revision,
      branch: this.branchName,
      branches: [...this.branches.keys()].sort(),
      preview: this.previewState ? {
        transactionId: this.previewState.transaction.transactionId,
        touched: [...this.previewState.touched],
        signature: this.previewState.previewSignature,
        validation: this.previewState.validation.verdict
      } : null,
      committedSignature: this.committedResult?.semanticSignature ?? null,
      activeSignature: active?.semanticSignature ?? null,
      validation,
      document: deepClone(this.previewState?.document ?? this.committedDocument),
      history: deepClone(this.history),
      canUndo: this.snapshotIndex > 0,
      canRedo: this.snapshotIndex < this.snapshots.length - 1,
      stages: active?.stages ?? []
    };
  }
}
