import {validateResult,fingerprint,deepFreeze,MODEL_VERSION,ECONOMICS_VERSION} from '../../analysis/monteCarlo/contract.js';

// Reviewed local synthetic certificate only. This is an allowlist, not a signature.
export const ADAPTER_VERSION='investor-mc-adapter-v1';
export const SYNTHETIC_NOTICE='SYNTHETIC DEMONSTRATION — NOT A REAL PROPERTY OR INVESTMENT OFFER';
export const CERTIFICATE_PATH='data/validation/monte-carlo-v1/2026-10-09T17-55-37-247Z/summary.json';
export const CERTIFICATE_SHA='cdf3f589dccab37daf193677603ff50d23c87a7993375e211c5bd6b09c646300';
export const CERTIFIED_SOURCE_BUNDLE='94682d485c61b3027cd5c06216886c0954e9d6c08be9edc47be0ce8201c55661';
export const APPROVED_RESULTS=Object.freeze({
  SYNTHETIC_MC_A_STRONG_MARGIN:'b854e2c29320e50adda00c821763922bef9a22d51fb03253416176a99c82266f',
  SYNTHETIC_MC_B_MARGINAL:'c8c6fc92afdd229614e2a335735ae270cf928773e0340b4b314460d784cc89b1',
  SYNTHETIC_MC_C_RENOVATION_OVERRUN:'4a88b988d5e22c54adb616e635ab7f95946f58921188d706750be34e8395d38f'
});
export function ensure(ok,code){if(!ok)throw new Error(`REPORT_MC_${code}`);}
export function executionFor(result){
  validateResult(result);
  ensure(result.modelVersion===MODEL_VERSION&&result.economicsVersion===ECONOMICS_VERSION,'VERSION');
  ensure(Object.hasOwn(APPROVED_RESULTS,result.inputs.scenarioId),'SYNTHETIC_IDENTITY_NOT_APPROVED');
  ensure(Object.values(result.inputs.provenance).every(p=>p.classification==='SYNTHETIC_TEST_FIXTURE'),'SOURCE_NOT_AUTHORIZED');
  ensure(!result.riskAdjustedMao||result.riskAdjustedMao.rule.provenance.classification==='SYNTHETIC_TEST_FIXTURE','RISK_SOURCE_NOT_AUTHORIZED');
  ensure(APPROVED_RESULTS[result.inputs.scenarioId]===result.provenance.resultFingerprint,'RESULT_NOT_APPROVED');
  // Exact certified result binding also prevents rehashed extra PII/unknown content.
  return deepFreeze({scope:'LOCAL_SYNTHETIC_ONLY',scenarioId:result.inputs.scenarioId,
    modelVersion:result.modelVersion,economicsVersion:result.economicsVersion,
    assumptionsVersion:result.inputs.assumptionsVersion,seed:result.simulation.seed,iterations:result.simulation.iterations,
    inputFingerprint:result.provenance.inputFingerprint,modelFingerprint:result.provenance.modelFingerprint,
    resultFingerprint:result.provenance.resultFingerprint,sourceBundleFingerprint:CERTIFIED_SOURCE_BUNDLE,
    certificateSha256:CERTIFICATE_SHA,runtime:'v22.12.0'});
}
export function validateCertifiedAnalysis(section){
  ensure(section&&Object.keys(section).sort().join(',')==='adapterVersion,execution,result','ANALYSIS_SECTION');
  ensure(section.adapterVersion===ADAPTER_VERSION,'ADAPTER_VERSION');
  const approved=executionFor(section.result);
  ensure(fingerprint(approved)===fingerprint(section.execution),'EXECUTION_IDENTITY_MISMATCH');
  return structuredClone(section);
}
