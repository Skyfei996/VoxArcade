import {VoiceCapture,captureError} from './voice-capture.mjs';
const $=id=>document.getElementById(id);
const environment = {
  '安全上下文':isSecureContext?'是':'否：手机请使用可信 HTTPS 地址',
  '麦克风接口':navigator.mediaDevices?.getUserMedia?'存在，仍需实际采样':'不可用',
  '运行环境':/MicroMessenger/i.test(navigator.userAgent)?'微信内置网页':'普通浏览器',
  'WebAssembly':typeof WebAssembly==='object'?'存在，模型仍需实际加载':'不可用',
};
for (const [key,value] of Object.entries(environment)) {
  const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;$('environment').append(dt,dd);
}
let worker,modelReady=false,modelTimer,inferenceTimer,captureTimer,mode,operation=0,finishing=false;
let chunks=[],sampleCount=0,sampleRate=0,peak=0,maxRms=0,frames=0;
function status(id,text,error=false) { $(id).textContent=text;$(id).dataset.state=error?'error':'normal'; }
function controls(busy) {
  $('start').disabled=busy;$('stop').disabled=!busy;
  $('recognize').disabled=!modelReady||(busy&&mode!=='recognize');
  $('recognize').textContent=mode==='recognize'?'停止并识别':'开始说话（最多 8 秒）';
  $('loadModel').disabled=busy||Boolean(worker);
}
const capture=new VoiceCapture({
  onSamples(samples,rate) {
    frames++;sampleCount+=samples.length;sampleRate=rate;
    let energy=0;for(const value of samples) {energy+=value*value;peak=Math.max(peak,Math.abs(value));}
    const rms=Math.sqrt(energy/samples.length);maxRms=Math.max(maxRms,rms);$('level').value=Math.min(1,rms*8);
    $('metrics').textContent=`${rate} Hz · ${frames} 次音频回调 · ${(sampleCount/rate).toFixed(1)} 秒 · 峰值 ${peak.toFixed(4)}`;
    if (mode==='recognize') chunks.push(samples);
  },
  onEnded:()=>{ void finish(false,'系统中断了麦克风，请重新检测。'); },
});
async function begin(nextMode) {
  const id=++operation;mode=nextMode;chunks=[];sampleCount=0;sampleRate=0;peak=0;maxRms=0;frames=0;finishing=false;
  controls(true);status('captureStatus','等待麦克风授权并启动采集…');
  if(nextMode==='recognize') $('transcript').value='';
  try {
    if (!await capture.start() || id!==operation) return;
    status('captureStatus',`正在采集（${capture.method}），请说话；8 秒后自动停止。`);
    captureTimer=setTimeout(()=>void finish(true),8000);
  } catch(error) {
    if(id!==operation)return;
    mode=null;chunks=[];controls(false);status('captureStatus',captureError(error),true);
  }
}
async function finish(allowRecognition,message) {
  if(finishing)return;finishing=true;const id=++operation;clearTimeout(captureTimer);
  const previousMode=mode;mode=null;controls(true);$('stop').disabled=true;
  await capture.stop();$('level').value=0;
  if (id!==operation)return;
  const hasSignal=sampleCount>0&&peak>0.0001;
  status('captureStatus',message||(sampleCount===0?'麦克风已释放，但未收到音频采样。':hasSignal?'已收到音频且已释放麦克风。请结合音量变化确认是否为人声。':'已收到音频回调，但信号接近静音；请检查输入设备。'),!sampleCount);
  if(allowRecognition&&previousMode==='recognize'&&hasSignal&&modelReady) {
    const samples=new Float32Array(sampleCount);let offset=0;
    for(const chunk of chunks){samples.set(chunk,offset);offset+=chunk.length;}chunks=[];
    status('modelStatus','麦克风已释放，正在当前设备识别…');
    worker.postMessage({type:'recognize',id,sampleRate,samples:samples.buffer},[samples.buffer]);
    inferenceTimer=setTimeout(()=>modelError('识别超过 30 秒，已终止模型；请重新加载。'),30000);
  } else { chunks=[];controls(false);finishing=false; }
  $('summary').textContent=`本次采集：${sampleCount} 个采样，${frames} 次回调，最大 RMS ${maxRms.toFixed(5)}。原始声音未保存。`;
}
function modelError(message) {
  clearTimeout(modelTimer);clearTimeout(inferenceTimer);worker?.terminate();worker=null;modelReady=false;
  chunks=[];controls(capture.active);finishing=false;status('modelStatus',message,true);
}
$('start').onclick=()=>void begin('probe');
$('stop').onclick=()=>void finish(true);
$('recognize').onclick=()=>void (mode==='recognize'?finish(true):begin('recognize'));
$('clearText').onclick=()=>{$('transcript').value='';};
$('loadModel').onclick=()=>{
  $('loadModel').disabled=true;status('modelStatus','正在加载本站模型（模型数据约 79 MiB，WASM 约 11 MiB）…');
  worker=new Worker(new URL('./voice-recognizer-worker.js',import.meta.url));
  modelTimer=setTimeout(()=>modelError('模型加载超过 120 秒，已停止；请检查网络后重试。'),120000);
  worker.onerror=()=>modelError('当前浏览器无法运行模型，请重新加载或记录此设备不兼容。');
  worker.onmessage=event=>{
    const result=event.data;
      if(result.type==='ready') {clearTimeout(modelTimer);modelReady=true;status('modelStatus','模型已就绪；尚未完成本设备真实口令验收。');controls(Boolean(mode)||finishing);}
    if(result.type==='error')modelError(result.message);
    if(result.type==='result'&&result.id===operation) {
      clearTimeout(inferenceTimer);$('transcript').value=result.text||'';
      status('modelStatus',result.text?`本地识别完成，用时 ${result.elapsedMs} ms；请人工核对文字。`:'没有识别出文字，请重新说话。');
      finishing=false;controls(false);
    }
  };
  worker.postMessage({type:'load'});
};
function interrupt() {
  if(mode||capture.active)void finish(false,'页面已离开前台，麦克风已释放；请主动重新开始。');
  else if(finishing){operation++;clearTimeout(inferenceTimer);finishing=false;controls(false);status('modelStatus','已丢弃切后台前的识别结果。');}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});
addEventListener('pagehide',()=>{interrupt();worker?.terminate();worker=null;modelReady=false;clearTimeout(modelTimer);chunks=[];$('transcript').value='';});
addEventListener('pageshow',event=>{if(event.persisted){finishing=false;controls(false);status('modelStatus','页面已恢复，请主动重新加载模型。');}});
controls(false);
