// Fixed repository-local registry. No environment, CLI or caller path override.
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export const REPO=fileURLToPath(new URL('../../',import.meta.url));
export const CODE='scripts/rentcast-live-stage-a-v1';
export const ROOT='data/runtime/rentcast-financial-controlled-client-v1/live-stage-a-v1';
export const REGISTRY=`${ROOT}/registry`;
export const INPUTS=`${ROOT}/operator-inputs`;
export const CERTIFICATE=`${ROOT}/offline-certification.json`;
export const abs=p=>resolve(REPO,p);
export const FILES=['paths.js','guard.js','source.js','worker.js','bridge.js','preflight.js','transport.js','engine.js','run.js','fixtures.js','stage-a.test.js','qa.js'].map(f=>`${CODE}/${f}`);
export const REPORTS=['','_QA','_NEXT_GATES'].map(s=>`docs/PI_RENTCAST_FINANCIAL_LIVE_STAGE_A_V1${s}.md`);
export const NEW_FILES=[...FILES,...REPORTS];
export const REGRESSION_FILES=['scripts/rentcast-financial-controlled-client-v1/client.test.js','tests/foundation.test.js','tests/runtime.test.js','scripts/rentcast-reconciliation-v1-1/reconcile.test.js','scripts/protected-baselines-v3/reconciliation.test.js','scripts/mls-validation-round1/harness.test.js','scripts/mls-validation-round1/gate1b-identity-audit.test.js','scripts/real-financial-evidence-v1/audit.test.js'];
export const cleanEnvironment=()=>Object.fromEntries(Object.entries(process.env).filter(([k])=>/^(?:path|systemroot|windir|comspec|pathext)$/i.test(k)));
