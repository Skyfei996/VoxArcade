import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.argv[2]||'playwright');
const physical=process.argv.includes('--physical'),audioFile=process.argv.find(arg=>arg.startsWith('--audio='))?.slice(8);
if(!physical&&!audioFile)throw new Error('Choose --physical or --audio=<synthetic wav path>.');
const args=physical?[]:['--use-fake-device-for-media-stream',`--use-file-for-fake-audio-capture=${audioFile}`];
const browser=await chromium.launch({channel:'msedge',headless:true,args});
const base='http://localhost:4173',requests=[],methods=[],errors=[];
const context=await browser.newContext({viewport:{width:390,height:844}});
context.on('request',request=>{requests.push(request.url());methods.push(request.method());});
await context.grantPermissions(['microphone'],{origin:base});
const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
await page.addInitScript(()=>{
  window.captureRequests=0;window.testTracks=[];
  const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia=async options=>{
    window.captureRequests++;const stream=await original(options);window.testTracks.push(...stream.getTracks());return stream;
  };
});
try{
  await page.goto(base+'/voice-check.html');
  assert.equal(await page.evaluate(()=>window.captureRequests),0,'no microphone request on page load');
  assert.equal(requests.some(url=>url.includes('voice-model/')),false,'no model download on page load');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#start').click();
  await page.waitForFunction(()=>document.getElementById('metrics').textContent.includes('Hz')||document.getElementById('captureStatus').dataset.state==='error',{},{timeout:20000});
  const status=await page.locator('#captureStatus').textContent();
  if(await page.locator('#captureStatus').getAttribute('data-state')==='error')throw new Error(`${physical?'PHYSICAL':'SYNTHETIC'} capture failed: ${status}`);
  await page.waitForFunction(()=>document.getElementById('metrics').textContent.includes('3.0 秒'),{},{timeout:12000});
  await page.locator('#stop').click();await page.waitForFunction(()=>!document.getElementById('start').disabled);
  assert.equal(await page.evaluate(()=>window.testTracks.every(track=>track.readyState==='ended')),true);
  console.log(JSON.stringify({test:physical?'physical-microphone':'synthetic-microphone',status:await page.locator('#captureStatus').textContent(),metrics:await page.locator('#metrics').textContent(),summary:await page.locator('#summary').textContent(),tracksReleased:true}));
  if(!physical){
    await page.locator('#loadModel').click();
    await page.waitForFunction(()=>!document.getElementById('recognize').disabled||document.getElementById('modelStatus').dataset.state==='error',{},{timeout:125000});
    assert.notEqual(await page.locator('#modelStatus').getAttribute('data-state'),'error',await page.locator('#modelStatus').textContent());
    console.log('PASS: real WASM model initialized in worker without cross-origin isolation.');
    console.log(JSON.stringify(await page.workers()[0].evaluate(()=>({test:'model-memory',wasmHeapBytes:Module.HEAPU8.byteLength}))));
    await context.setOffline(true);
    await page.locator('#recognize').click();
    await page.waitForFunction(()=>document.getElementById('metrics').textContent.includes('5.0 秒'),{},{timeout:15000});
    await page.locator('#recognize').click();
    await page.waitForFunction(()=>document.getElementById('modelStatus').textContent.includes('识别完成')||document.getElementById('modelStatus').dataset.state==='error',{},{timeout:35000});
    const transcript=await page.locator('#transcript').inputValue();
    assert.ok(transcript.length>0,await page.locator('#modelStatus').textContent());
    const expected=process.argv.find(arg=>arg.startsWith('--expect='))?.slice(9);
    if(expected)for(const word of expected.split(','))assert.ok(transcript.toLowerCase().includes(word.toLowerCase()),`Missing ${word}: ${transcript}`);
    console.log(JSON.stringify({test:'synthetic-offline-asr',transcript,status:await page.locator('#modelStatus').textContent(),crossOriginIsolated:await page.evaluate(()=>crossOriginIsolated)}));
    assert.equal(await page.evaluate(()=>window.testTracks.every(track=>track.readyState==='ended')),true);
    await page.locator('#clearText').click();assert.equal(await page.locator('#transcript').inputValue(),'');
  }
  assert.equal(requests.every(url=>new URL(url).origin===base),true,'no third-party requests');assert.deepEqual(errors,[]);
  assert.equal(methods.every(method=>method==='GET'),true,'no audio upload requests');
  await page.screenshot({path:fileURLToPath(new URL('../review/voice-check-'+(physical?'physical':'synthetic')+'.png',import.meta.url)),fullPage:true});
  if(!physical){
    await context.setOffline(false);
    // Hold test-only track references in the parent to inspect them after an actual iframe navigation.
    await page.addInitScript(()=>{if(window.parent!==window)window.testTracks=window.parent.testTracks;});
    await page.evaluate(()=>{const frame=document.createElement('iframe');frame.id='lifecycleTest';frame.src='./voice-check.html';document.body.append(frame);});
    const frame=page.frameLocator('#lifecycleTest');await frame.locator('#start').click();
    await frame.locator('#metrics').filter({hasText:'Hz'}).waitFor();
    assert.equal(await page.evaluate(()=>window.testTracks.some(track=>track.readyState==='live')),true);
    await page.evaluate(()=>document.querySelector('#lifecycleTest').contentWindow.location.href='about:blank');
    await page.waitForFunction(()=>window.testTracks.every(track=>track.readyState==='ended'));
    console.log('PASS: actual pagehide releases active microphone tracks.');
    await page.locator('#start').click();await page.waitForFunction(()=>!document.getElementById('start').disabled,{},{timeout:12000});
    assert.equal(await page.evaluate(()=>window.testTracks.every(track=>track.readyState==='ended')),true);
    console.log('PASS: eight-second capture limit releases microphone automatically.');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: microphone released; no audio upload; no page errors.');
}finally{await browser.close();}
