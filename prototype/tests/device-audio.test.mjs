import test from 'node:test';
import assert from 'node:assert/strict';
import {deviceView} from '../entry.mjs';
import {SOUNDS,commandSound} from '../audio.mjs';
test('device choice follows device identity and survives narrow desktop and landscape phones',()=>{
  const screen={width:1920,height:1080},desktop={userAgent:'Windows Chrome',platform:'Win32',maxTouchPoints:0};
  assert.equal(deviceView(desktop,screen,false),'desktop');
  assert.equal(deviceView({...desktop,maxTouchPoints:10},screen,true),'desktop');
  assert.equal(deviceView({userAgent:'iPhone',maxTouchPoints:5},{width:844,height:390},true),'mobile');
  assert.equal(deviceView({userAgent:'Android',maxTouchPoints:5},{width:900,height:450},true),'mobile');
  assert.equal(deviceView({userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:5},{width:1024,height:1366},true),'mobile');
  assert.equal(deviceView({...desktop,userAgentData:{mobile:true}},screen,false),'mobile');
  assert.equal(deviceView(desktop,screen,false,'?view=mobile'),'mobile');
  assert.equal(deviceView({userAgent:'iPhone'},screen,true,'?view=desktop'),'desktop');
});
test('successful actions and collisions select different sounds',()=>{
  const commands=['MOVE_LEFT','MOVE_RIGHT','MOVE_DOWN','ROTATE_CW','ROTATE_CCW','HARD_DROP'];
  const names=commands.map(id=>commandSound({id},{ok:true}));assert.equal(new Set(names).size,6);
  assert.equal(commandSound({id:'MOVE_LEFT'},{ok:true,skipped:true}),'blocked');
  assert.equal(commandSound({id:'MOVE_LEFT'},{ok:true,terminal:true,reason:'sideBlocked'}),'blocked');
  assert.equal(commandSound({id:'ROTATE_CW'},{ok:true,skipped:true}),'rotationBlocked');
  assert.equal(commandSound({id:'SELECT_PIECE'},{ok:true}),null);
  assert.equal(commandSound({id:'MOVE_LEFT'},{ok:false}),'invalid');
  const fingerprints=Object.values(SOUNDS).map(sound=>JSON.stringify(sound.notes));assert.equal(new Set(fingerprints).size,fingerprints.length);
});
