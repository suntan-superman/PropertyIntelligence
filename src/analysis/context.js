// Pure context selection: importing reusable analysis must not install CLI network guards.
export function context(input,id='fantasia') {
  const deal=input.portfolio.deals.find(d=>d.id===id);
  const seed=input.portfolio.properties.find(p=>p.id===id);
  const result=input.verification.properties.find(p=>p.propertyId===id);
  if(!deal||!seed||!result) throw new Error(`STOP: missing property ${id}`);
  return {deal,seed,result,values:Object.fromEntries(deal.claims.map(c=>[c.field,c.value])),
    provenance:[{source:'Sponsor',reference:'data/deals/florida-portfolio.json',dealId:id},
      ...result.evidence.map(e=>({source:e.source,field:e.field,evidenceId:e.id,retrievedAt:e.retrievedAt,reference:e.rawResponseRef})),
      ...(seed.addressConfirmation?[{source:seed.addressConfirmation.suppliedBy,reference:seed.addressConfirmation.sourceDocument}]:[])]};
}
