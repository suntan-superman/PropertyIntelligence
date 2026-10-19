import {getApp,getApps,initializeApp} from 'firebase/app';
import {browserLocalPersistence,getAuth,setPersistence} from 'firebase/auth';

export function firebaseWebConfiguration(env=import.meta.env){
  const config={apiKey:env.PI_PUBLIC_FIREBASE_API_KEY,authDomain:env.PI_PUBLIC_FIREBASE_AUTH_DOMAIN,projectId:env.PI_PUBLIC_FIREBASE_PROJECT_ID,appId:env.PI_PUBLIC_FIREBASE_APP_ID};
  if(Object.values(config).some(value=>typeof value!=='string'||!value.trim()))throw new Error('Firebase web configuration is incomplete.');
  return config;
}

export async function firebaseClient(){
  const app=getApps().length?getApp():initializeApp(firebaseWebConfiguration()),auth=getAuth(app);await setPersistence(auth,browserLocalPersistence);return auth;
}
