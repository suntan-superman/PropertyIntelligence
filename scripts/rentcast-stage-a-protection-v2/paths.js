import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export {REGISTRY,INPUTS,cleanEnvironment,REGRESSION_FILES} from '../rentcast-live-stage-a-v1/paths.js';
export const REPO=fileURLToPath(new URL('../../',import.meta.url));
export const CODE='scripts/rentcast-stage-a-protection-v2';
export const ROOT='data/runtime/rentcast-stage-a-protection-v2';
export const abs=p=>resolve(REPO,p);
export const FILES=['paths.js','policy.js','guard.js','bridge.js','worker.js','engine.js','run.js','successor.test.js','orchestration.test.js','qa.js','prepare.js'].map(n=>`${CODE}/${n}`);
export const REPORTS=['docs/PI_RENTCAST_STAGE_A_FINAL_PREFLIGHT.md','docs/PI_RENTCAST_STAGE_A_FINAL_PREFLIGHT_QA.md'];
export const DOCUMENTS=['docs/PI_RENTCAST_STAGE_A_OPERATOR_PREFLIGHT_CODEX.md','docs/PI_RENTCAST_STAGE_A_OPERATOR_PREFLIGHT_REVIEW.md','docs/PI_RENTCAST_STAGE_A_PREFLIGHT_COMPLETION_CODEX.md','docs/PI_RENTCAST_STAGE_A_PREFLIGHT_COMPLETION.md','docs/PI_RENTCAST_STAGE_A_PREFLIGHT_COMPLETION_QA.md','docs/PI_RENTCAST_STAGE_A_FINAL_AUTHORIZATION_CODEX.md'];
export const ADDITIONS=[...FILES,...REPORTS,...DOCUMENTS].sort();
export const PROPOSAL=`${ROOT}/membership-proposal.json`;
export const APPROVAL=`${ROOT}/membership-approval.json`;
// Earlier complete runs remain immutable; this selects the final hardened run.
export const PROOF=`${ROOT}/qa-proof-v3.json`;
export const PREWORK=`${ROOT}/preservation-before.json`;
