const headers={'Content-Type':'application/json','X-PI-Workspace':'local-v1'};

const addressLabel=address=>[address?.street,address?.city,[address?.state,address?.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
const dollars=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format((cents??0)/100);
const activityLabel=activity=>{
  const request=activity?.requests?.[0];
  if(!request)return null;
  const operation=({propertyRecords:'Property records',valuation:'Valuation',comparableSales:'Comparable sales'})[request.operation]??'RentCast research',date=new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short'}).format(new Date(request.requestedAt)),count=activity.requests.length;
  return `${operation} requested ${date} · ${request.status.toLowerCase()}${count>1?` · ${count} requests in the ${activity.windowDays}-day window`:''}`;
};

async function post(path,body){
  const response=await fetch(path,{method:'POST',credentials:'same-origin',headers,body:JSON.stringify(body)}),value=await response.json();
  if(!response.ok){const code=value.code||value.error,message=code==='RECENT_PROVIDER_ACTIVITY_CHANGED'?'Another RentCast request for this property occurred after the warning was prepared. Start the research action again to review and approve the updated seven-day warning.':value.error||'Provider research is unavailable.';throw Object.assign(new Error(message),{code});}
  return value;
}

export async function approveAndRunProviderResearch({dialog,payload,skipConfirmationWhenFree=false}){
  const quote=await post('/api/property-research/quote',payload),newRequests=quote.operations.filter(item=>item.requestRequired).length,available=quote.operations.length-newRequests,prior=quote.previousFailure,recentActivity=activityLabel(quote.recentProviderActivity);
  if(!(skipConfirmationWhenFree&&quote.estimatedMaximumChargeCents===0)){
    const approved=await dialog.confirm({
      title:prior?'Retry paid RentCast research?':recentActivity?'Recent RentCast activity — approve another request?':'Approve paid RentCast research?',
      message:prior?'The prior attempt did not return reusable evidence. Its billing status is unknown. This is a new, explicit request and may create another provider charge. No automatic retry will occur.':recentActivity?`RentCast research for this property was requested within the last ${quote.recentProviderActivity.windowDays} days. Continuing may create another provider charge. Review the recent activity and requested work below.`:'Review the maximum estimated provider charge before starting. PI will make only the requests shown below and will not retry automatically.',
      confirmLabel:'Approve & Research',cancelLabel:'Cancel',tone:'warning',
      details:[
        ['Provider',quote.provider],
        ['Research type',quote.researchType],
        ['Address',addressLabel(quote.address)],
        ['Estimated maximum charge',dollars(quote.estimatedMaximumChargeCents)],
        ['Cached / retained results',`${available} of ${quote.operations.length} available`],
        ['New provider requests',String(newRequests)],
        ['Automatic retries','None'],
        ...(recentActivity?[['Recent RentCast activity',recentActivity]]:[]),
        ...(prior?[['Prior attempt',`${prior.errorCode.replaceAll('_',' ')} · billing ${prior.billingStatus.toLowerCase()}`]]:[]),
        ...(quote.warnings??[]).map((warning,index)=>[`Usage warning ${index+1}`,warning])
      ]
    });
    if(!approved)return {cancelled:true,quote};
  }
  const result=await post('/api/property-research/research',{approvalId:quote.approvalId,idempotencyKey:crypto.randomUUID()}),timedOut=result.operations?.filter(item=>item.error==='PROVIDER_TIMEOUT')??[];
  if(timedOut.length)await dialog.notify({
    title:'RentCast request timed out',
    message:`${timedOut.map(item=>item.label).join(' and ')} did not finish within the configured provider timeout. No automatic retry occurred. You may retry immediately, but the prior request's billing status may be unknown.`,
    confirmLabel:'Close',tone:'warning'
  });
  return {cancelled:false,quote,result};
}
