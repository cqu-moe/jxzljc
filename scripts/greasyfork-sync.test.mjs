import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function run({ status = 200, result = { updated_scripts: ['https://greasyfork.org/en/scripts/123-example'], updated_failed: [] }, env = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'greasyfork-sync-'));
  try {
    const eventPath = join(dir, 'event.json');
    writeFileSync(eventPath, JSON.stringify({ head_commit: { message: 'Release fixture' } }));
    const preload = `
      import assert from 'node:assert/strict';
      import { createHmac } from 'node:crypto';
      globalThis.fetch = async (url, options) => {
        assert.equal(url, 'https://api.greasyfork.org/zh-CN/users/1654847-doubleu/webhook');
        assert.equal(options.method, 'POST');
        assert.equal(options.redirect, 'error');
        assert.equal(options.headers['X-GitHub-Event'], 'push');
        assert.equal(options.headers['X-Hub-Signature'], 'sha1=' + createHmac('sha1', 'fixture-secret').update(options.body).digest('hex'));
        const body = JSON.parse(options.body);
        assert.equal(body.ref, 'refs/heads/main');
        assert.equal(body.repository.html_url, 'https://github.com/cqu-moe/jxzljc');
        assert.equal(body.repository.clone_url, 'https://github.com/cqu-moe/jxzljc.git');
        assert.equal(body.commits[0].id, 'abc123');
        assert.equal(body.commits[0].message, 'Release fixture');
        assert.deepEqual(body.commits[0].modified, ['jxzljc.user.js']);
        return new Response(JSON.stringify(${JSON.stringify(result)}), { status: ${status} });
      };
    `;
    return spawnSync(process.execPath, ['--import', 'data:text/javascript,' + encodeURIComponent(preload), 'scripts/greasyfork-sync.mjs'], {
      encoding: 'utf8',
      env: { ...process.env, GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main',
        GITHUB_REPOSITORY: 'cqu-moe/jxzljc', GITHUB_SHA: 'abc123', GITHUB_EVENT_PATH: eventPath,
        GREASY_FORK_WEBHOOK_SECRET: 'fixture-secret', GREASY_FORK_SCRIPT_ID: '123', ...env },
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('sends a signed notification for the tested commit and requires the matching script receipt', () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /123.*abc123/);
});

for (const [name, options, message] of [
  ['HTTP failure', { status: 503 }, /HTTP 503/],
  ['provider failure', { result: { updated_scripts: [], updated_failed: ['https://greasyfork.org/en/scripts/123-example'] } }, /did not confirm/],
  ['no matching script', { result: { updated_scripts: ['https://greasyfork.org/en/scripts/1234-other'], updated_failed: [] } }, /did not confirm/],
  ['missing secret', { env: { GREASY_FORK_WEBHOOK_SECRET: '' } }, /must be configured/],
  ['pull request', { env: { GITHUB_EVENT_NAME: 'pull_request' } }, /push to main/],
  ['other branch', { env: { GITHUB_REF: 'refs/heads/feature' } }, /push to main/],
]) {
  test(`rejects ${name}`, () => {
    const result = run(options);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, message);
    assert.doesNotMatch(result.stdout + result.stderr, /fixture-secret/);
  });
}
