import {readFile,writeFile,mkdir,lstat,readdir} from 'node:fs/promises';
import {resolve,relative,join,sep,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {fingerprint} from './model.js';
import {monteCarloReport} from './monteCarloAdapter.js';
import {investorReportHtml} from './html.js';
import {renderInvestorPdf} from './pdf.js';
import {MC_RENDERER_VERSION} from './monteCarloHtml.js';
import {PRESENTATION_VERSION,PRESENTATION_RENDERER} from './presentation.js';
import {CERTIFICATE_PATH,CERTIFICATE_SHA,CERTIFIED_SOURCE_BUNDLE,executionFor,ensure} from './analysisTrust.js';

export const PACKAGE_VERSION='pi-synthetic-investor-package-v1';
export const PRESENTATION_PACKAGE_VERSION='pi-synthetic-investor-package-v1.1';
export const ROOT=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
export const OUTPUT_ROOT=join(ROOT,'data/validation/investor-report-v1/mc-integration');
const SOURCES=['analysisTrust','model','monteCarloAdapter','html','monteCarloHtml','presentation','pdf','frozenPackage'].map(n=>`src/reports/investor-v1/${n}.js`);
const FILES=['analysis.json','execution.json','inputs.json','report.html','report.json','report.pdf','runtime.json','sources.json'];
const documentProfile=version=>{ensure(['mc-integration-v1',PRESENTATION_VERSION].includes(version),'REPORT_VERSION');return version===PRESENTATION_VERSION?
  {packageVersion:PRESENTATION_PACKAGE_VERSION,renderer:PRESENTATION_RENDERER,files:[...FILES,'appendix.html','appendix.pdf'].sort(),documents:[['report','full'],['appendix','appendix']]}:
  {packageVersion:PACKAGE_VERSION,renderer:MC_RENDERER_VERSION,files:FILES,documents:[['report','full']]};};
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=value=>JSON.stringify(value,null,2)+'\n';
const parse=bytes=>JSON.parse(bytes.toString('utf8'));
const inOutput=path=>{const full=resolve(path),rel=relative(OUTPUT_ROOT,full);ensure(rel!==''&&!rel.startsWith(`..${sep}`)&&rel!=='..'&&!isAbsolute(rel),'OUTPUT_SCOPE');return full;};
export async function sourceBundle(){
  const hashes=Object.fromEntries(await Promise.all([...SOURCES,'package.json','package-lock.json'].map(async p=>[p,sha(await readFile(join(ROOT,p)))])));
  return {hashes,fingerprint:fingerprint(hashes)};
}
export async function verifyCertifiedSource(){
  const bytes=await readFile(join(ROOT,CERTIFICATE_PATH));ensure(sha(bytes)===CERTIFICATE_SHA,'CERTIFICATE_CHANGED');const cert=parse(bytes);
  ensure(cert.status==='MONTE CARLO V1 CERTIFIED'&&cert.sourceBundleFingerprint===CERTIFIED_SOURCE_BUNDLE,'CERTIFICATE_VERSION');
  ensure(fingerprint(cert.sourceHashes)===CERTIFIED_SOURCE_BUNDLE,'CERTIFICATE_BUNDLE');
  for(const [p,h] of Object.entries(cert.sourceHashes))ensure(sha(await readFile(join(ROOT,p)))===h,'CERTIFIED_SOURCE_CHANGED');
  ensure(process.version===cert.runtime,'RUNTIME_NOT_CERTIFIED');return cert;
}
export const newPackageId=()=>`SYNTHETIC-${randomUUID().toUpperCase()}`;

/** Append-only at application level. No filesystem immutability/signature claim. */
export async function freezeReport(result,{outputRoot,packageId=newPackageId(),generatedAt=new Date().toISOString(),reportVersion='mc-integration-v1'}={}){
  await verifyCertifiedSource();const execution=executionFor(result),source=await sourceBundle();
  const profile=documentProfile(reportVersion),model=monteCarloReport(result,execution,{packageId,generatedAt,reportVersion});
  const parent=inOutput(outputRoot),directory=inOutput(join(parent,packageId));await mkdir(parent,{recursive:true});
  // Never replace an existing directory, including an incomplete prior attempt.
  await mkdir(directory,{recursive:false});
  const documents={},diagnostics={};
  for(const [name,kind] of profile.documents){const rendered=await renderInvestorPdf(model,{kind});
    ensure(rendered.diagnostics.requests===0&&!rendered.diagnostics.consoleErrors.length&&!rendered.diagnostics.pageErrors.length,'BROWSER_DIAGNOSTICS');
    documents[`${name}.html`]=investorReportHtml(model,{kind});documents[`${name}.pdf`]=rendered.bytes;diagnostics[name]=rendered.diagnostics;
  }
  const puppeteer=JSON.parse(await readFile(join(ROOT,'node_modules/puppeteer/package.json'),'utf8')).version;
  const runtime={node:process.version,puppeteer,browser:diagnostics.report.browserVersion,renderer:profile.renderer,
    transport:'LOCAL_PIPE',print:{format:'Letter',printBackground:true,preferCSSPageSize:true,headerFooter:true},diagnostics:diagnostics.report,
    ...(reportVersion===PRESENTATION_VERSION?{documentDiagnostics:diagnostics}:{})};
  const content={'inputs.json':json(result.inputs),'analysis.json':json(result),'execution.json':json(execution),'report.json':json(model),
    ...documents,'runtime.json':json(runtime),'sources.json':json(source)};
  const artifacts={};for(const name of profile.files){const bytes=Buffer.from(content[name]);await writeFile(join(directory,name),bytes,{flag:'wx',mode:0o600});artifacts[name]={sha256:sha(bytes),bytes:bytes.length};}
  ensure(fingerprint(source)===fingerprint(await sourceBundle()),'REPORT_SOURCE_CHANGED_DURING_RENDER');await verifyCertifiedSource();
  const manifest={packageVersion:profile.packageVersion,status:'FROZEN',packageId,generatedAt,scope:'LOCAL_SYNTHETIC_ONLY',execution,
    ...(reportVersion===PRESENTATION_VERSION?{reportVersion}:{}),
    reportModelVersion:model.modelVersion,reportModelFingerprint:model.modelFingerprint,rendererVersion:profile.renderer,
    reportSourceBundleFingerprint:source.fingerprint,artifacts,
    authentication:'Unsigned local integrity package. Requires a separately trusted receipt; checksums do not authenticate authors.'};
  const manifestBytes=Buffer.from(json(manifest));await writeFile(join(directory,'manifest.json'),manifestBytes,{flag:'wx',mode:0o600});
  // Returned to a separate run-level receipt, never trusted merely because it is
  // supplied from inside the package being verified.
  const receipt={packageVersion:profile.packageVersion,packageId,manifestSha256:sha(manifestBytes),executionFingerprint:fingerprint(execution),
    reportSourceBundleFingerprint:source.fingerprint,runtimeFingerprint:fingerprint(runtime)};
  await verifyPackage(directory,{receipt});return {directory,receipt,manifest,model,diagnostics:diagnostics.report,documentDiagnostics:diagnostics};
}

export async function verifyPackage(directory,{receipt}={}){
  ensure(receipt&&[PACKAGE_VERSION,PRESENTATION_PACKAGE_VERSION].includes(receipt.packageVersion),'TRUSTED_RECEIPT_REQUIRED');
  const version=receipt.packageVersion===PRESENTATION_PACKAGE_VERSION?PRESENTATION_VERSION:'mc-integration-v1',profile=documentProfile(version);
  ensure(!((await lstat(directory)).isSymbolicLink()),'SYMLINK');
  const names=(await readdir(directory)).sort();ensure(JSON.stringify(names)===JSON.stringify([...profile.files,'manifest.json'].sort()),'FILE_SET');
  for(const name of names){const stat=await lstat(join(directory,name));ensure(stat.isFile()&&!stat.isSymbolicLink(),'FILE_TYPE');}
  const mb=await readFile(join(directory,'manifest.json'));ensure(sha(mb)===receipt.manifestSha256,'MANIFEST_TAMPERED');const m=parse(mb);
  ensure(m.packageVersion===profile.packageVersion&&m.status==='FROZEN'&&m.scope==='LOCAL_SYNTHETIC_ONLY'&&m.packageId===receipt.packageId,'MANIFEST_STRUCTURE');
  ensure(m.rendererVersion===profile.renderer&&(version!==PRESENTATION_VERSION||m.reportVersion===version),'RENDERER_VERSION');
  ensure(JSON.stringify(Object.keys(m.artifacts).sort())===JSON.stringify(profile.files),'ARTIFACT_SET');
  const files={};for(const name of profile.files){const b=await readFile(join(directory,name)),a=m.artifacts[name];ensure(a&&sha(b)===a.sha256&&b.length===a.bytes,'ARTIFACT_TAMPERED');files[name]=b;}
  const result=parse(files['analysis.json']),execution=executionFor(result);
  ensure(fingerprint(execution)===fingerprint(m.execution)&&fingerprint(execution)===receipt.executionFingerprint&&fingerprint(execution)===fingerprint(parse(files['execution.json'])),'EXECUTION_MISMATCH');
  ensure(fingerprint(result.inputs)===fingerprint(parse(files['inputs.json'])),'INPUT_MISMATCH');
  const model=monteCarloReport(result,execution,{packageId:m.packageId,generatedAt:m.generatedAt,reportVersion:version});
  ensure(fingerprint(model)===fingerprint(parse(files['report.json']))&&model.modelFingerprint===m.reportModelFingerprint&&model.modelVersion===m.reportModelVersion,'REPORT_MAPPING_MISMATCH');
  for(const [name,kind] of profile.documents){
    ensure(investorReportHtml(model,{kind})===files[`${name}.html`].toString('utf8'),'HTML_MAPPING_MISMATCH');
    ensure(files[`${name}.pdf`].subarray(0,5).toString()==='%PDF-','PDF_HEADER');
  }
  const source=parse(files['sources.json']);ensure(fingerprint(source.hashes)===source.fingerprint&&source.fingerprint===m.reportSourceBundleFingerprint&&source.fingerprint===receipt.reportSourceBundleFingerprint,'SOURCE_BINDING');
  ensure(fingerprint(source)===fingerprint(await sourceBundle()),'REPORT_SOURCE_VERSION');
  const runtime=parse(files['runtime.json']);ensure(fingerprint(runtime)===receipt.runtimeFingerprint&&runtime.node===execution.runtime&&runtime.renderer===profile.renderer,'RUNTIME_BINDING');
  await verifyCertifiedSource();return {status:'PASS',packageId:m.packageId,filesVerified:profile.files.length,manifestSha256:receipt.manifestSha256,resultFingerprint:result.provenance.resultFingerprint};
}
