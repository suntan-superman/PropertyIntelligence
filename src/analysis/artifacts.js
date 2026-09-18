import {writeJson,writeText,csv} from '../io/files.js';
import {loadInputs} from './inputs.js';
import {offlineStatus} from './offline.js';
import {evidenceCompleteness,sponsorInformationRequest,monteCarloReadiness} from './evidenceCompleteness.js';
import {breakEven} from './breakEven.js';
import {buildScenarios} from './scenarios.js';
import {sensitivity} from './sensitivity.js';
const jsonCell=value=>typeof value==='object'&&value!==null?JSON.stringify(value):value;
const table=(rows,columns)=>csv(rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,jsonCell(value)]))),columns);
export const outputColumns=['id','label','status','grossSale','modeledProceeds','modeledProjectCost','modeledProfit',
  'scenarioCashInvested','cashOnCash','profitMargin','changeVsSponsorDollars','changeVsSponsorCashOnCashPercentagePoints',
  'changeVsSponsorProfitMarginPercentagePoints','costCompleteness','saleAssumptionEvidenceStatus','overrides','excludedUnknownCosts','warnings','provenance','reason'];
export function flatScenario(row){return {id:row.id??row.label,label:row.label,...row.outputs,
  saleAssumptionEvidenceStatus:row.saleAssumptionEvidenceStatus??'HYPOTHETICAL_DETERMINISTIC',
  overrides:row.overrides,provenance:row.provenance};}
export async function writeEvidence(input) {
  const data=evidenceCompleteness(input);
  await writeJson('data/analysis/evidence/florida-evidence-completeness.json',data);
  await writeText('data/analysis/evidence/florida-evidence-completeness.csv',table(
    data.properties.flatMap(p=>p.fields.map(field=>({propertyId:p.propertyId,resolutionStatus:p.resolutionStatus,...field}))),
    ['propertyId','resolutionStatus','field','category','sponsorValue','independentValue','status','supportLevel','sources','notes','materiality']));
  await writeJson('data/analysis/evidence/sponsor-information-request.json',sponsorInformationRequest());
  await writeJson('data/analysis/evidence/monte-carlo-readiness.json',monteCarloReadiness(input));
}
export async function writeBreakEven(input) {
  const data=breakEven(input);
  await writeJson('data/analysis/break-even/fantasia-break-even.json',data);
  await writeText('data/analysis/break-even/fantasia-break-even.csv',table([
    {id:data.type,status:'AVAILABLE',modeledBreakEvenSalePrice:data.salePrice,costCompleteness:data.costCompleteness,warnings:data.warnings,provenance:data.provenance},
    ...data.capacities.map(row=>({...row,holdingCapacityDays:row.holding.capacityDays,holdingStatus:row.holding.status,
      holdingDerivation:row.holding.derivation,excludedUnknownCosts:data.excludedUnknownCosts,provenance:data.provenance})),
  ],['id','status','modeledBreakEvenSalePrice','saleAssumption','maximumRepairBudget','maximumAcquisitionPrice',
    'holdingCapacityDays','holdingStatus','holdingDerivation','costCompleteness','excludedUnknownCosts','warnings','provenance']));
}
export async function writeScenarios(input) {
  const data=buildScenarios(input);
  await writeJson('data/analysis/scenarios/fantasia-scenarios.json',data);
  await writeText('data/analysis/scenarios/fantasia-scenarios.csv',table(data.scenarios.map(flatScenario),outputColumns));
}
export async function writeSensitivity(input) {
  const data=sensitivity(input);
  for(const [name,rows] of [['sale',data.sale],['repair',data.repair],['hold',data.holding]]) {
    await writeText(`data/analysis/sensitivity/fantasia-${name}-sensitivity.csv`,table(rows.map(flatScenario),outputColumns));
  }
  await writeText('data/analysis/sensitivity/fantasia-sale-repair-matrix.csv',table(data.matrix.map(row=>({
    saleAssumption:row.label,salePrice:row.salePrice,
    ...Object.fromEntries(row.cells.map(cell=>[`repairPlus${cell.repairChangePercent}`,cell.modeledProfit])),
    status:row.salePrice===null?'UNAVAILABLE':'AVAILABLE',costCompleteness:'INCOMPLETE',
    warnings:row.cells[0].warnings,provenance:data.provenance,
  })),['saleAssumption','salePrice','repairPlus0','repairPlus20','repairPlus50','repairPlus100','status','costCompleteness','warnings','provenance']));
  await writeJson('data/analysis/sensitivity/fantasia-deterministic-ranking.json',data.ranking);
}
export async function runAnalysis(kind) {
  const input=await loadInputs();
  const runners={evidence:writeEvidence,breakEven:writeBreakEven,scenarios:writeScenarios,sensitivity:writeSensitivity};
  if(!runners[kind])throw new Error('Unsupported offline analysis');
  await runners[kind](input);
  console.log(JSON.stringify({analysis:kind,...offlineStatus()}));
}
