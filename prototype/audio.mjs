export const clearVolume=lines=>.09+.045*Math.min(4,Math.max(1,lines));
// frequency, duration, volume, delay, waveform, end frequency
export const SOUNDS={
  click:{priority:0,notes:[[280,.035,.04,0,'triangle']]},
  select:{priority:0,notes:[[880,.07,.065,0,'sine']]},
  left:{priority:1,notes:[[420,.09,.075,0,'triangle',300]]},
  right:{priority:1,notes:[[300,.09,.075,0,'triangle',420]]},
  down:{priority:1,notes:[[220,.11,.08,0,'triangle',140]]},
  clockwise:{priority:1,notes:[[460,.09,.07,0,'sine'],[690,.10,.07,.06,'sine']]},
  counterclockwise:{priority:1,notes:[[690,.09,.07,0,'sine'],[460,.10,.07,.06,'sine']]},
  blocked:{priority:2,notes:[[95,.09,.07,0,'square',65]]},
  rotationBlocked:{priority:2,notes:[[160,.06,.05,0,'sawtooth'],[110,.08,.05,.09,'sawtooth']]},
  drop:{priority:1,notes:[[750,.22,.055,0,'sawtooth',100]]},
  land:{priority:3,notes:[[90,.12,.15,0,'triangle',45],[55,.10,.09,.01,'sine']]},
  lock:{priority:3,notes:[[350,.06,.07,0,'triangle'],[440,.07,.05,.04,'triangle']]},
  pause:{priority:2,notes:[[440,.08,.06,0,'sine'],[330,.10,.06,.08,'sine']]},
  resume:{priority:2,notes:[[330,.08,.06,0,'sine'],[440,.10,.06,.08,'sine']]},
  invalid:{priority:2,notes:[[180,.07,.06,0,'triangle'],[180,.07,.06,.10,'triangle']]},
  won:{priority:5,notes:[[523,.12,.13,0,'sine'],[659,.12,.13,.13,'sine'],[784,.14,.13,.26,'sine'],[1047,.32,.13,.40,'sine'],[1319,.30,.065,.40,'sine']]},
  lost:{priority:5,notes:[[311,.17,.13,0,'triangle'],[233,.17,.13,.16,'triangle'],[175,.20,.13,.32,'triangle'],[117,.32,.13,.50,'triangle']]},
};
export function commandSound(command,result){
  if(!result.ok)return 'invalid';
  if(result.skipped||result.reason==='sideBlocked')return command.id.startsWith('ROTATE')?'rotationBlocked':'blocked';
  return {MOVE_LEFT:'left',MOVE_RIGHT:'right',MOVE_DOWN:'down',ROTATE_CW:'clockwise',ROTATE_CCW:'counterclockwise',HARD_DROP:'drop'}[command.id]??null;
}
export class GameAudio{
  constructor(){
    this.settings={music:false,effects:true};this.context=null;this.master=null;this.notes=new Set();this.timer=null;this.beat=0;this.priority=0;this.effectUntil=0;this.wantsMusic=false;
    try{const saved=JSON.parse(localStorage.getItem('vox-audio')||'{}');for(const key of ['music','effects'])if(typeof saved[key]==='boolean')this.settings[key]=saved[key];}catch{}
  }
  unlock(){
    const Context=globalThis.AudioContext??globalThis.webkitAudioContext;
    if(!Context)return;
    this.context??=new Context();
    if(this.context.state==='suspended')this.context.resume().then(()=>this.music(this.wantsMusic)).catch(()=>{});
  }
  tone(frequency,duration,volume,delay=0,group='effects',type='sine',endFrequency){
    const context=this.context;if(!context||context.state!=='running')return;
    const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime+delay;
    oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,start);
    if(endFrequency)oscillator.frequency.exponentialRampToValueAtTime(endFrequency,start+duration);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    if(!this.master){
      this.master=context.createGain();this.master.gain.value=2;
      const limiter=context.createDynamicsCompressor();limiter.threshold.value=-1;limiter.knee.value=0;limiter.ratio.value=20;limiter.attack.value=.002;limiter.release.value=.08;
      this.master.connect(limiter);limiter.connect(context.destination);
    }
    oscillator.connect(gain);gain.connect(this.master);
    const note={oscillator,gain,group};this.notes.add(note);
    oscillator.onended=()=>{this.notes.delete(note);oscillator.disconnect();gain.disconnect();};
    oscillator.start(start);oscillator.stop(start+duration+.02);
  }
  stop(group){for(const note of this.notes)if(!group||note.group===group){note.gain.gain.cancelScheduledValues(this.context.currentTime);note.gain.gain.setValueAtTime(0,this.context.currentTime);note.oscillator.stop();}}
  effect(name,lines=1){
    if(!this.settings.effects||document.hidden)return;
    const sound=name==='clear'?{priority:4,notes:[784,1047,1319,1568].slice(0,lines).map((frequency,index)=>[frequency,.14,clearVolume(lines),index*.09,'sine'])}:SOUNDS[name];
    if(!sound)return;
    const now=this.context?.currentTime??0;if(now<this.effectUntil&&sound.priority<this.priority)return;
    this.stop('effects');this.priority=sound.priority;this.effectUntil=now+Math.max(...sound.notes.map(note=>note[1]+note[3]));
    for(const [frequency,duration,volume,delay,type,endFrequency] of sound.notes)this.tone(frequency,duration,volume,delay,'effects',type,endFrequency);
  }
  music(playing){
    this.wantsMusic=playing;
    if(!playing||!this.settings.music||document.hidden){if(this.timer)clearInterval(this.timer);this.timer=null;this.stop('music');return;}
    if(this.timer||!this.context||this.context.state!=='running')return;
    const melody=[262,330,392,330,294,349,440,349,262,330,392,523,440,392,330,294];
    const play=()=>{this.tone(melody[this.beat++%melody.length],.32,.035,0,'music','triangle');};
    play();this.timer=setInterval(play,420);
  }
  set(key,value){this.settings[key]=value;try{localStorage.setItem('vox-audio',JSON.stringify(this.settings));}catch{}if(!value)this.stop(key==='music'?'music':'effects');}
  pause(){this.music(false);this.stop('effects');this.effectUntil=0;this.priority=0;}
}
