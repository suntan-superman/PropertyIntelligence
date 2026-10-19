import '../src/analysis/offline.js';
import {readFile,realpath} from 'node:fs/promises';
import {relative,isAbsolute,sep} from 'node:path';
import {verifyPackage} from '../src/reports/investor-v1/frozenPackage.js';

const [packagePath,receiptPath,...extra]=process.argv.slice(2);
if(!packagePath||!receiptPath||extra.length)throw new Error('Usage: node scripts/verify-investor-mc-package.js <package-directory> <separately-trusted-receipt.json>');
const directory=await realpath(packagePath),receiptFile=await realpath(receiptPath),rel=relative(directory,receiptFile);
if(!(isAbsolute(rel)||rel==='..'||rel.startsWith(`..${sep}`)))throw new Error('TRUSTED_RECEIPT_MUST_BE_OUTSIDE_PACKAGE');
const receipt=JSON.parse(await readFile(receiptFile,'utf8'));
console.log(JSON.stringify(await verifyPackage(directory,{receipt})));
