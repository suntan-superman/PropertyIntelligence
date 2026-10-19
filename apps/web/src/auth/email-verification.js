export const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS=60_000;

const FIREBASE_ACTION_PARAMETERS=['mode','oobCode','apiKey','lang','continueUrl','tenantId','piEmailVerification'];

export function readEmailVerificationAction(search=''){
  const parameters=new URLSearchParams(search);
  if(parameters.get('mode')==='verifyEmail'&&parameters.get('oobCode'))return {kind:'APPLY_CODE',code:parameters.get('oobCode')};
  if(parameters.get('piEmailVerification')==='complete')return {kind:'REFRESH_USER'};
  return null;
}

export function clearEmailVerificationAction(url){
  const clean=new URL(url);
  for(const parameter of FIREBASE_ACTION_PARAMETERS)clean.searchParams.delete(parameter);
  return `${clean.pathname}${clean.search}${clean.hash}`;
}

export function verificationErrorMessage(error){
  switch(error?.code){
    case 'auth/expired-action-code':return 'This verification link has expired. Request a new verification email.';
    case 'auth/invalid-action-code':return 'This verification link is invalid or has already been used. Request a new verification email.';
    case 'auth/too-many-requests':return 'Firebase temporarily limited verification emails. Wait before trying again.';
    case 'auth/requires-recent-login':
    case 'auth/user-token-expired':return 'Your Firebase sign-in is no longer current. Sign out, sign in again, and retry.';
    case 'auth/network-request-failed':return 'Firebase could not be reached. Check your connection and retry.';
    default:return 'Email verification could not be completed. Request a new verification email and retry.';
  }
}

export function verificationCooldownRemaining(lastSentAt,now=Date.now(),cooldownMs=EMAIL_VERIFICATION_RESEND_COOLDOWN_MS){
  if(!Number.isFinite(lastSentAt))return 0;
  return Math.max(0,Math.ceil((lastSentAt+cooldownMs-now)/1000));
}
