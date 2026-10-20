const headers={'Content-Type':'application/json','X-PI-Workspace':'local-v1'};

const addressLabel=address=>[address?.street,address?.city,[address?.state,address?.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
const dollars=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format((cents??0)/100);

async function post(path,body){
  const response=await fetch(path,{method:'POST',credentials:'same-origin',headers,body:JSON.stringify(body)}),value=await response.json();
  if(!response.ok)throw Object.assign(new Error(value.error||'Provider research is unavailable.'),{code:value.code||value.error});
  return value;
}

export async function approveAndRunProviderResearch({dialog,payload,skipConfirmationWhenFree=false}){
  const quote=await post('/api/property-research/quote',payload),newRequests=quote.operations.filter(item=>item.requestRequired).length,available=quote.operations.length-newRequests,prior=quote.previousFailure;
  if(!(skipConfirmationWhenFree&&quote.estimatedMaximumChargeCents===0)){
    const approved=await dialog.confirm({
      title:prior?'Retry paid RentCast research?':'Approve paid RentCast research?',
      message:prior?'The prior attempt did not return reusable evidence. Its billing status is unknown. This is a new, explicit request and may create another provider charge. No automatic retry will occur.':'Review the maximum estimated provider charge before starting. PI will make only the requests shown below and will not retry automatically.',
      confirmLabel:'Approve & Research',cancelLabel:'Cancel',tone:'warning',
      details:[
        ['Provider',quote.provider],
        ['Research type',quote.researchType],
        ['Address',addressLabel(quote.address)],
        ['Estimated maximum charge',dollars(quote.estimatedMaximumChargeCents)],
        ['Cached / retained results',`${available} of ${quote.operations.length} available`],
        ['New provider requests',String(newRequests)],
        ['Automatic retries','None'],
        ...(prior?[['Prior attempt',`${prior.errorCode.replaceAll('_',' ')} · billing ${prior.billingStatus.toLowerCase()}`]]:[]),
        ...(quote.warnings??[]).map((warning,index)=>[`Usage warning ${index+1}`,warning])
      ]
    });
    if(!approved)return {cancelled:true,quote};
  }
  return {cancelled:false,quote,result:await post('/api/property-research/research',{approvalId:quote.approvalId,idempotencyKey:crypto.randomUUID()})};
}
