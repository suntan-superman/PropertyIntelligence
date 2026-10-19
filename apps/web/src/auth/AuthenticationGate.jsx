import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {applyActionCode,getIdToken,reload,sendEmailVerification,sendPasswordResetEmail,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import {firebaseClient} from './firebase-client.js';
import {readRememberedEmail,writeRememberedEmail} from './remembered-email.js';
import {SESSION_EXPIRED_EVENT,announceSessionExpired} from './session-lifecycle.js';
import {clearEmailVerificationAction,EMAIL_VERIFICATION_RESEND_COOLDOWN_MS,readEmailVerificationAction,verificationCooldownRemaining,verificationErrorMessage} from './email-verification.js';

const Context=createContext({enabled:false,user:null,csrfToken:null});
export const useAuthentication=()=>useContext(Context);

function PasswordVisibilityIcon({visible}){
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.75"/>{visible&&<path d="m4 4 16 16"/>}</svg>;
}

async function json(response){const body=await response.json().catch(()=>({}));if(!response.ok){const error=new Error(body.error||'Authentication request failed.');error.code=body.code??null;throw error;}return body;}

export function AuthenticationGate({children}){
  const [initialEmail]=useState(()=>readRememberedEmail()),[state,setState]=useState({loading:true,enabled:false,user:null,csrfToken:null,error:''}),[email,setEmail]=useState(initialEmail),[password,setPassword]=useState(''),[showPassword,setShowPassword]=useState(false),[rememberEmail,setRememberEmail]=useState(Boolean(initialEmail)),[busy,setBusy]=useState(false),[verificationBusy,setVerificationBusy]=useState(false),[verificationSentAt,setVerificationSentAt]=useState(null),[verificationClock,setVerificationClock]=useState(()=>Date.now()),[notice,setNotice]=useState(''),expiring=useRef(false),refreshingVerification=useRef(false);
  useEffect(()=>{let active=true;(async()=>{try{const config=await json(await fetch('/api/auth/config',{credentials:'same-origin'}));if(!config.enabled){if(active)setState({loading:false,enabled:false,user:null,csrfToken:null,error:''});return;}let user=null;try{user=(await json(await fetch('/api/auth/me',{credentials:'same-origin'}))).user;}catch{}if(active)setState({loading:false,enabled:true,user,csrfToken:config.csrfToken,error:''});}catch(error){if(active)setState({loading:false,enabled:true,user:null,csrfToken:null,error:error.message});}})();return()=>{active=false;};},[]);
  async function login(event){event.preventDefault();setBusy(true);setNotice('');try{const normalizedEmail=email.trim(),auth=await firebaseClient(),credential=await signInWithEmailAndPassword(auth,normalizedEmail,password),idToken=await getIdToken(credential.user,true);await json(await fetch('/api/auth/session',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-PI-CSRF':state.csrfToken},body:JSON.stringify({idToken})}));const verified=await json(await fetch('/api/auth/me',{credentials:'include',cache:'no-store'}));writeRememberedEmail(normalizedEmail,rememberEmail);setPassword('');setShowPassword(false);setState(current=>({...current,user:verified.user,error:''}));}catch(error){console.error('PI authentication failed:',error?.stack||error?.message||'Unknown authentication error.');const detail=error?.code?` (${error.code})`:'';setNotice(`Secure session could not be established${detail}. Sign in again after confirming local cookie access.`);}finally{setBusy(false);}}
  async function reset(){if(!email.trim()){setNotice('Enter the account email first.');return;}setBusy(true);try{await sendPasswordResetEmail(await firebaseClient(),email.trim());setNotice('If the account exists, Firebase sent password-reset instructions.');}catch{setNotice('Password reset could not be started. Verify the Firebase web configuration.');}finally{setBusy(false);}}
  async function logout(){setBusy(true);try{await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',headers:{'X-PI-CSRF':state.csrfToken}});try{await signOut(await firebaseClient());}catch{}setState(current=>({...current,user:null}));setNotice('Signed out.');}finally{setBusy(false);}}
  async function establishFreshVerifiedSession(firebaseUser){
    const idToken=await getIdToken(firebaseUser,true);
    await json(await fetch('/api/auth/session',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-PI-CSRF':state.csrfToken},body:JSON.stringify({idToken})}));
    const verified=await json(await fetch('/api/auth/me',{credentials:'include',cache:'no-store'}));
    if(verified.user?.emailVerified!==true)throw Object.assign(new Error('Firebase Admin has not confirmed the verified email yet.'),{code:'auth/email-not-verified'});
    setState(current=>({...current,user:verified.user,error:''}));
    setNotice('Email verified. A fresh secure PI session has been established.');
  }
  async function refreshEmailVerification({quiet=false}={}){
    if(refreshingVerification.current)return;
    refreshingVerification.current=true;setVerificationBusy(true);
    try{
      const auth=await firebaseClient(),firebaseUser=auth.currentUser;
      if(!firebaseUser)throw Object.assign(new Error('Firebase user unavailable.'),{code:'auth/user-token-expired'});
      await reload(firebaseUser);
      if(!firebaseUser.emailVerified){if(!quiet)setNotice('Firebase has not confirmed the email yet. Open the verification link, then return here.');return;}
      await establishFreshVerifiedSession(firebaseUser);
    }catch(error){if(!quiet)setNotice(error?.code==='auth/email-not-verified'?error.message:verificationErrorMessage(error));}
    finally{setVerificationBusy(false);refreshingVerification.current=false;}
  }
  async function sendVerification(){
    const remaining=verificationCooldownRemaining(verificationSentAt);
    if(remaining){setNotice(`Please wait ${remaining} seconds before requesting another verification email.`);return;}
    setVerificationBusy(true);
    try{
      const auth=await firebaseClient(),firebaseUser=auth.currentUser;
      if(!firebaseUser)throw Object.assign(new Error('Firebase user unavailable.'),{code:'auth/user-token-expired'});
      await reload(firebaseUser);
      if(firebaseUser.emailVerified){await establishFreshVerifiedSession(firebaseUser);return;}
      await sendEmailVerification(firebaseUser);
      const sentAt=Date.now();setVerificationSentAt(sentAt);setVerificationClock(sentAt);
      setNotice('Verification email requested successfully. Open the Firebase link, then return to PI; verification will refresh automatically.');
    }catch(error){setNotice(verificationErrorMessage(error));}
    finally{setVerificationBusy(false);}
  }
  useEffect(()=>{const expired=async()=>{if(expiring.current||!state.user)return;expiring.current=true;setBusy(true);try{await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',headers:{'X-PI-CSRF':state.csrfToken}}).catch(()=>null);try{await signOut(await firebaseClient());}catch{}setState(current=>({...current,user:null}));setNotice('Your secure session expired. PI saved a temporary browser recovery copy of unsaved analysis work; sign in to continue.');}finally{setBusy(false);expiring.current=false;}};window.addEventListener(SESSION_EXPIRED_EVENT,expired);return()=>window.removeEventListener(SESSION_EXPIRED_EVENT,expired);},[state.user,state.csrfToken]);
  useEffect(()=>{const expires=Date.parse(state.user?.sessionExpiresAt??'');if(!Number.isFinite(expires))return;const remaining=expires-Date.now();if(remaining<=0){announceSessionExpired('SESSION_EXPIRED');return;}const timer=setTimeout(()=>announceSessionExpired('SESSION_EXPIRED'),Math.min(remaining,2_147_000_000));return()=>clearTimeout(timer);},[state.user?.uid,state.user?.sessionExpiresAt]);
  useEffect(()=>{if(!verificationSentAt)return;const timer=setInterval(()=>setVerificationClock(Date.now()),1000);return()=>clearInterval(timer);},[verificationSentAt]);
  useEffect(()=>{if(!state.enabled)return;const action=readEmailVerificationAction(window.location.search);if(!action)return;let active=true;(async()=>{setVerificationBusy(true);try{const auth=await firebaseClient();if(action.kind==='APPLY_CODE')await applyActionCode(auth,action.code);if(auth.currentUser){await reload(auth.currentUser);if(auth.currentUser.emailVerified)await establishFreshVerifiedSession(auth.currentUser);else if(active)setNotice('Firebase has not confirmed the email yet. Request a new verification email.');}else if(active)setNotice('Email verification was accepted. Sign in to establish a fresh PI session.');}catch(error){if(active)setNotice(verificationErrorMessage(error));}finally{window.history.replaceState({},'',clearEmailVerificationAction(window.location.href));if(active)setVerificationBusy(false);}})();return()=>{active=false;};},[state.enabled]);
  useEffect(()=>{if(!state.user||state.user.emailVerified||!verificationSentAt)return;const check=()=>{if(document.visibilityState==='visible')refreshEmailVerification({quiet:true});};window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);return()=>{window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);};},[state.user?.uid,state.user?.emailVerified,verificationSentAt]);
  if(state.loading)return <main className="auth-screen"><section className="auth-card"><h1>Property Intelligence</h1><p>Checking your secure session…</p></section></main>;
  if(!state.enabled)return <Context.Provider value={{enabled:false,user:null,csrfToken:null}}>{children}</Context.Provider>;
  if(!state.user)return <main className="auth-screen"><form className="auth-card" onSubmit={login}><p className="eyebrow">PROPERTY INTELLIGENCE · SECURE ACCESS</p><h1>Sign in</h1><p>Use the Firebase account assigned by your Property Intelligence administrator.</p><label>Email<input type="email" autoComplete="username" required value={email} onChange={event=>setEmail(event.target.value)}/></label><div className="auth-password-group"><label htmlFor="pi-auth-password">Password</label><div className="auth-password-field"><input id="pi-auth-password" type={showPassword?'text':'password'} autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)}/><button className="auth-password-toggle" type="button" aria-controls="pi-auth-password" aria-pressed={showPassword} aria-label={showPassword?'Hide password':'Show password'} title={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(value=>!value)}><PasswordVisibilityIcon visible={showPassword}/></button></div></div><label className="auth-remember"><input type="checkbox" checked={rememberEmail} onChange={event=>{const checked=event.target.checked;setRememberEmail(checked);if(!checked)writeRememberedEmail('',false);}}/><span>Remember my email on this device</span></label><button disabled={busy}>{busy?'Signing in…':'Sign in'}</button><button className="secondary" type="button" disabled={busy} onClick={reset}>Reset password</button>{(notice||state.error)&&<p role="status" className="auth-notice">{notice||state.error}</p>}<small>Only the email address is remembered. Your password is never stored by PI.</small><small>Provider research is restricted by your server-verified PI role, organization, quota and account limits.</small></form></main>;
  const cooldownSeconds=verificationCooldownRemaining(verificationSentAt,verificationClock);
  return <Context.Provider value={{enabled:true,user:state.user,csrfToken:state.csrfToken,logout}}><div className={`authenticated-user${state.user.emailVerified?'':' verification-required'}`}><span>{state.user.role} session · {state.user.emailVerified?'Email verified':'Email not verified'}</span>{!state.user.emailVerified&&<><button type="button" disabled={verificationBusy||cooldownSeconds>0} onClick={sendVerification}>{verificationBusy?'Working…':cooldownSeconds>0?`Resend in ${cooldownSeconds}s`:'Send Verification Email'}</button><button className="secondary" type="button" disabled={verificationBusy} onClick={()=>refreshEmailVerification()}>Refresh verification</button></>}<button className="secondary" disabled={busy||verificationBusy} onClick={logout}>Sign out</button>{notice&&<small role="status" className="authenticated-user-notice">{notice}</small>}</div>{children}</Context.Provider>;
}
