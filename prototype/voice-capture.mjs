export function captureError(error) {
  const messages = {
    NotAllowedError:'麦克风授权未通过。请检查微信/浏览器及系统中的麦克风权限。',
    NotFoundError:'没有找到可用的麦克风。',
    NotReadableError:'麦克风无法读取，可能被其他应用占用或被系统限制。',
    SecurityError:'当前页面或宿主不允许麦克风采集。',
    NotSupportedError:'当前微信或浏览器未开放网页麦克风采集接口。',
    TimeoutError:'麦克风请求超时。若授权框仍在，请先处理，再重新检测。',
  };
  return messages[error?.name] || `采集失败（${error?.name || 'UnknownError'}）。请重新检测。`;
}

export class VoiceCapture {
  constructor({onSamples = ()=>{}, onEnded = ()=>{}, mediaDevices = globalThis.navigator?.mediaDevices,
    createContext = ()=>new (globalThis.AudioContext || globalThis.webkitAudioContext)(),
    createWorklet = context=>new AudioWorkletNode(context,'voice-capture'), timeoutMs = 15000} = {}) {
    Object.assign(this,{onSamples,onEnded,mediaDevices,createContext,createWorklet,timeoutMs});
    this.generation = 0; this.active = false;
  }
  async start() {
    await this.stop();
    const generation = this.generation;
    if (!globalThis.isSecureContext) throw new DOMException('HTTPS required','SecurityError');
    if (!this.mediaDevices?.getUserMedia) throw new DOMException('Capture unavailable','NotSupportedError');
    const request = this.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
    let timer;
    request.then(stream=>{ if (this.generation !== generation) stream.getTracks().forEach(track=>track.stop()); },()=>{});
    try {
      const stream = await Promise.race([request,new Promise((_,reject)=>{
        timer = setTimeout(()=>reject(new DOMException('Permission timeout','TimeoutError')),this.timeoutMs);
      })]);
      if (this.generation !== generation) { stream.getTracks().forEach(track=>track.stop()); return false; }
      this.stream = stream;
      this.context = this.createContext();
      if (this.context.audioWorklet) {
        await this.context.audioWorklet.addModule(new URL('./voice-worklet.js',import.meta.url));
        if (this.generation !== generation) return false;
        this.processor = this.createWorklet(this.context);
        this.processor.port.onmessage = event=>this.receive(event.data,generation);
        this.method = 'AudioWorklet';
      } else {
        this.processor = this.context.createScriptProcessor(2048,1,1);
        this.processor.onaudioprocess = event=>this.receive(new Float32Array(event.inputBuffer.getChannelData(0)),generation);
        this.method = 'ScriptProcessor';
      }
      this.source = this.context.createMediaStreamSource(this.stream);
      this.silent = this.context.createGain(); this.silent.gain.value = 0;
      this.source.connect(this.processor); this.processor.connect(this.silent); this.silent.connect(this.context.destination);
      this.stream.getAudioTracks().forEach(track=>track.onended=()=>{
        if (generation === this.generation) { void this.stop(); this.onEnded(); }
      });
      await this.context.resume();
      if (this.generation !== generation) return false;
      this.active = true; return true;
    } catch (error) {
      if (this.generation === generation) await this.stop();
      throw error;
    } finally { clearTimeout(timer); }
  }
  receive(samples,generation) {
    if (generation === this.generation && this.active) this.onSamples(samples,this.context.sampleRate);
  }
  async stop() {
    this.generation++; this.active = false;
    this.stream?.getTracks().forEach(track=>{track.onended=null;track.stop();}); this.stream=null;
    for (const name of ['source','processor','silent']) {
      if (this[name]) { this[name].disconnect(); this[name]=null; }
    }
    const context=this.context; this.context=null;
    if (context && context.state !== 'closed') await context.close();
  }
}
