# Google Storage stream-listener warning correction

## Outcome

Property Intelligence no longer emits `MaxListenersExceededWarning` for each private Cloud Storage download under Node 22.12.0. Stored-byte SHA-256 checks, Google Storage CRC32C validation, private access, and fail-closed download behavior remain unchanged.

## Root cause

The warning originated in the installed Google transport stack, not in a PI listener registry:

- `firebase-admin` 14.5.0
- `@google-cloud/storage` 8.4.0
- `teeny-request` 11.1.1

In stream mode, `teeny-request` used a second `stream.pipeline()` around the `node-fetch` response body after Google Storage had already installed its validation pipeline. The combined library wiring placed 11 `error` and 11 `close` listeners on a single response `PassThrough`, exceeding Node's default diagnostic threshold of 10 for every download. The upstream issue is <https://github.com/googleapis/google-cloud-node/issues/9185>.

This was a false leak warning for a single download, but the repeated terminal output obscured real warnings and was therefore corrected.

## Correction

`scripts/apply-dependency-patches.js` applies a version-pinned lifecycle patch to `teeny-request` 11.1.1 during `npm install`/`npm ci`. It replaces only the overlapping stream bridge with a backpressured pipe and explicit lifecycle handling:

- response errors destroy the consumer stream with the original error;
- premature upstream closure fails the download;
- downstream cancellation destroys the upstream response;
- cancellation before response headers destroys the late response body.

The patch fails closed if the installed package version or expected source changes. It does not raise `EventEmitter.defaultMaxListeners`, filter process warnings, disable validation, or change Firebase authorization.

Remove the patch only after an official Storage transport release provides equivalent lifecycle behavior and the regression test passes without it.

## Local verification

- `npm run test:storage-transport`: 3 passed
  - complete byte-accurate download emits no listener warning;
  - incorrect CRC32C is rejected;
  - premature response closure cannot succeed.
- `npm run pi:v2.5:documents:test`: 55 passed.
- `npm run web:build`: passed.

An already-running Node process must be restarted because it has the previous dependency module loaded in memory.
