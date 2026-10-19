import {getApp,getApps,initializeApp} from 'firebase/app';
import {browserLocalPersistence,getAuth,setPersistence} from 'firebase/auth';

let runtimeConfiguration=null;

export function firebaseWebConfiguration(){
  const config=runtimeConfiguration;
  if(!config)throw new Error('Firebase web configuration has not been loaded from the authenticated server.');
  if(Object.values(config).some(value=>typeof value!=='string'||!value.trim()))throw new Error('Firebase web configuration is incomplete.');
  return config;
}

export function configureFirebaseClient(config){
  if(!config||['apiKey','authDomain','projectId','appId'].some(key=>typeof config[key]!=='string'||!config[key].trim()))throw new Error('Firebase web configuration is incomplete.');
  if(getApps().length&&JSON.stringify(firebaseWebConfiguration())!==JSON.stringify(config))throw new Error('Firebase web configuration cannot change during an authenticated session.');
  runtimeConfiguration={apiKey:config.apiKey,authDomain:config.authDomain,projectId:config.projectId,appId:config.appId};
}

export async function firebaseClient(){
  const app=getApps().length?getApp():initializeApp(firebaseWebConfiguration()),auth=getAuth(app);await setPersistence(auth,browserLocalPersistence);return auth;
}
