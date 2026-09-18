import {startWorkbench} from '../src/workbench/server.js';
const app=await startWorkbench({dev:!process.argv.includes('--built')});
console.log(`Internal Property Intelligence Workbench: ${app.url}`);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await app.close();process.exit(0);});
