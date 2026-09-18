import {fixture} from '../src/workbench/model.js';
import {generateReport} from '../src/reports/pdf.js';
console.log(JSON.stringify(await generateReport(await fixture('fantasia')),null,2));
