const text=value=>String(value??'').trim();
const compact=value=>text(value).toUpperCase().replace(/\b(STREET|ST)\b/g,'ST').replace(/\b(AVENUE|AVE)\b/g,'AVE').replace(/\b(ROAD|RD)\b/g,'RD').replace(/\b(DRIVE|DR)\b/g,'DR').replace(/\b(EAST)\b/g,'E').replace(/\b(WEST)\b/g,'W').replace(/\b(NORTH)\b/g,'N').replace(/\b(SOUTH)\b/g,'S').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();

export function normalizedComparableAddress(address){
  const street=compact(text(address).split(',')[0]),parts=street.split(' '),number=parts.shift()??'',directions=parts.filter(part=>['N','S','E','W'].includes(part)).sort(),road=parts.filter(part=>!directions.includes(part));
  return [number,...road,...directions].join(' ').trim();
}

const providerIdentity=sale=>text(sale.providerId??sale.providerPropertyId??sale.propertyId??sale.assessorId??sale.apn).toUpperCase();
const transactionIdentity=sale=>[text(sale.saleDate).slice(0,10),Number.isFinite(Number(sale.salePrice))?Number(sale.salePrice):''].join('|');

export function groupComparableObservations(sales=[]){
  const groups=[];
  for(const sale of sales){
    const addressKey=normalizedComparableAddress(sale.address),providerKey=providerIdentity(sale),transactionKey=transactionIdentity(sale);
    const match=groups.find(group=>(providerKey&&group.providerKeys.has(providerKey)&&group.transactionKeys.has(transactionKey))||(addressKey&&group.addressKey===addressKey&&group.transactionKeys.has(transactionKey)));
    if(match){match.records.push(sale);if(providerKey)match.providerKeys.add(providerKey);match.transactionKeys.add(transactionKey);continue;}
    groups.push({key:`${addressKey||'UNKNOWN'}:${transactionKey}`,addressKey,providerKeys:new Set(providerKey?[providerKey]:[]),transactionKeys:new Set([transactionKey]),records:[sale]});
  }
  const addressCounts=new Map();for(const group of groups)addressCounts.set(group.addressKey,(addressCounts.get(group.addressKey)??0)+1);
  const prices=groups.map(group=>Number(group.records[0]?.salePrice)).filter(Number.isFinite).sort((a,b)=>a-b),median=prices.length?prices[Math.floor(prices.length/2)]:null;
  return groups.map(group=>{
    const duplicate=group.records.length>1,possible=!duplicate&&Boolean(group.addressKey)&&addressCounts.get(group.addressKey)>1,price=Number(group.records[0]?.salePrice),unusual=Number.isFinite(price)&&Number.isFinite(median)&&median>0&&(price<median*.5||price>median*1.75);
    return {...group,providerKeys:[...group.providerKeys],transactionKeys:[...group.transactionKeys],identityStatus:duplicate?'DUPLICATE_ESTABLISHED':possible?'POSSIBLE_DUPLICATE':'UNIQUE',identityReason:duplicate?'Matching provider/property identity or normalized address plus transaction details.':possible?'Normalized address matches another observation, but transaction identity differs.':'No duplicate identity detected.',reviewFlags:[...(possible?['Possible duplicate — analyst identity review required.']:[]),...(unusual?['Unusual transaction price — review transfer terms and condition.']:[])]};
  });
}
