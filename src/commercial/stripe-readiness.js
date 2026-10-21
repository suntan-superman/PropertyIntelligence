const configured=value=>Boolean(String(value??'').trim());
const mode=value=>String(value??'').startsWith('sk_live_')?'LIVE':String(value??'').startsWith('sk_test_')?'TEST':'UNKNOWN';
const sameSiteHttps=(value,origin)=>{try{const parsed=new URL(value);return parsed.protocol==='https:'&&parsed.origin===origin;}catch{return false;}};

/**
 * Read-only Stripe production/staging diagnostics. Secret values never leave
 * the server and this client never creates Checkout Sessions, payments or
 * Stripe objects.
 */
export function createStripeReadinessClient({secretKey,priceId,webhookSecret,successUrl,cancelUrl,origin,fetchImpl=fetch}={}){
  const key=String(secretKey??'').trim(),price=String(priceId??'').trim(),expectedOrigin=new URL(origin).origin,expectedWebhookUrl=`${expectedOrigin}/api/commercial/stripe/webhook`;
  async function stripeGet(path){
    const response=await fetchImpl(`https://api.stripe.com/v1/${path}`,{headers:{Authorization:`Bearer ${key}`}}),body=await response.json().catch(()=>({}));
    if(!response.ok)throw Object.assign(new Error('STRIPE_READINESS_REQUEST_FAILED'),{status:502,providerStatus:response.status,providerCode:body?.error?.code??body?.error?.type??'UNKNOWN'});
    return body;
  }
  return {async inspect(){
    const secretMode=mode(key),configuration={secretKeyPresent:configured(key),secretMode,priceIdPresent:configured(price),webhookSigningSecretPresent:configured(webhookSecret),successUrlConfigured:configured(successUrl),successUrlValid:sameSiteHttps(successUrl,expectedOrigin),cancelUrlConfigured:configured(cancelUrl),cancelUrlValid:sameSiteHttps(cancelUrl,expectedOrigin)};
    if(!configuration.secretKeyPresent||!configuration.priceIdPresent)return {configuration,price:null,webhook:{expectedUrl:expectedWebhookUrl,configured:false},ready:false};
    const [priceRecord,endpoints]=await Promise.all([stripeGet(`prices/${encodeURIComponent(price)}?expand%5B%5D=product`),stripeGet('webhook_endpoints?limit=100')]),endpoint=(endpoints.data??[]).find(item=>item.url===expectedWebhookUrl),requiredEvents=['checkout.session.completed','charge.refunded','charge.dispute.created'],enabledEvents=endpoint?.enabled_events??[],eventCoverage=requiredEvents.every(event=>enabledEvents.includes('*')||enabledEvents.includes(event));
    const priceResult={id:priceRecord.id,active:priceRecord.active===true,livemode:priceRecord.livemode===true,type:priceRecord.type,oneTime:priceRecord.type==='one_time'&&!priceRecord.recurring,currency:String(priceRecord.currency??'').toUpperCase(),unitAmount:priceRecord.unit_amount,product:{id:typeof priceRecord.product==='object'?priceRecord.product.id:priceRecord.product,name:typeof priceRecord.product==='object'?priceRecord.product.name:null,active:typeof priceRecord.product==='object'?priceRecord.product.active===true:null}},webhook={expectedUrl:expectedWebhookUrl,configured:Boolean(endpoint),status:endpoint?.status??null,livemode:endpoint?.livemode??null,eventCoverage,requiredEvents};
    const modeMatches=secretMode==='LIVE'?priceResult.livemode===true&&webhook.livemode===true:secretMode==='TEST'?priceResult.livemode===false&&webhook.livemode===false:false;
    return {configuration,price:priceResult,webhook,ready:configuration.webhookSigningSecretPresent&&configuration.successUrlValid&&configuration.cancelUrlValid&&priceResult.active&&priceResult.oneTime&&priceResult.product.active!==false&&webhook.configured&&webhook.status==='enabled'&&webhook.eventCoverage&&modeMatches};
  }};
}
