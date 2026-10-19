// Subprocess tests only. No production or provider entrypoint.
import '../../src/analysis/offline.js';
import {createControlledClient,mockTransport} from './client.js';
import {fixture,approval,NOW} from './fixtures.js';
import {locked,append} from './ledger.js';
import {hash,requestFor} from './contract.js';
const [mode,directory]=process.argv.slice(2);
if(!['crash','attempt'].includes(mode)||process.argv.length!==4)throw Error('TEST_ARGUMENT_STOP');
const f=fixture(),transport=mockTransport([{body:[f.subject]}]);
const client=createControlledClient({directory,candidate:f.candidate,template:f.template,account:f.account,transport,clock:()=>NOW});
if(mode==='crash'){
  // Terminate after a durable reservation, before any mock transmission/outcome.
  await locked(directory,async dir=>{
    const request=requestFor('A',f.candidate);
    await append(dir,[],{kind:'RESERVATION',stage:'A',timestamp:NOW,endpoint:request.endpoint,method:'GET',parameterFingerprint:hash(request.params),requestFingerprint:hash(request),boundsFingerprint:null,approvalHash:hash(approval(f,'A')),previousReceiptHash:null,requestFeeReserveCents:20,maximumBillableExposureCents:25,countsAgainstCeiling:true,outcome:'PENDING_OR_UNCERTAIN'},client.binding);
    process.exit(73);
  });
}else{
  try{const r=await client.step('A',{approval:approval(f,'A')});console.log(JSON.stringify({status:r.receipt.status,calls:transport.calls}));}
  catch(e){console.log(JSON.stringify({code:e.code??'SAFE_STOP',calls:transport.calls}));process.exitCode=2;}
}
