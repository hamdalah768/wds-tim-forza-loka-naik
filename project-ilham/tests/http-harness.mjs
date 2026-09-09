/* Exercise the real HTTP request listener without opening network ports.
 * HTTP parsing and browser behaviour are outside this harness's scope. */
import {Readable} from 'node:stream';
export function inject(server,path,{method='GET',headers={},payload=''}={}){
  return new Promise((resolve,reject)=>{
    const req=Readable.from(payload?[Buffer.from(payload)]:[]);
    req.url=path;req.method=method;
    req.headers=Object.fromEntries(Object.entries(headers).map(([k,v])=>[k.toLowerCase(),v]));
    req.socket={remoteAddress:'127.0.0.1'};
    const values={};
    const res={
      statusCode:200,headersSent:false,
      setHeader(name,value){values[name.toLowerCase()]=value;return this;},
      getHeader(name){return values[name.toLowerCase()];},
      writeHead(status,items={}){this.statusCode=status;for(const [k,v] of Object.entries(items))this.setHeader(k,v);this.headersSent=true;return this;},
      end(bytes){
        this.headersSent=true;
        const text=bytes===undefined?'':Buffer.from(bytes).toString();let data;
        try{data=JSON.parse(text);}catch{}
        if(values['set-cookie']&&!Array.isArray(values['set-cookie']))values['set-cookie']=[values['set-cookie']];
        resolve({status:this.statusCode,headers:values,text,data});
      }
    };
    const handler=server.listeners('request')[0];
    Promise.resolve(handler(req,res)).catch(reject);
  });
}
