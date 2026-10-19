import {readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const jwksPackagePath=resolve(root,'node_modules/jwks-rsa/package.json');
const jwksSourcePath=resolve(root,'node_modules/jwks-rsa/src/utils.js');
const jwksPassportPath=resolve(root,'node_modules/jwks-rsa/src/integrations/passport.js');
const jwksSupportedVersion='4.1.0';
const jwksMarker='PI_JWKS_ESM_INTEROP_PATCH_v1';
const jwksPassportMarker='PI_JWKS_PASSPORT_ESM_INTEROP_PATCH_v1';

try{
  const jwksManifest=JSON.parse(await readFile(jwksPackagePath,'utf8'));
  if(jwksManifest.version!==jwksSupportedVersion)throw new Error(`Unsupported jwks-rsa ${jwksManifest.version}; review the jose ESM bridge before updating the patch for ${jwksSupportedVersion}.`);
  let jwksSource=await readFile(jwksSourcePath,'utf8');
  if(jwksSource.includes(jwksMarker))console.log(`Dependency patch already present: jwks-rsa ${jwksSupportedVersion} jose ESM bridge.`);
  else{
    const importBefore="const jose = require('jose');";
    const functionBefore='async function retrieveSigningKeys(jwks) {\n  const results = [];';
    const functionAfter=`async function retrieveSigningKeys(jwks) {
  // ${jwksMarker}: jose v6 is ESM-only; loading it asynchronously keeps the
  // CommonJS jwks-rsa API compatible in Netlify's Node runtime.
  const jose = await import('jose');
  const results = [];`;
    if(!jwksSource.includes(importBefore)||!jwksSource.includes(functionBefore))throw new Error(`Cannot apply jwks-rsa ${jwksSupportedVersion} patch: expected jose import source was not found.`);
    jwksSource=jwksSource.replace(`${importBefore}\n`, '').replace(functionBefore,functionAfter);
    await writeFile(jwksSourcePath,jwksSource,'utf8');
    console.log(`Applied dependency patch: jwks-rsa ${jwksSupportedVersion} jose ESM bridge.`);
  }
  let passportSource=await readFile(jwksPassportPath,'utf8');
  if(passportSource.includes(jwksPassportMarker))console.log(`Dependency patch already present: jwks-rsa ${jwksSupportedVersion} passport jose ESM bridge.`);
  else{
    const importBefore="const jose = require('jose');\n";
    const providerBefore='  return function secretProvider(req, rawJwtToken, cb) {\n    let decoded;\n    try {';
    const providerAfter=`  return async function secretProvider(req, rawJwtToken, cb) {
    let decoded;
    try {
      // ${jwksPassportMarker}: jose v6 is ESM-only.
      const jose = await import('jose');`;
    if(!passportSource.includes(importBefore)||!passportSource.includes(providerBefore))throw new Error(`Cannot apply jwks-rsa ${jwksSupportedVersion} passport patch: expected jose import source was not found.`);
    passportSource=passportSource.replace(importBefore,'').replace(providerBefore,providerAfter);
    await writeFile(jwksPassportPath,passportSource,'utf8');
    console.log(`Applied dependency patch: jwks-rsa ${jwksSupportedVersion} passport jose ESM bridge.`);
  }
}catch(error){
  if(error?.code==='ENOENT')console.log('Dependency patch skipped: jwks-rsa is not installed in this dependency profile.');
  else throw error;
}

const packagePath=resolve(root,'node_modules/teeny-request/package.json');
const sourcePath=resolve(root,'node_modules/teeny-request/build/src/index.js');
const supportedVersion='11.1.1';
const marker='PI_GCS_STREAM_BRIDGE_PATCH_v1';

let manifest;
try{
  manifest=JSON.parse(await readFile(packagePath,'utf8'));
}catch(error){
  if(error?.code==='ENOENT'){
    console.log('Dependency patch skipped: teeny-request is not installed in this dependency profile.');
    process.exit(0);
  }
  throw error;
}
if(manifest.version!==supportedVersion){
  throw new Error(`Unsupported teeny-request ${manifest.version}; review the Storage stream bridge before updating the patch for ${supportedVersion}.`);
}

const before=`        requestStream.once('reading', () => {
            if (responseStream) {
                (0, stream_1.pipeline)(responseStream, requestStream, () => { });
            }
            else {
                requestStream.once('response', () => {
                    (0, stream_1.pipeline)(responseStream, requestStream, () => { });
                });
            }
        });`;
const after=`        // ${marker}: avoid overlapping pipeline ownership while preserving
        // backpressure, upstream error propagation, and downstream cancellation.
        requestStream.once('close', () => {
            if (responseStream) {
                responseStream.destroy();
            }
        });
        requestStream.once('reading', () => {
            if (responseStream) {
                responseStream.pipe(requestStream);
            }
            else {
                requestStream.once('response', () => {
                    if (!requestStream.destroyed) {
                        responseStream.pipe(requestStream);
                    }
                });
            }
        });`;
const errorBefore=`            responseStream.on('error', (err) => {
                requestStream.emit('error', err);
            });
            const response = fetchToRequestResponse(options, res);`;
const errorAfter=`            responseStream.on('error', (err) => {
                requestStream.destroy(err);
            });
            responseStream.once('close', () => {
                if (!responseStream.readableEnded && !requestStream.destroyed) {
                    const err = new Error('Premature close');
                    err.code = 'ERR_STREAM_PREMATURE_CLOSE';
                    requestStream.destroy(err);
                }
            });
            // The consumer may cancel while fetch is still waiting for headers.
            if (requestStream.destroyed) {
                responseStream.destroy();
                return;
            }
            const response = fetchToRequestResponse(options, res);`;
const fetchErrorBefore=`        }, err => {
            teenyRequest.stats.requestFinished();
            requestStream.emit('error', err);
        });`;
const fetchErrorAfter=`        }, err => {
            teenyRequest.stats.requestFinished();
            requestStream.destroy(err);
        });`;

let source=await readFile(sourcePath,'utf8');
if(source.includes(marker)){
  console.log(`Dependency patch already present: teeny-request ${supportedVersion} Storage stream bridge.`);
  process.exit(0);
}
for(const [label,needle] of [['stream bridge',before],['response lifecycle',errorBefore],['fetch error',fetchErrorBefore]]){
  if(!source.includes(needle))throw new Error(`Cannot apply teeny-request ${supportedVersion} patch: expected ${label} source was not found.`);
}
source=source.replace(before,after).replace(errorBefore,errorAfter).replace(fetchErrorBefore,fetchErrorAfter);
await writeFile(sourcePath,source,'utf8');
console.log(`Applied dependency patch: teeny-request ${supportedVersion} Storage stream bridge.`);
