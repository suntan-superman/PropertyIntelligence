export const REMEMBERED_EMAIL_KEY='pi-auth-remembered-email';

export function readRememberedEmail(storage=globalThis.localStorage){
  try{
    const value=String(storage?.getItem(REMEMBERED_EMAIL_KEY)??'').trim();
    return value.length<=254&&/^[^\s@]+@[^\s@]+$/.test(value)?value:'';
  }catch{return '';}
}

export function writeRememberedEmail(email,remember,storage=globalThis.localStorage){
  try{
    const value=String(email??'').trim();
    if(remember&&value.length<=254&&/^[^\s@]+@[^\s@]+$/.test(value))storage?.setItem(REMEMBERED_EMAIL_KEY,value);
    else storage?.removeItem(REMEMBERED_EMAIL_KEY);
  }catch{}
}
