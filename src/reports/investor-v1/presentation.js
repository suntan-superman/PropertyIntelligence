// Presentation only: no simulation, MAO, policy or source-evidence calculation.
export const PRESENTATION_VERSION='investor-presentation-v1.1';
export const PRESENTATION_RENDERER='investor-report-v1.1-presentation';
export const LOSS_QUALIFICATION='Based on the stated simulation assumptions; not a historically calibrated forecast.';
export const TIED_LABEL='Some modeled factors have equivalent effects; no unique ranking is supported';
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function priceComparison(purchase,mao){
  if(!Number.isFinite(purchase)||!Number.isFinite(mao))throw new Error('FINITE_PRESENTATION_PRICES_REQUIRED');
  // Both source prices are already certified cents. Round only their display delta.
  const difference=Math.round((purchase-mao)*100)/100;
  const relation=difference>0?'above':difference<0?'below':'equal';
  const verb=relation==='above'?'exceeds':relation==='below'?'is below':'equals';
  return Object.freeze({difference,relation,message:`Proposed purchase price ${verb} the modeled ceiling for the stated return requirement.`});
}

export function decisionSnapshot(m,{usd,pct,card,hurdle}){
  const r=m.certifiedAnalysis.result,e=r.inputs.economics,d=r.deterministic,s=r.results;
  const price=priceComparison(e.purchasePrice,r.mao.deterministic.purchasePrice);
  const delta=price.relation==='equal'?'At the modeled ceiling':`${usd(Math.abs(price.difference))} ${price.relation} the modeled ceiling`;
  const status=price.relation==='above'?'Proposed price is above the base-case hurdle ceiling.':price.relation==='below'?'Proposed price is below the base-case hurdle ceiling.':'Proposed price is at the base-case hurdle ceiling.';
  return `<p class="mc-scenario">${esc({SYNTHETIC_MC_A_STRONG_MARGIN:'Strong Margin',SYNTHETIC_MC_B_MARGINAL:'Marginal Investment',SYNTHETIC_MC_C_RENOVATION_OVERRUN:'Renovation Overrun'}[r.inputs.scenarioId])}</p>
  <p>Residential fix-and-flip · Purchase, renovate and resell under synthetic demonstration assumptions.</p>
  <h3>Investment Decision Snapshot</h3>
  <div class="grid price-focus">${card('Proposed purchase price',usd(e.purchasePrice))}${card('Deterministic MAO',usd(r.mao.deterministic.purchasePrice),'Base-case return ceiling')}</div>
  <div class="callout price-interpretation"><b>${esc(delta)}</b><p>${esc(price.message)}</p></div>
  <div class="grid three snapshot-metrics">${card('Deterministic net profit',usd(d.modeledProfit),'Base-case economics')}${card('Modeled loss frequency',pct(s.probabilityOfLoss),'Observed in the simulated sample')}${card('Downside modeled profit (P10)',usd(s.profit.p10),'Lower 10th-percentile modeled profit')}${card('Peak modeled cash required',usd(d.cashRequired),'Base case; includes any exit shortfall')}${card('P90 modeled cash requirement',usd(s.cashRequired.p90),'90th-percentile simulation requirement')}${card('Meets stated hurdle',pct(s.probabilityMeetingTarget),hurdle(r.inputs.target))}</div>
  <p class="risk-note">${LOSS_QUALIFICATION} ${s.probabilityOfLoss===0?'No losses occurred in the simulated sample. Unmodeled risks remain.':'The lower 10th-percentile result is not a guaranteed worst case.'}</p>
  <h3>Stated investment hurdle</h3><p><b>${esc(hurdle(r.inputs.target))}, not annualized.</b> ${esc(status)} The simulation frequency above measures meeting this return hurdle, not merely earning a profit.</p>
  <div class="callout"><b>Investment decision not yet assessed.</b> A price below MAO alone does not establish a good investment. Neither ceiling is an appraisal, guaranteed offer price or recommended bid.</div>
  <h3>Outstanding verification requirements</h3><p>Identity and ownership; condition and renovation scope; financing and title/payoffs; licensed valuation and comparable sales; investor policy. None are verified for a real property.</p>
  <p class="small">Proposed sale assumption: ${esc(usd(e.exitValue))}. Renovation scope: ${esc(usd(e.rehabCost))}; contingency is separate in the economics ledger. All displayed economics remain synthetic.</p>`;
}

export function verificationReference(m){
  return `<div class="verification-reference"><h3>Verification reference</h3><p>Analysis ID: <b>${esc(m.certifiedAnalysis.execution.scenarioId)}</b><br>Model: ${esc(m.certifiedAnalysis.execution.modelVersion)} · Report date (UTC): ${esc(m.reportMeta.generatedAt.slice(0,10))}<br><b>Technical Evidence Appendix:</b> appendix.pdf, same package. The package preserves full provenance.</p></div>`;
}

export const presentationCss=`.price-focus .value{font-size:22pt!important}.price-focus .datum{border-top:3px solid #176258;padding:10px}.price-interpretation b{font-size:13pt}.price-interpretation p{margin:5px 0!important}.snapshot-metrics{margin-top:12px}.snapshot-metrics .datum{padding:10px}.snapshot-metrics .label{font-size:8pt}.risk-note{font-size:9pt;color:#614d2c}.verification-reference{border-top:1px solid #cbd6dc;margin-top:6px;break-inside:avoid}.verification-reference h3{margin:5px 0 4px}.verification-reference p{margin:5px 0;font-size:8.5pt;overflow-wrap:anywhere}.mc-appendix .mc-metadata td:last-child{overflow-wrap:anywhere}.mc-command{font:8pt/1.4 Consolas,monospace;overflow-wrap:anywhere;background:#f3f6f5;padding:8px}`;
