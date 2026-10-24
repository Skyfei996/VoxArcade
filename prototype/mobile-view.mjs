const $=id=>document.getElementById(id);
function drawer(open){
  $('flowPanel').hidden=!open;$('flowBackdrop').hidden=!open;$('openFlow').setAttribute('aria-expanded',String(open));
  if(open){$('closeFlow').focus();}else $('openFlow').focus({preventScroll:true});
}
export const view={
  name:'mobile',motion:120,drop:230,gravity:90,
  init(){
    for(const [id,text] of [['helpButton','玩法帮助'],['voiceButton','语音操控 · 设计中']]){
      const button=$(id);button.textContent=text;button.className='secondary-button full-width';button.style.display='inline-flex';button.style.marginTop='10px';$('settingsDialog').append(button);
    }
    $('openFlow').onclick=()=>drawer($('flowPanel').hidden);
    $('closeFlow').onclick=()=>drawer(false);$('flowBackdrop').onclick=()=>drawer(false);
    $('openLevels').onclick=()=>$('levelDialog').showModal();
    $('levelsList').addEventListener('click',event=>{if(event.target.closest('[data-level]'))$('levelDialog').close();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('flowPanel').hidden)drawer(false);});
  },
  render(game,plan){
    $('openLevels').hidden=game.mode!=='puzzle';
    $('openFlow').firstChild.textContent=game.mode==='shuhang'?'整层方案 ':'流程 ';
    $('flowSummary').textContent=plan.length?`· ${plan.length} ${game.mode==='shuhang'?'块':'步'}`:'';
    document.querySelector('.drawer-heading h2').textContent=game.mode==='shuhang'?'整层方案':'编辑流程';
    $('openFlow').disabled=!!game.flow;
  },
  beforeRun(){drawer(false);},
};
