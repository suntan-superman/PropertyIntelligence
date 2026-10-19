// Narrow server-selected artifact gate around the V2 transaction composition.
import {runPostgresSequence} from './postgres-fixtures.js';
export async function persistTrustedReview({db,decisions,request,testHooks={}}){
  const first=await decisions.resolve(request);
  const check=async()=>{const current=await decisions.resolve(request);if(current.authorization.identitySha256!==first.authorization.identitySha256)throw new Error('AUTHORIZATION_CHANGED_DURING_TRANSACTION');return current;};
  return runPostgresSequence(db,first.plan,{
    authorize:check,authorization:first.authorization,
    beforePersistence:async(tx,fixture)=>{await check();if(testHooks.beforePersistence)await testHooks.beforePersistence(tx,fixture);},
    txQuery:testHooks.txQuery,
    beforeCommit:async()=>{if(testHooks.beforeCommit)await testHooks.beforeCommit();await check();}
  });
}
