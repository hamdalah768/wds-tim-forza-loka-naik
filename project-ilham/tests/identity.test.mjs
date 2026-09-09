import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyGoogleToken } from '../server/google-identity.mjs';
import { createApp } from '../server/app.mjs';
import { inject } from './http-harness.mjs';

const pair=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...pair.publicKey.export({format:'jwk'}),kid:'test-key',use:'sig',alg:'RS256'};
const now=Math.floor(Date.now()/1000);
const claims={iss:'https://accounts.google.com',aud:'our-client',sub:'subject-one',email:'one@example.test',email_verified:true,nonce:'unique-nonce',iat:now,exp:now+300};
function jwt(p={},h={}){
  const a=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid,...h})).toString('base64url'),b=Buffer.from(JSON.stringify({...claims,...p})).toString('base64url');
  return a+'.'+b+'.'+sign('RSA-SHA256',Buffer.from(a+'.'+b),pair.privateKey).toString('base64url');
}
test('Google: signature, issuer, audience, time and nonce must all match',()=>{
  const verify=t=>verifyGoogleToken(t,[jwk],'our-client','unique-nonce');
  assert.equal(verify(jwt()).sub,'subject-one');
  for(const changed of [{iss:'https://other.example'},{aud:'other-client'},{nonce:'replayed-nonce'},{exp:now-1},{iat:now-700},{email_verified:false},{sub:''},{aud:['our-client','extra'],azp:'extra'},{nbf:now+100}]) assert.throws(()=>verify(jwt(changed)));
  assert.throws(()=>verify(jwt({}, {alg:'none'})));
  assert.throws(()=>verify(jwt({}, {kid:'unknown'})));
  const parts=jwt().split('.');parts[1]=Buffer.from(JSON.stringify({...claims,sub:'forged'})).toString('base64url');assert.throws(()=>verify(parts.join('.')));
});

function client(app){
  let cookie='',csrf='';
  return async(path,body)=>{
    const method=body===undefined?'GET':'POST',payload=body===undefined?'':JSON.stringify(body);
    const r=await inject(app.server,path,{method,payload,headers:{host:'localhost:3000',cookie,origin:'http://localhost:3000','content-type':'application/json','x-csrf-token':csrf}});
    if(r.headers['set-cookie'])cookie=r.headers['set-cookie'][0].split(';')[0];if(r.data?.csrf)csrf=r.data.csrf;
    return r;
  };
}
test('SMS: valid verification binds the session; wrong code and replay are rejected',async()=>{
  let approvals=0;
  const app=createApp({database:':memory:',socialEnv:{TWILIO_ACCOUNT_SID:'AC'+'1'.repeat(32),TWILIO_AUTH_TOKEN:'test-private',TWILIO_VERIFY_SERVICE_SID:'VA'+'2'.repeat(32)},socialFetch:async(url,init)=>{
    assert.ok(url.startsWith('https://verify.twilio.com/'));assert.equal(init.redirect,'error');
    const body=new URLSearchParams(init.body);const valid=body.get('Code')==='123456';
    if(valid)approvals++;
    return {ok:true,json:async()=>({status:url.endsWith('/Verifications')?'pending':valid?'approved':'pending'})};
  }});
  try{
    const a=client(app),b=client(app);assert.equal((await a('/api/session')).data.providers.phone,true);await b('/api/session');
    assert.equal((await a('/api/auth/phone/send',{phone:'081234567890'})).status,200);
    assert.equal((await b('/api/auth/phone/check',{code:'123456'})).status,400);
    assert.equal((await a('/api/auth/phone/check',{code:'999999'})).status,400);
    const ok=await a('/api/auth/phone/check',{code:'123456'});assert.equal(ok.status,200);assert.equal(ok.data.user.phone,'+6281234567890');assert.equal(ok.data.user.email,null);
    assert.equal((await a('/api/auth/phone/check',{code:'123456'})).status,400);assert.equal(approvals,1);
  }finally{app.server.emit('close');}
});
test('Facebook: state is one-use, app and subject are verified, credentials stay server-side',async()=>{
  const app=createApp({database:':memory:',socialEnv:{FACEBOOK_APP_ID:'123',FACEBOOK_APP_SECRET:'test-private',FACEBOOK_GRAPH_VERSION:'v99.0'},socialFetch:async(url,init)=>{
    const u=new URL(url);assert.equal(u.hostname,'graph.facebook.com');
    if(u.pathname.endsWith('/oauth/access_token'))return{ok:true,json:async()=>({access_token:'server-only-token'})};
    if(u.pathname.endsWith('/debug_token'))return{ok:true,json:async()=>({data:{is_valid:true,app_id:'123',user_id:'fb-user-one',expires_at:now+3600}})};
    assert.ok(u.searchParams.has('appsecret_proof'));return{ok:true,json:async()=>({id:'fb-user-one',name:'Pengguna Uji',email:'fb@example.test'})};
  }});
  try{
    const a=client(app);await a('/api/session');const r=await a('/api/auth/facebook',{});assert.equal(r.status,200);
    const u=new URL(r.data.url);assert.equal(u.hostname,'www.facebook.com');const state=u.searchParams.get('state');
    assert.equal((await a('/api/auth/facebook/callback?state=invalid&code=code')).headers.location,'/?auth=facebook_failed#akun');
    assert.equal((await a('/api/auth/facebook/callback?state='+state+'&code=code')).headers.location,'/#akun');
    const session=await a('/api/session');assert.equal(session.data.user.provider,'facebook');assert.ok(!session.text.includes('server-only-token'));
    assert.equal((await a('/api/auth/facebook/callback?state='+state+'&code=code')).headers.location,'/?auth=facebook_failed#akun');
  }finally{app.server.emit('close');}
});
