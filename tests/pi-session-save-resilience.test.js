import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SESSION_RECOVERY_KEY,WORKSPACE_DRAFT_KEY,readSessionRecovery,saveReminderDue,writeSessionRecovery} from '../apps/web/src/features/investment-workspace/draft-recovery.js';
import {isSessionAuthenticationFailure} from '../apps/web/src/auth/session-lifecycle.js';

const storage=()=>{const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};

test('session expiry creates a distinct temporary recovery checkpoint for dirty analysis work',()=>{
  const local=storage(),workspace={drafts:[{id:'dirty',dirty:true},{id:'saved',dirty:false}],selected:['P-1'],activeId:'dirty',subject:'P-1',mode:'guided',guidedProgress:{dirty:{financial:'COMPLETE'}}};
  const result=writeSessionRecovery(workspace,{storage:local,reason:'FIREBASE_SESSION_EXPIRED',now:()=>new Date('2026-10-17T16:00:00.000Z')});
  assert.equal(result.reason,'FIREBASE_SESSION_EXPIRED');
  assert.deepEqual(result.dirtyScenarioIds,['dirty']);
  assert.equal(readSessionRecovery(local).workspace.activeId,'dirty');
  assert.ok(local.values.has(SESSION_RECOVERY_KEY));
  assert.equal(JSON.parse(local.values.get(WORKSPACE_DRAFT_KEY)).subject,'P-1');
});

test('recovery checkpoint is not manufactured when every scenario is already saved',()=>{
  const local=storage();
  assert.equal(writeSessionRecovery({drafts:[{id:'saved',dirty:false}]},{storage:local}),null);
  assert.equal(local.values.has(SESSION_RECOVERY_KEY),false);
});

test('save reminder becomes due only for a sufficiently old dirty draft',()=>{
  const now=1_000_000,intervalMs=600_000;
  assert.equal(saveReminderDue({dirty:true,dirtySince:now-intervalMs,now,intervalMs}),true);
  assert.equal(saveReminderDue({dirty:true,dirtySince:now-intervalMs,lastPromptAt:now-1,now,intervalMs}),false);
  assert.equal(saveReminderDue({dirty:false,dirtySince:0,now,intervalMs}),false);
});

test('only PI session authentication failures trigger automatic logout',()=>{
  assert.equal(isSessionAuthenticationFailure(401,{code:'SESSION_COOKIE_MISSING'}),true);
  assert.equal(isSessionAuthenticationFailure(401,{error:'FIREBASE_SESSION_SESSION-COOKIE-EXPIRED'}),true);
  assert.equal(isSessionAuthenticationFailure(401,{code:'AUTHORIZATION_FAILURE'}),false);
  assert.equal(isSessionAuthenticationFailure(403,{code:'SESSION_EXPIRED'}),false);
});

test('workspace and authentication gate expose reminder, revision choice and timed expiry behavior',async()=>{
  const [workspace,gate,server,dialog]=await Promise.all([
    readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8'),
    readFile('apps/web/src/auth/AuthenticationGate.jsx','utf8'),
    readFile('src/investment-workspace/server.js','utf8'),
    readFile('apps/web/src/components/NotificationDialog.jsx','utf8')
  ]);
  assert.match(workspace,/Save your analysis\?/);
  assert.match(workspace,/Create new scenario/);
  assert.match(workspace,/Earlier saved revisions are never overwritten/);
  assert.match(workspace,/writeSessionRecovery/);
  assert.match(gate,/announceSessionExpired\('SESSION_EXPIRED'\)/);
  assert.match(gate,/temporary browser recovery copy/);
  assert.match(server,/sessionExpiresAt:user\.sessionExpiresAt/);
  assert.match(dialog,/choose:options/);
});
