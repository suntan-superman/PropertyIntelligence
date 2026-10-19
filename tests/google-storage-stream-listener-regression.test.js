import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {setImmediate} from 'node:timers/promises';
import test from 'node:test';
import {CRC32C,Storage} from '@google-cloud/storage';

const crc=bytes=>{const value=new CRC32C();value.update(bytes);return value.toString();};
const storageFor=server=>new Storage({
  apiEndpoint:`http://127.0.0.1:${server.address().port}`,
  projectId:'pi-offline-storage-listener-regression',
  retryOptions:{autoRetry:false}
});
const collect=async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks);};
const listen=server=>new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',resolve);
});
const close=async server=>{
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
};

test('private Storage downloads do not emit false MaxListeners warnings',async t=>{
  const bytes=Buffer.alloc(128*1024,0x5a);
  const server=createServer((_request,response)=>{
    response.writeHead(200,{
      'content-length':bytes.length,
      'content-type':'application/octet-stream',
      'x-goog-hash':`crc32c=${crc(bytes)}`,
      'x-goog-stored-content-encoding':'identity'
    });
    response.end(bytes);
  });
  await listen(server);
  t.after(()=>close(server));

  const warnings=[];
  const warningListener=warning=>{
    if(warning.name==='MaxListenersExceededWarning')warnings.push(warning);
  };
  process.on('warning',warningListener);
  t.after(()=>process.removeListener('warning',warningListener));

  const storage=storageFor(server);
  const received=await collect(storage.bucket('fixture').file('synthetic.bin').createReadStream());
  await setImmediate();

  assert.deepEqual(received,bytes);
  assert.deepEqual(warnings.map(({name,type,count})=>({name,type,count})),[]);
});

test('Storage CRC32C validation still rejects corrupted content',async t=>{
  const bytes=Buffer.from('synthetic supporting-document bytes');
  const server=createServer((_request,response)=>{
    response.writeHead(200,{
      'content-length':bytes.length,
      'content-type':'application/octet-stream',
      'x-goog-hash':`crc32c=${crc(Buffer.from('different bytes'))}`,
      'x-goog-stored-content-encoding':'identity'
    });
    response.end(bytes);
  });
  await listen(server);
  t.after(()=>close(server));

  await assert.rejects(
    collect(storageFor(server).bucket('fixture').file('synthetic.bin').createReadStream()),
    error=>error?.code==='CONTENT_DOWNLOAD_MISMATCH'
  );
});

test('premature response closure cannot produce a successful download',async t=>{
  const bytes=Buffer.alloc(64*1024,0x4a);
  const server=createServer((_request,response)=>{
    response.writeHead(200,{
      'content-length':bytes.length,
      'content-type':'application/octet-stream',
      'x-goog-hash':`crc32c=${crc(bytes)}`,
      'x-goog-stored-content-encoding':'identity'
    });
    response.write(bytes.subarray(0,1024));
    response.destroy();
  });
  await listen(server);
  t.after(()=>close(server));

  await assert.rejects(
    collect(storageFor(server).bucket('fixture').file('synthetic.bin').createReadStream()),
    error=>Boolean(error)
  );
});
