import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import { syncBuiltinESMExports } from 'node:module';
// Applied at entry to every Sprint 2 command and preloaded in the full test suite.
// Do not import provider configuration or read .env in offline analysis.
let attempts=0;
const blocked=()=>{ attempts++; throw new Error('OFFLINE_ONLY: networking is disabled'); };
globalThis.fetch=blocked;
http.request=http.get=https.request=https.get=blocked;
net.connect=net.createConnection=tls.connect=blocked;
net.Socket.prototype.connect=blocked;
syncBuiltinESMExports();
export const offlineStatus=()=>({networkDisabled:true,networkAttempts:attempts,providerCalls:0});
