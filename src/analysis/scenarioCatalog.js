export function scenarioCatalog(model,valuation) {
  const hasRange=valuation?.low!=null&&valuation?.high!=null;
  const sponsorBasis=hasRange&&(model.salePrice<valuation.low||model.salePrice>valuation.high)
    ? 'SPONSOR_ONLY_CONFLICTING_WITH_PROVIDER_RANGE' : 'SPONSOR_ONLY';
  const row=(id,label,overrides,saleAssumptionEvidenceStatus,description=label)=>({id,label,description,
    baseCase:'SPONSOR_CASE',overrides,saleAssumptionEvidenceStatus});
  const rows=[row('SPONSOR_CASE','Sponsor case',{},sponsorBasis),
    ...[['POINT','price'],['LOW','low'],['HIGH','high']].map(([name,field])=>row(`INDEPENDENT_AVM_${name}`,
      `Independent AVM ${name.toLowerCase()}`,{salePrice:valuation?.[field]??null},'INDEPENDENT_ESTIMATE_UNVERIFIED'))];
  for(const percent of [5,10,15,20])rows.push(row(`SALE_MINUS_${percent}`,`Sponsor sale -${percent}%`,
    {salePrice:Math.round(model.salePrice*(100-percent))/100},'HYPOTHETICAL_DETERMINISTIC'));
  const baseRepairs=model.costs.find(c=>c.field==='repairs').value;
  for(const percent of [20,50,100])rows.push(row(`REPAIR_PLUS_${percent}`,`Repairs +${percent}% at sponsor sale`,
    {repairs:baseRepairs*(1+percent/100)},sponsorBasis));
  for(const percent of [0,20,50])rows.push(row(`AVM_HIGH_REPAIR_PLUS_${percent}`,`AVM high, repairs +${percent}%`,
    {salePrice:valuation?.high??null,repairs:baseRepairs*(1+percent/100)},'INDEPENDENT_ESTIMATE_UNVERIFIED'));
  for(const [sale,repair] of [[10,20],[15,50],[20,100]])rows.push(row(`COMBINED_${sale}_${repair}`,
    `Sale -${sale}%, repairs +${repair}%`,{salePrice:Math.round(model.salePrice*(100-sale))/100,repairs:baseRepairs*(1+repair/100)},'HYPOTHETICAL_DETERMINISTIC'));
  for(const days of [120,150,180,240])rows.push(row(`HOLD_${days}`,`Holding ${days} days`,{holdDays:days},
    sponsorBasis,'Replace the 3-month rent with derived monthly rent × days/30; all other unknown holding costs excluded.'));
  return rows;
}
