import React,{useEffect,useState} from 'react';
import {useAuthentication} from '../../auth/AuthenticationGate.jsx';
import './commercial-credit.css';

const value=async response=>{const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error??'COMMERCIAL_REQUEST_FAILED');return body;};
export default function CommercialCreditStatus(){
  const authentication=useAuthentication(),[state,setState]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{fetch('/api/commercial/bootstrap',{credentials:'same-origin'}).then(value).then(setState).catch(reason=>{if(reason.message!=='COMMERCIAL_ADMIN_NOT_CONFIGURED')setError(reason.message);});},[]);
  async function checkout(){setBusy(true);setError('');try{const result=await value(await fetch('/api/commercial/checkout',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-PI-CSRF':authentication.csrfToken},body:JSON.stringify({quantity:1})}));if(!/^https:\/\/checkout\.stripe\.com\//.test(result.checkout?.url??''))throw new Error('STRIPE_CHECKOUT_URL_INVALID');location.assign(result.checkout.url);}catch(reason){setError(reason.message);}finally{setBusy(false);}}
  if(!state?.enabled)return null;const ownerFunded=state.flags?.ownerOrganizationId===state.user?.organizationId;
  return <aside className="commercial-credit-status" aria-label="Analysis credits"><div><span>{ownerFunded?'Owner-funded internal access':'Analysis credits'}</span><strong>{ownerFunded?'Included':state.balance?.available??0}</strong><small>{ownerFunded?'Server-controlled and audited':`${state.balance?.reserved??0} reserved`}</small></div>{!ownerFunded&&state.flags?.stripeCheckoutEnabled&&<button disabled={busy} onClick={checkout}>{busy?'Opening secure Checkout…':'Purchase 1 credit'}</button>}{!ownerFunded&&!state.flags?.stripeCheckoutEnabled&&<small>Credit purchases are not currently enabled.</small>}{error&&<p role="alert">{error.replaceAll('_',' ').toLowerCase()}</p>}</aside>;
}
