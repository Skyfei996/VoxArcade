let recognizer;
const modelRoot = new URL('./voice-model/sherpa-onnx-wasm-simd-1.12.20-vad-asr-zh_en-paraformer_small/',self.location.href);
var Module = {
  locateFile: file=>new URL(file,modelRoot).href,
  print: ()=>{}, printErr: ()=>{},
  setStatus: status=>{ if (status) self.postMessage({type:'progress',status}); },
  onAbort: ()=>self.postMessage({type:'error',message:'本地模型运行失败，请重新加载。'}),
  onRuntimeInitialized: ()=>{
    try {
      recognizer = new OfflineRecognizer({modelConfig:{tokens:'./tokens.txt',paraformer:{model:'./paraformer.onnx'},numThreads:1,debug:0}},Module);
      if (!recognizer.handle) throw new Error('Recognizer unavailable');
      self.postMessage({type:'ready'});
    } catch { self.postMessage({type:'error',message:'识别器初始化失败。'}); }
  },
};
self.onmessage = event=>{
  if (event.data.type === 'load') {
    try {
      importScripts(new URL('sherpa-onnx-asr.js',modelRoot).href);
      importScripts(new URL('sherpa-onnx-wasm-main-vad-asr.js',modelRoot).href);
    } catch { self.postMessage({type:'error',message:'无法加载本地模型文件，请检查资源是否完整。'}); }
  } else if (event.data.type === 'recognize' && recognizer) {
    let stream;
    try {
      const started = performance.now();
      stream = recognizer.createStream();
      stream.acceptWaveform(event.data.sampleRate,new Float32Array(event.data.samples));
      recognizer.decode(stream);
      self.postMessage({type:'result',id:event.data.id,text:recognizer.getResult(stream).text,elapsedMs:Math.round(performance.now()-started)});
    } catch { self.postMessage({type:'error',message:'本次本地识别失败，请重新加载模型。'}); }
    finally { stream?.free(); }
  }
};
