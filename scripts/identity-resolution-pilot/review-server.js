// Inbound loopback HTTP is allowed; ALL outbound connections are blocked.
import '../../src/analysis/offline.js';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {startReviewServer} from './review-http.js';

const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--reviewer'||!args[1]?.trim()){
  console.error('Usage: node scripts/identity-resolution-pilot/review-server.js --reviewer "Stan Roy"');process.exitCode=1;
}else{
  const token=randomBytes(32).toString('hex');
  startReviewServer({directory:fileURLToPath(new URL('../../data/runtime/identity-resolution-pilot',import.meta.url)),reviewer:args[1],token}).then(app=>{
    console.log(`Private identity review: ${app.origin}/\nReviewer: ${app.store.reviewer}\nAccess code (private; expires when this process stops or after 8 hours):\n${token}\nNo database, provider or Property creation path. Stop with Ctrl+C.`);
    const stop=()=>app.close().then(()=>process.exit(0));process.on('SIGINT',stop);process.on('SIGTERM',stop);
  }).catch(e=>{console.error(e.code==='EADDRINUSE'?'Port 4318 is busy. Stop the previous local review server.':'LOCAL_REVIEW_START_FAILED: check private packets, ignore protection and reviewer argument.');process.exitCode=1;});
}
