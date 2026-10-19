import {readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
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
