import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('./',import.meta.url);
const files={'/':'index.html','/index.html':'index.html','/styles.css':'styles.css','/app.js':'app.js','/engine.mjs':'engine.mjs'};
for(const file of ['audio.mjs','rotation-demo.html','rotation-demo.mjs','rotation-demo.css','desktop.html','mobile.html','base.css','desktop.css','mobile.css','entry.mjs','desktop-view.mjs','mobile-view.mjs','board-view.mjs'])files[`/${file}`]=file;
for(const file of ['voice-check.html','voice-check.css','voice-check.mjs','voice-capture.mjs','voice-worklet.js','voice-recognizer-worker.js'])files[`/${file}`]=file;
const voiceModel='voice-model/sherpa-onnx-wasm-simd-1.12.20-vad-asr-zh_en-paraformer_small/';
for(const file of ['sherpa-onnx-asr.js','sherpa-onnx-wasm-main-vad-asr.js','sherpa-onnx-wasm-main-vad-asr.wasm','sherpa-onnx-wasm-main-vad-asr.data'])files[`/${voiceModel}${file}`]=voiceModel+file;
const mime={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',wasm:'application/wasm',data:'application/octet-stream'};
const port=Number(process.env.PORT||4173);
const server=http.createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const file=files[path];if(!file){res.writeHead(404);res.end('Not found');return;}
  try{const body=await readFile(new URL(file,root));res.writeHead(200,{'Content-Type':mime[file.split('.').pop()],'Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(500);res.end('Preview file unavailable');}
});
server.listen(port,'0.0.0.0',()=>console.log(`VoxArcade preview: http://localhost:${port}\nWorkspace: ${fileURLToPath(root)}\nLAN preview is available on this computer's IPv4 address at port ${port}.`));
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
