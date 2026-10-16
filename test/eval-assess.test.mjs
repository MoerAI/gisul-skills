import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { experimentSpan, exportRun, verifyItem } from '../eval/export.mjs';
import { scoreCase } from '../eval/score.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const judgeInfo = { sourceKind: 'fixture', id: 'fixture', version: 'fixture-v1', model: 'fixture' };

async function runFixture(t, { profile = 'baseline', cost = 0.01, usage = { totalTokens: 10 } } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'eval-review-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cases = ['Q-01', 'Q-02'].map((id, index) => ({
    id, kind: 'context', split: index ? 'holdout' : 'development', critical: !index,
    input: { prompt: 'What is 2 + 2?', fixtures: [] },
    expected: { rubric: 'The response must answer the arithmetic question correctly.', max_loads: 0, max_searches: 0 },
    fixture: 'synthetic-fixture',
  }));
  const schedule = cases.map((item, index) => ({ id: `slot-${index}`, caseId: item.id, profile, workspace: `/fixture/${index}` }));
  const protocol = {
    schema: 1, id: `fixture-${profile}`, createdAt: '2026-10-01T00:00:00.000Z',
    dataset: { name: 'qa-mechanics-fixture', version: sha(JSON.stringify(cases)), totalCases: cases.length },
    profile, sourceCommit: 'a'.repeat(40), codexVersion: 'fixture-v1', model: 'fixture-model', effort: 'max',
    maxTokens: 1000, concurrency: 1, timeoutMs: 1000,
    instructions: { baseline: 'baseline fixture', candidate: 'candidate fixture' },
    instructionHashes: { baseline: sha('baseline fixture'), candidate: sha('candidate fixture') },
    loaderMarkdown: 'fixture loader', reader: { commit: 'b'.repeat(40), release: 'fixture', bundleHash: 'c'.repeat(64) },
    prices: { kind: 'fixture-not-an-account-bill' }, fileHashes: { 'fixture.mjs': 'd'.repeat(64) },
    commonInstructions: 'fixture', schedule, preflight: false, fullDataset: true, synthetic: true,
    humanRatings: 0, semanticJudge: null, promotion: 'not_evaluated',
  };
  protocol.hash = sha(JSON.stringify(protocol));
  const entries = [];
  for (const slot of schedule) {
    const item = cases.find(item => item.id === slot.caseId);
    const result = {
      id: slot.id, caseId: item.id, split: item.split, critical: item.critical, profile, protocolHash: protocol.hash,
      synthetic: true, threadId: `fixture-thread-${slot.id}`, turnId: `fixture-turn-${slot.id}`,
      startedAt: '2026-10-01T00:00:00.000Z', endedAt: '2026-10-01T00:00:01.000Z', status: 'completed',
      finalText: '4', files: {}, items: [{ type: 'agentMessage', text: '4' }], mockEvents: [], gisulEvents: [],
      usage, estimatedCost: cost,
    };
    result.grading = scoreCase(item, result);
    const bytes = json(result);
    await mkdir(join(root, 'runs', slot.id), { recursive: true });
    await writeFile(join(root, 'runs', slot.id, 'result.json'), bytes);
    entries.push({ slot, item, result, resultHash: sha(bytes) });
  }
  await writeFile(join(root, 'protocol.json'), json(protocol));
  await writeFile(join(root, 'cases.private.json'), json(cases));
  await writeFile(join(root, 'phase.json'), json({ protocolHash: protocol.hash, stopped: null, runs: entries.map(({ slot, resultHash }) => ({ ...slot, status: 'completed', resultHash })) }));
  await writeFile(join(root, 'summary.json'), json({ protocolHash: protocol.hash, scheduled: 2, completed: 2, failed: 0 }));
  return { root, protocol, cases, entries };
}

function judgment(item, verdict = 'pass') {
  return { caseId: item.id, checks: [{ name: 'semantic_rubric', verdict, reason: 'Synthetic test judgment.', evidence: [{ path: '/response/finalText', quote: '4' }] }] };
}

async function reviewedFixture(t) {
  const fixture = await runFixture(t);
  const artifact = {
    schema: 1, kind: 'semantic-assessment', protocolHash: fixture.protocol.hash,
    casebookHash: fixture.protocol.dataset.version, processorHash: 'e'.repeat(64),
    createdAt: '2026-10-01T00:00:02.000Z', judge: judgeInfo,
    entries: fixture.entries.map(({ item, resultHash }) => {
      const review = judgment(item);
      return { caseId: item.id, resultHash, expectedHash: sha(JSON.stringify(item.expected)), promptHash: 'f'.repeat(64), observableStatus: 'pass', status: 'pass', judgment: review, responseHash: sha(JSON.stringify(review)) };
    }),
  };
  const bytes = json(artifact);
  await writeFile(join(fixture.root, 'semantic-assessment.json'), bytes);
  return { ...fixture, artifact, artifactHash: sha(bytes) };
}

test('export retains optional semantic review evidence without relabeling frozen grading', async t => {
  const fixture = await reviewedFixture(t);
  const before = await readFile(join(fixture.root, 'runs/slot-0/result.json'));
  const preview = await exportRun(fixture.root, 'fixture-project');
  assert.equal(preview.execution.reviews?.semanticHash, fixture.artifactHash);
  assert.equal(preview.execution.reviews.humanRatings, 0);
  assert.deepEqual(await readFile(join(fixture.root, 'runs/slot-0/result.json')), before);
  assert.equal(fixture.entries[0].result.grading.status, 'unverified');
});

test('export refuses semantic evidence bound to a different frozen result', async t => {
  const fixture = await reviewedFixture(t);
  fixture.artifact.entries[0].resultHash = '0'.repeat(64);
  await writeFile(join(fixture.root, 'semantic-assessment.json'), json(fixture.artifact));
  await assert.rejects(exportRun(fixture.root, 'fixture-project'), { code: 'REVIEW_RESULT_MISMATCH' });
});

test('export refuses review protocol and expected-contract drift', async t => {
  for (const [field, code] of [['protocolHash', 'REVIEW_PROTOCOL_MISMATCH'], ['expectedHash', 'REVIEW_EXPECTED_MISMATCH']]) {
    await t.test(field, async sub => {
      const fixture = await reviewedFixture(sub);
      if (field === 'protocolHash') fixture.artifact.protocolHash = '0'.repeat(64);
      else fixture.artifact.entries[0].expectedHash = '0'.repeat(64);
      await writeFile(join(fixture.root, 'semantic-assessment.json'), json(fixture.artifact));
      await assert.rejects(exportRun(fixture.root, 'fixture-project'), { code });
    });
  }
});

test('assessment records the prompt actually sent and preserves all frozen execution files', async t => {
  const { assessRun } = await import('../eval/semantic-assessment.mjs');
  const fixture = await runFixture(t), sent = [];
  const files = ['protocol.json', 'cases.private.json', 'phase.json', 'summary.json', 'runs/slot-0/result.json', 'runs/slot-1/result.json'];
  const before = await Promise.all(files.map(file => readFile(join(fixture.root, file))));
  const artifact = await assessRun(fixture.root, {
    judgeInfo, write: true,
    judge: async request => { sent.push(request); return judgment({ id: request.caseId }); },
  });
  assert.equal(sent.length, 2);
  assert.ok(artifact.entries.every(entry => entry.status === 'pass'));
  assert.equal(artifact.protocolHash, fixture.protocol.hash);
  for (const entry of artifact.entries) {
    assert.equal(entry.promptHash, sha(sent.find(request => request.caseId === entry.caseId).prompt));
    assert.equal(entry.resultHash, fixture.entries.find(item => item.item.id === entry.caseId).resultHash);
  }
  assert.deepEqual(await Promise.all(files.map(file => readFile(join(fixture.root, file)))), before);
  assert.deepEqual(JSON.parse(await readFile(join(fixture.root, 'semantic-assessment.json'))), artifact);
  await assert.rejects(assessRun(fixture.root, { judgeInfo, write: true, judge: () => assert.fail('an immutable review must not spend again') }), { code: 'REVIEW_EXISTS' });
});

test('judgment cannot cite expected answers or invented response text as execution evidence', async t => {
  const { assessRun } = await import('../eval/semantic-assessment.mjs');
  for (const evidence of [{ path: '/expected/rubric', quote: 'correctly' }, { path: '/response/finalText', quote: 'invented' }]) {
    const fixture = await runFixture(t);
    await assert.rejects(assessRun(fixture.root, {
      judgeInfo, write: true,
      judge: async request => {
        const review = judgment({ id: request.caseId });
        review.checks[0].evidence = [evidence];
        return review;
      },
    }), { code: 'REVIEW_EVIDENCE_MISMATCH' });
    await assert.rejects(readFile(join(fixture.root, 'semantic-assessment.json')), { code: 'ENOENT' });
    await assert.rejects(readFile(join(fixture.root, 'langfuse-export.lock')), { code: 'ENOENT' });
  }
});

test('changed execution bytes and frozen export intent stop assessment before any judge call', async t => {
  const { assessRun } = await import('../eval/semantic-assessment.mjs');
  for (const frozen of [false, true]) {
    const fixture = await runFixture(t);
    if (frozen) await writeFile(join(fixture.root, 'langfuse-upload-intent.json'), json({ protocolHash: fixture.protocol.hash, spans: { existing: '0'.repeat(64) } }));
    else await writeFile(join(fixture.root, 'runs/slot-0/result.json'), json({ ...fixture.entries[0].result, finalText: 'changed after execution' }));
    await assert.rejects(assessRun(fixture.root, {
      judgeInfo, write: true, judge: () => assert.fail('invalid frozen evidence must not invoke a judge'),
    }), { code: frozen ? 'REVIEW_EXPORT_FROZEN' : 'REVIEW_RESULT_MISMATCH' });
  }
});

test('review writing excludes an exporter until the exact in-flight judge finishes', { timeout: 10000 }, async t => {
  const { assessRun } = await import('../eval/semantic-assessment.mjs');
  const fixture = await runFixture(t);
  let entered, release;
  const started = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const writing = assessRun(fixture.root, {
    judgeInfo, write: true,
    judge: async request => { entered(); await gate; return judgment({ id: request.caseId }); },
  });
  try {
    await Promise.race([started, writing.then(() => assert.fail('judge entry must precede completion'))]);
    await assert.rejects(exportRun(fixture.root, 'fixture-project', { apply: true, api: { request: () => assert.fail('the competing exporter must not write') } }), { code: 'EEXIST' });
  } finally { release(); await writing; }
  await assert.rejects(readFile(join(fixture.root, 'langfuse-export.lock')), { code: 'ENOENT' });
});

test('unknown usage remains unverified even when a judge would approve the answer', async t => {
  const { assessRun } = await import('../eval/semantic-assessment.mjs');
  const fixture = await runFixture(t, { usage: null });
  const artifact = await assessRun(fixture.root, { judgeInfo, write: true, judge: async request => judgment({ id: request.caseId }) });
  assert.deepEqual(artifact.entries.map(entry => entry.status), ['unverified', 'unverified']);
  assert.ok(artifact.entries.every(entry => entry.judgment === null && entry.promptHash === null));
});

test('optional review readback preserves per-case binding while raw grading stays unverified', async t => {
  const fixture = await reviewedFixture(t);
  const span = experimentSpan(fixture.protocol, fixture.cases[0], fixture.entries[0].result, 'dataset-id', {
    scheduled: 2, reviews: { semanticHash: fixture.artifactHash, humanRatings: 0 },
    review: { semantic: { assessmentHash: fixture.artifactHash, judge: judgeInfo, entry: fixture.artifact.entries[0] } },
  });
  const values = Object.fromEntries(span.attributes.map(attribute => [attribute.key, attribute.value.stringValue]));
  const row = {
    id: span.spanId, traceId: span.traceId, environment: 'evaluation', experimentDatasetId: 'dataset-id',
    input: JSON.parse(values['langfuse.observation.input']), output: JSON.parse(values['langfuse.observation.output']),
    expectedOutput: JSON.parse(values['langfuse.experiment.item.expected_output']), metadata: JSON.parse(values['langfuse.observation.metadata']),
    experimentMetadata: { protocol_hash: fixture.protocol.hash, execution: JSON.parse(values['langfuse.experiment.metadata.execution']) },
  };
  assert.equal(row.metadata.reviews?.semantic?.entry?.resultHash, fixture.entries[0].resultHash);
  assert.equal(row.output.grading.status, 'unverified');
  assert.equal(Object.hasOwn(row.experimentMetadata.execution, 'review'), false);
  verifyItem(row, span, fixture.protocol, 'dataset-id');
  delete row.metadata.reviews.semantic.entry.resultHash;
  assert.throws(() => verifyItem(row, span, fixture.protocol, 'dataset-id'), /Remote metadata/);
});

test('unscheduled phase entries cannot stand in for missing frozen cases', async t => {
  const { readRunSnapshot } = await import('../eval/semantic-assessment.mjs');
  const fixture = await runFixture(t);
  const phase = JSON.parse(await readFile(join(fixture.root, 'phase.json')));
  phase.runs[0] = { id: 'unscheduled', status: 'not_run' };
  await writeFile(join(fixture.root, 'phase.json'), json(phase));
  await assert.rejects(readRunSnapshot(fixture.root), { code: 'REVIEW_SCHEDULE_MISMATCH' });
});
