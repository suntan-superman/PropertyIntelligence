// Adapted from the reference application's single-script/callback/auth-failure pattern.
let promise=null,script=null,authFailed=false;
const FAILURE='pi-google-maps-failure';
export const onGoogleFailure=handler=>{window.addEventListener(FAILURE,handler);return()=>window.removeEventListener(FAILURE,handler);};
export function loadGoogleMaps(browserKey,{timeout=12000}={}) {
  if(!browserKey)return Promise.reject(new Error('Google Maps browser key is not configured.'));
  if(authFailed)return Promise.reject(new Error('Google Maps authorization failed. Check browser-key restrictions.'));
  if(window.google?.maps?.Map)return Promise.resolve(window.google.maps);
  if(promise)return promise;
  promise=new Promise((resolve,reject)=>{
    const previousAuthFailure=window.gm_authFailure;
    let settled=false;
    const fail=message=>{
      if(!settled){settled=true;clearTimeout(timer);reject(new Error(message));}
      window.dispatchEvent(new CustomEvent(FAILURE,{detail:message}));
    };
    window.gm_authFailure=()=>{authFailed=true;fail('Google Maps authorization failed. Check browser-key restrictions.');if(typeof previousAuthFailure==='function')previousAuthFailure();};
    window.__piGoogleMapsReady=()=>{if(!settled&&window.google?.maps?.Map){settled=true;clearTimeout(timer);resolve(window.google.maps);}};
    const timer=setTimeout(()=>fail('Google Maps did not load in time.'),timeout);
    script=document.createElement('script');script.dataset.piGoogleMaps='true';script.async=true;script.defer=true;
    script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(browserKey)}&v=weekly&loading=async&callback=__piGoogleMapsReady`;
    script.onerror=()=>fail('Google Maps could not be reached.');document.head.append(script);
  });
  // Failed attempts stay rejected until explicit Retry; re-renders never reload.
  return promise;
}
export function retryGoogleMaps(){promise=null;script?.remove();script=null;authFailed=false;}
