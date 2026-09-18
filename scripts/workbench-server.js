import {startWorkbench} from '../src/workbench/server.js';
const portIndex=process.argv.indexOf('--port'),port=portIndex>=0?Number(process.argv[portIndex+1]):4173;
const app=await startWorkbench({dev:!process.argv.includes('--built'),port:Number.isFinite(port)?port:4173});
console.log(`Internal Property Intelligence Workbench: ${app.url}`);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await app.close();process.exit(0);});
