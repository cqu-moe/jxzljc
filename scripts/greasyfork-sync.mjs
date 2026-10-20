import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';

const { GITHUB_EVENT_NAME, GITHUB_REF, GITHUB_REPOSITORY, GITHUB_SHA,
  GREASY_FORK_WEBHOOK_SECRET: secret, GREASY_FORK_SCRIPT_ID: scriptId } = process.env;

if (GITHUB_EVENT_NAME !== 'push' || GITHUB_REF !== 'refs/heads/main') {
  throw new Error('Greasy Fork synchronization requires a push to main.');
}
if (!secret || !/^\d+$/.test(scriptId ?? '')) {
  throw new Error('Greasy Fork webhook secret and script ID must be configured.');
}
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const body = JSON.stringify({
  ref: GITHUB_REF,
  repository: {
    html_url: `https://github.com/${GITHUB_REPOSITORY}`,
    clone_url: `https://github.com/${GITHUB_REPOSITORY}.git`,
  },
  commits: [{ id: GITHUB_SHA, message: event.head_commit.message, modified: ['jxzljc.user.js'] }],
});
// Greasy Fork's GitHub webhook currently requires the SHA-1 signature header.
const signature = createHmac('sha1', secret).update(body).digest('hex');
const response = await fetch('https://api.greasyfork.org/zh-CN/users/1654847-doubleu/webhook', {
  method: 'POST',
  redirect: 'error',
  headers: {
    'Content-Type': 'application/json',
    'X-GitHub-Event': 'push',
    'X-Hub-Signature': `sha1=${signature}`,
  },
  body,
  signal: AbortSignal.timeout(90000),
});
if (!response.ok) throw new Error(`Greasy Fork webhook failed (HTTP ${response.status}).`);
const result = await response.json();
if (!Array.isArray(result.updated_failed) || result.updated_failed.length ||
    !Array.isArray(result.updated_scripts) || !result.updated_scripts.some(value => {
      const url = new URL(value);
      return url.hostname === 'greasyfork.org' && url.pathname.match(/\/scripts\/(\d+)(?:-|\/|$)/)?.[1] === scriptId;
    })) {
  throw new Error('Greasy Fork did not confirm synchronization of the configured script.');
}
console.log(`Greasy Fork script ${scriptId} synchronized from tested commit ${GITHUB_SHA}.`);
