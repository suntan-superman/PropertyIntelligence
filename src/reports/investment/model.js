import {createHash} from 'node:crypto';

export const RENDERER_VERSION='investment-html-v1';
export const REPORT_TYPE='FULL_INVESTMENT_ANALYSIS';
export const json=value=>typeof value==='string'?JSON.parse(value):value;
export function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));return value;}
export const fingerprint=value=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const secretKey=/password|secret|token|api.?key|authorization|database.?url|connection.?string|private.?key/i;
export function safeContent(value){
  if(typeof value==='string'&&/postgres(?:ql)?:\/\/|-----BEGIN .*PRIVATE KEY-----|(?:api[_-]?key|password|token)=/i.test(value))throw new Error('REPORT_SECURITY_STOP');
  if(Array.isArray(value))return value.map(safeContent);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!secretKey.test(k)&&!['raw_payload','provider_payload','providerPayload','providerAttributes','rawResponseRef','rawReference','inputsPayload'].includes(k)).map(([k,v])=>[k,safeContent(v)]));
  return value;
}
function equal(a,b){return a==null&&b==null||a!=null&&b!=null&&Number(a)===Number(b);}
function reconcile(a,b){if(!equal(a,b))throw new Error('REPORT_RECONCILIATION_STOP');}

export function buildInvestmentModel({property,deal,evidence,analysis,decision,comps},generatedAt=new Date().toISOString()){
  if(!property||!deal||!evidence||!analysis||!decision||!Array.isArray(comps))throw new Error('REPORT_HISTORICAL_LINK_REQUIRED');
  if(!decision.analysis_snapshot_id||!decision.deal_id||!decision.evidence_snapshot_id)throw new Error('REPORT_HISTORICAL_LINK_REQUIRED');
  if(decision.property_id!==property.id||decision.deal_id!==deal.id||deal.property_id!==property.id||decision.analysis_snapshot_id!==analysis.id||analysis.property_id!==property.id||analysis.deal_id!==deal.id||decision.evidence_snapshot_id!==evidence.id||analysis.evidence_snapshot_id!==evidence.id||evidence.property_id!==property.id)throw new Error('REPORT_LINKAGE_STOP');
  const output=json(decision.outputs_payload)??{},input=json(decision.inputs_payload)??{},a=json(analysis.outputs_payload)??{},p=json(evidence.property_payload)??{},v=json(evidence.valuation_payload)??{};
  if(!output.hurdle||!a.base)throw new Error('REPORT_HISTORICAL_LINK_REQUIRED');
  if(Array.isArray(p.comps)&&p.comps.length!==comps.length)throw new Error('REPORT_RECONCILIATION_STOP');
  for(const [column,key] of [['calculated_mao','calculatedMao'],['effective_walkaway_price','effectiveWalkawayPrice'],['target_offer','targetOffer'],['known_encumbrance_total','knownEncumbranceTotal'],['unknown_encumbrance_count','unknownEncumbranceCount'],['selected_exit_value','selectedExitValue']])reconcile(decision[column],output[key]);
  reconcile(decision.hurdle_rate,output.hurdle.rate);if(decision.hurdle_type!==output.hurdle.type||decision.selected_exit_basis!==output.selectedExitBasis)throw new Error('REPORT_RECONCILIATION_STOP');
  for(const [column,value] of [['modeled_profit',a.base.modeledProfit],['cash_on_cash',a.base.cashOnCash],['cash_invested',a.base.scenarioCashInvested],['modeled_proceeds',a.base.modeledProceeds],['break_even_sale_price',a.breakEven?.salePrice??a.breakEven?.breakEvenSalePrice]])reconcile(analysis[column],value);
  // Retain every comp. Sort only the primary presentation, never mutate the snapshot.
  const retained=comps.map(c=>safeContent(c));
  const distance=c=>c.distance_miles??c.distanceMiles;
  const primary=[...retained].sort((x,y)=>(distance(x)==null?Infinity:Number(distance(x)))-(distance(y)==null?Infinity:Number(distance(y)))||String(x.id??x.address).localeCompare(String(y.id??y.address))).slice(0,8);
  const model={reportMeta:{reportType:REPORT_TYPE,propertyId:property.id,dealId:deal.id,analysisSnapshotId:analysis.id,acquisitionDecisionId:decision.id,evidenceSnapshotId:evidence.id,rendererVersion:RENDERER_VERSION,generatedAt,status:'READY',storageReference:null},
    property:safeContent({address:p.address??json(analysis.inputs_payload)?.property?.address??null,propertyType:p.propertyType,identityStatus:evidence.status}),
    propertyDetails:safeContent({...p,comps:undefined,valuation:undefined,taxes:json(evidence.tax_payload),assessments:json(evidence.assessment_payload),saleHistory:json(evidence.sale_history_payload),features:json(evidence.features_payload),legal:json(evidence.legal_payload)}),
    evidenceSummary:{status:evidence.status,source:evidence.source,retrievedAt:evidence.retrieved_at,snapshotType:evidence.snapshot_type},
    valuation:safeContent(v),comparables:{all:retained,primary,selection:'Nearest supplied distance; missing distances last; stable identifier tie-break. All retained comps follow in appendix.'},
    deal:{claims:safeContent(json(analysis.inputs_payload)?.claims??[]),strategy:decision.strategy},
    encumbrances:{items:safeContent(output.encumbrances??[]),knownTotal:output.knownEncumbranceTotal??null,unknownCount:output.unknownEncumbranceCount??null,gap:output.encumbranceGap??null},
    condition:{items:safeContent(input.rehab?.items??output.rehab?.items??[]),status:(input.rehab?.items??output.rehab?.items??[]).length?'Recorded assessment':'Not assessed',limitation:'Only condition detail embedded in this immutable decision is included. Unlinked later assessments are not substituted.'},
    rehab:safeContent(output.rehab??null),economics:safeContent({base:a.base,costModel:a.costModel??null,breakEven:a.breakEven??null,warnings:json(analysis.warnings_payload)??[]}),
    maoDecision:safeContent(output),scenarios:safeContent(a.scenarios??[]),sensitivity:{analysis:safeContent(a.sensitivity??null),mao:safeContent(output.sensitivity??[])},
    diligence:safeContent(output.diligenceQuestions??[]),sources:safeContent(json(evidence.provenance_payload)??[]),
    methodology:{analysisVersion:analysis.analysis_version,decisionVersion:decision.decision_version,hurdleDefinition:output.hurdleDefinition??output.hurdle.formula??null,analysisCreatedAt:analysis.created_at,decisionCreatedAt:decision.created_at,limitations:['Unknown values remain unknown; explicit zero is retained.','Independent evidence and analyst/sponsor assumptions are distinct.','Property/seller encumbrances affect title clearance, seller proceeds and negotiation constraints. They are not automatically added to investor project costs.','Existing deterministic scenarios have no probability interpretation.','MAO is the highest modeled purchase price satisfying the selected return hurdle under the stated assumptions. It is not a guarantee of return or an investment recommendation.']}};
  const normalized=JSON.parse(JSON.stringify(model));
  const content={...normalized,reportMeta:{...normalized.reportMeta,generatedAt:undefined}};
  normalized.reportMeta.reportModelFingerprint=fingerprint(content);
  if(Buffer.byteLength(JSON.stringify(normalized))>2_000_000)throw new Error('REPORT_SIZE_LIMIT');
  return freeze(normalized);
}
