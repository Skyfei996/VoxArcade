import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VoiceCapture} from '../voice-capture.mjs';
globalThis.isSecureContext=true;
function deferred(){let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};}
function fixture(){
  const track={readyState:'live',onended:null,stop(){this.readyState='ended';}};
  const stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
  const node=()=>({connect(){},disconnect(){}});
  const processor={...node(),onaudioprocess:null};
  const context={sampleRate:48000,state:'suspended',destination:{},createScriptProcessor:()=>processor,
    createMediaStreamSource:node,createGain:()=>({...node(),gain:{value:1}}),
    async resume(){this.state='running';},async close(){this.state='closed';}};
  return {track,stream,context,processor};
}
test('permission rejection does not leave capture active',async()=>{
  const capture=new VoiceCapture({mediaDevices:{getUserMedia:async()=>{throw new DOMException('denied','NotAllowedError');}}});
  await assert.rejects(capture.start(),{name:'NotAllowedError'});assert.equal(capture.active,false);assert.equal(capture.stream,null);
});
test('permission timeout releases a subsequently granted microphone',async()=>{
  const pending=deferred(),f=fixture(),capture=new VoiceCapture({mediaDevices:{getUserMedia:()=>pending.promise},timeoutMs:5});
  await assert.rejects(capture.start(),{name:'TimeoutError'});pending.resolve(f.stream);await pending.promise;await Promise.resolve();
  assert.equal(f.track.readyState,'ended');assert.equal(capture.active,false);
});
test('cancelled permission result cannot replace a newer capture',async()=>{
  const pending=deferred(),old=fixture(),current=fixture();let requests=0;
  const capture=new VoiceCapture({mediaDevices:{getUserMedia:()=>++requests===1?pending.promise:Promise.resolve(current.stream)},createContext:()=>current.context});
  const first=capture.start();await Promise.resolve();await capture.stop();assert.equal(await capture.start(),true);
  pending.resolve(old.stream);assert.equal(await first,false);assert.equal(old.track.readyState,'ended');assert.equal(capture.stream,current.stream);
  assert.equal(capture.active,true);await capture.stop();assert.equal(current.track.readyState,'ended');assert.equal(current.context.state,'closed');
});
test('audio initialization failure releases acquired tracks',async()=>{
  const f=fixture(),capture=new VoiceCapture({mediaDevices:{getUserMedia:async()=>f.stream},createContext:()=>{throw new Error('audio unavailable');}});
  await assert.rejects(capture.start(),/audio unavailable/);assert.equal(f.track.readyState,'ended');
});
test('system interruption closes the graph and notifies once',async()=>{
  const f=fixture();let ended=0;
  const capture=new VoiceCapture({mediaDevices:{getUserMedia:async()=>f.stream},createContext:()=>f.context,onEnded:()=>ended++});
  await capture.start();f.track.onended();await Promise.resolve();assert.equal(ended,1);assert.equal(capture.active,false);assert.equal(f.context.state,'closed');
});
test('stop during worklet loading never resumes or leaks the context',async()=>{
  const pending=deferred(),f=fixture();f.context.audioWorklet={addModule:()=>pending.promise};
  const capture=new VoiceCapture({mediaDevices:{getUserMedia:async()=>f.stream},createContext:()=>f.context});
  const started=capture.start();await new Promise(resolve=>setImmediate(resolve));await capture.stop();pending.resolve();
  assert.equal(await started,false);assert.equal(f.track.readyState,'ended');assert.equal(f.context.state,'closed');
});
