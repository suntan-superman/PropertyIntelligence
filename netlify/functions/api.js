import {createRuntime} from '../../src/workbench/api/runtime.js';

// One warm-instance runtime; no local .env access, filesystem cache, PDF or business logic here.
const api=createRuntime({runtime:'netlify',env:process.env});
export default function handler(request){return api(request);}
