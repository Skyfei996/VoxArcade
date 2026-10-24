import {SHAPES,COLORS,LEVELS,COMMANDS,copy,createGame,dispatch,advance,cells,landingPiece,rotationTrace,inventory,startFlow,stepFlow,pauseFlow,resumeFlow,classicAction,classicLevel,CLASSIC_SPEEDS,undoLastPiece,startBatch,stepBatch,BATCH_SIZES,useTool,toolName,isTool,shapeMatrix,TOOL_REWARD_SCORE,TOOL_CAPACITY} from './engine.mjs?v=queued-land-20261024';
import {GameAudio,commandSound} from './audio.mjs?v=queued-land-20261024';
import {sizeBoard,drawGrid} from './board-view.mjs';
const {view}=await import(document.body.dataset.view==='mobile'?'./mobile-view.mjs':'./desktop-view.mjs');
const audio=new GameAudio();
const $=id=>document.getElementById(id);
const icon=id=>`<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;
const recordKey='vox-prototype-v2-completed';
let completed=new Set();
try{const saved=JSON.parse(localStorage.getItem(recordKey)||'[]');if(Array.isArray(saved))completed=new Set(saved.filter(n=>Number.isInteger(n)&&n>=0&&n<LEVELS.length));}catch{}
let game=createGame({levelIndex:0});
const ui={plan:[],wait:0,gravityTime:0,animation:null,step:null,quantity:1,lastFallMode:'manual',lastSpeed:1,previewPiece:null,classicStartLevel:1,autoLevel:true,batchDifficulty:'easy',batchDrafts:[],batchSelected:null,batchLayer:null,dropOnly:false};
let ruleToastTimer;
const running=()=>game.flow?.status==='running';
function miniature(type){
  if(isTool(type))return `<span class="tool-glyph ${type==='PHASE'?'phase-glyph':'bomb-glyph'}" aria-hidden="true">${type==='PHASE'?'◇':'●'}</span>`;
  const matrix=SHAPES[type];if(!matrix)return '<span class="muted">—</span>';
  const rows=matrix.filter(row=>row.some(Boolean));
  return `<span class="mini-piece" style="grid-template-columns:repeat(${rows[0].length},7px);--piece-color:${COLORS[type]}" aria-hidden="true">${rows.flatMap(row=>row.map(v=>`<i class="${v?'':'empty'}"></i>`)).join('')}</span>`;
}
function notify(message,error=false){
  $('feedbackText').textContent=message;$('feedback').classList.toggle('error',error);
  if(error){showRuleToast(message);if(!['won','lost'].includes(game.status))audio.effect('invalid');}
}
function showRuleToast(message){
  const toast=$('ruleToast');toast.textContent=message;toast.hidden=false;
  clearTimeout(ruleToastTimer);ruleToastTimer=setTimeout(()=>toast.hidden=true,2600);
}
function closeRotationPreview(){
  ui.previewPiece=null;
  $('rotationPreviewMenu').hidden=true;
  $('rotationPreviewButton').setAttribute('aria-expanded','false');
  $('rotationPreviewMenu').querySelectorAll('[data-preview]').forEach(button=>button.setAttribute('aria-pressed','false'));
  if(game.mode==='classic')renderResult();
}
function label(command){
  if(command.id==='SELECT_PIECE')return `选择 ${command.params.type} 方块`;
  if(command.id==='HOLD')return '暂存 / 交换';
  const item=COMMANDS.find(c=>c.id===command.id);
  return item?`${item.label}${item.parameter?` ${command.params?.cells??1} 格`:''}`:'未知指令';
}
function stopTimer(){ui.wait=0;ui.gravityTime=0;}
function pause(){if(game.mode==='classic')game.status='paused';else pauseFlow(game);audio.pause();audio.effect('pause');notify(game.mode==='classic'?'游戏已暂停，点击继续。':'流程已暂停。点击继续运行，从当前进度恢复。');render();}
function loadGame(options={}){
  stopTimer();ui.plan=[];ui.batchDrafts=[];ui.batchSelected=null;ui.batchLayer=null;ui.animation=null;ui.step=null;audio.pause();
  closeRotationPreview();
  clearTimeout(ruleToastTimer);$('ruleToast').hidden=true;
  game=createGame({mode:options.mode??game.mode,levelIndex:options.levelIndex??game.levelIndex,fallMode:ui.lastFallMode,speed:ui.lastSpeed,startLevel:ui.classicStartLevel,autoLevel:ui.autoLevel,difficulty:ui.batchDifficulty});
  notify(game.mode==='shuhang'?game.message:game.mode==='classic'?'点击操作立即生效，方块会持续下落。':'先编排，再运行。流程结束会固定当前方块，悬空也保留。');render();
}
function append(command){
  if(game.mode==='shuhang'){
    if(game.flow||ui.animation||game.status==='lost')return;
    const draft=ui.batchDrafts.find(item=>item.pieceId===ui.batchSelected);
    if(!draft){notify('先在候选区选择要安排的方块。',true);return;}
    if(!['MOVE_LEFT','MOVE_RIGHT','ROTATE_CW','ROTATE_CCW','LAND','HARD_DROP'].includes(command.id))return;
    if(draft.steps.some(step=>step.id==='HARD_DROP')){notify('本块已安排落地并提交；如需继续调整，请先在方案里移除该步骤。',true);return;}
    if(draft.steps.length>=59){notify('每块最多安排 59 步。',true);return;}
    draft.steps.push(copy(command));ui.quantity=1;$('quantity').value='1';
    notify(`已安排：${label(command)}。棋盘不会预演结果。`);render();return;
  }

  if(game.mode==='classic'){
    if(ui.animation)return;
    closeRotationPreview();const next=copy(game);next.transition=null;
    const result=classicAction(next,{...command,params:{cells:1}});
    if(!result.ok){notify(result.message,true);return;}
    audio.unlock();audio.music(true);const sound=commandSound(command,result);if(sound)audio.effect(sound);
    notify(result.message);if(next.transition||command.id==='LAND')beginAnimation(next,next.transition?.piece??next.active,view.drop);else{game=next;render();}return;
  }

  if(game.flow){notify('本轮流程尚未完成，请先继续运行。',true);return;}
  if(['won','lost'].includes(game.status)){notify('请先重开或进入下一关。',true);return;}
  closeRotationPreview();
  if(command.id==='SELECT_PIECE'){
    if(game.active){notify('本轮已给出当前方块。',true);return;}
    const existing=ui.plan.findIndex(step=>step.id==='SELECT_PIECE');
    if(existing>=0)ui.plan[existing]=command;else ui.plan.unshift(command);
  }else{
    if(['LAND','HARD_DROP'].includes(command.id)&&!game.active&&!ui.plan.some(step=>step.id==='SELECT_PIECE')){notify('请先选择一个形状。',true);return;}
    if(ui.plan.length>=60){notify('一轮流程最多 60 步。',true);return;}
    ui.plan.push(command);
  }
  if(command.id!=='SELECT_PIECE'){ui.quantity=1;$('quantity').value='1';}
  audio.unlock();audio.effect(command.id==='SELECT_PIECE'?'select':'click');
  notify(`已加入：${label(command)}。运行前不展示流程结果。`);render();$('planList').scrollTop=$('planList').scrollHeight;
  if(command.id==='HARD_DROP')runPlan();
}
function draftPiece(){
  if(game.mode==='shuhang'&&(game.flow||ui.animation||game.status==='lost'))return null;
  const type=game.mode==='shuhang'?game.pool.find(piece=>piece.id===ui.batchSelected&&!piece.used)?.type:ui.plan.find(step=>step.id==='SELECT_PIECE')?.params.type;
  return !game.active&&type?{type,matrix:shapeMatrix(type),x:Math.floor((game.width-shapeMatrix(type).length)/2),y:0}:null;
}
function settleUI(){
  stopTimer();ui.plan=[];
  notify(['classic','shuhang'].includes(game.mode)?game.message:game.lastFlow?.message??game.message,game.status==='lost');
  audio.music(game.mode==='classic'&&game.status==='playing');
  if(['won','lost'].includes(game.status))audio.effect(game.status);
  render();
}
function executeNext(){
  if(!running()||ui.animation)return;
  const command=game.flow.steps[game.flow.cursor],next=copy(game);next.transition=null;
  const result=game.mode==='shuhang'?stepBatch(next):stepFlow(next),target=next.transition?.piece??next.active;
  ui.step={text:`${game.mode==='shuhang'?`第 ${game.batch.cursor+1} 块 · `:''}第 ${game.flow.cursor+1} 步 · ${label(command)}${result.skipped?'（受阻，跳过）':''}`,piece:target??game.active,remaining:900};
  notify(`第 ${game.flow.cursor+1} 步：${result.message}`,!result.ok);
  const sound=commandSound(command,result);if(sound)audio.effect(sound);
  beginAnimation(next,target,['LAND','HARD_DROP'].includes(command.id)?view.drop:view.motion);
}
function beginAnimation(next,target,duration){
  const from=game.active??draftPiece();
  const arrivalSound=next.transition?.kind==='explosion'?'explosion':next.transition?next.mode==='classic'||['hardDrop','downBlocked','sideBlocked','gravity'].includes(next.lastFlow?.reason)?'land':'lock':null;
  ui.animation={next,from,target,elapsed:0,motion:duration,rows:next.transition?.rows??[],explosion:next.transition?.kind==='explosion',clearPlayed:false,arrivalPlayed:false,arrivalSound};
  render();
}
function animate(milliseconds){
  const animation=ui.animation;animation.elapsed+=milliseconds;
  if(animation.elapsed>=animation.motion&&!animation.arrivalPlayed){animation.arrivalPlayed=true;if(animation.arrivalSound)audio.effect(animation.arrivalSound);}
  if(animation.rows.length&&animation.elapsed>=animation.motion+70&&!animation.clearPlayed){animation.clearPlayed=true;audio.effect('clear',animation.rows.length);}
  if(animation.elapsed<animation.motion+(animation.explosion?480:animation.rows.length?660:0))return;
  game=animation.next;ui.animation=null;
  if(!game.flow)settleUI();else render();
}
function runPlan(){
  if(running())return;
  if(game.mode==='classic'){if(game.placementOpen)append({id:'SUBMIT_PIECE'});return;}
  if(game.mode==='shuhang'){
    if(ui.animation)return;
    if(game.flow)resumeFlow(game);
    else{const result=startBatch(game,ui.batchDrafts);if(!result.ok){notify(result.message,true);return;}notify(result.message);}
    audio.unlock();if(game.status==='lost'){settleUI();return;}audio.music(true);view.beforeRun();render();return;
  }

  closeRotationPreview();
  if(game.flow){resumeFlow(game);audio.effect('resume');}
  else{
    if(!game.active&&!ui.plan.some(step=>step.id==='SELECT_PIECE')){notify('请先选择一个形状。',true);return;}
    if(game.placementOpen&&!ui.plan.length)ui.plan=[{id:'SUBMIT_PIECE'}];
    const result=startFlow(game,ui.plan);
    if(!result.ok){notify(result.message,true);return;}
  }
  audio.unlock();audio.music(true);
  view.beforeRun();notify('流程运行中。');
  render();
}
function showDialog(id){
  if(running()||game.mode==='classic'&&game.status==='playing')pause();
  if(id==='settingsDialog'){
    $('musicToggle').checked=audio.settings.music;$('effectsToggle').checked=audio.settings.effects;
    $('gravityToggle').checked=game.fallMode==='automatic';
    $('gravityToggle').disabled=game.mode!=='endless'||!!game.flow;
    $('speedInput').value=game.speed;updateSpeedControls();
    $('gravityDescription').textContent=game.mode==='shuhang'?'舒航模式每块执行完左右移动与旋转后，自动落到底部。':game.mode==='classic'?'常规模式持续自动下落，九级速度在棋盘上方设置。':game.mode==='puzzle'?'本关固定手动下落。':game.flow?'本轮完成后才可修改。':'仅在流程运行期间下落；编排时冻结。';
  }
  $(id).showModal();
}
function updateSpeedControls(){
  const enabled=$('gravityToggle').checked&&game.mode==='endless'&&!game.flow;
  $('speedInput').disabled=!enabled;$('speedValue').textContent=`${Number($('speedInput').value)} 格 / 秒`;
  document.querySelectorAll('[data-speed]').forEach(button=>{button.disabled=!enabled;button.classList.toggle('active',Number(button.dataset.speed)===Number($('speedInput').value));});
}
function renderLevels(){
  $('levelsList').innerHTML=['简单','中等','困难','特困难'].map(difficulty=>`<h3 class="level-group">${difficulty}</h3>${LEVELS.map((level,index)=>({level,index})).filter(({level})=>level.difficulty===difficulty).map(({level,index})=>`<button class="level-button ${index===game.levelIndex?'active':''} ${completed.has(index)?'done':''}" data-level="${index}" aria-label="第${index+1}关 ${level.title} ${difficulty}" aria-current="${index===game.levelIndex?'step':'false'}"><span>${String(index+1).padStart(2,'0')}</span><b>${level.title}</b><small>${difficulty}</small>${completed.has(index)?icon('check'):index===game.levelIndex?icon('arrow'):''}</button>`).join('')}`).join('');
  const level=LEVELS[game.levelIndex],total=String(LEVELS.length).padStart(2,'0');
  $('levelTitle').textContent=level.title;$('levelGoal').textContent='用完方块，清空棋盘';$('levelGoal').title=level.goal;
  $('levelTags').innerHTML=level.tags.map(tag=>`<span>${tag}</span>`).join('');
  $('missionIndex').textContent=`${String(game.levelIndex+1).padStart(2,'0')} / ${total}`;
  $('completedCount').textContent=`${completed.size} / ${LEVELS.length}`;
}
function renderTools(){
  $('toolShelf').hidden=!game.tools;
  if(!game.tools)return;
  for(const type of ['PHASE','BOMB']){
    const button=$('tool'+type);button.querySelector('.tool-count').textContent=`×${game.tools[type]}`;
    button.setAttribute('aria-label',`${toolName(type)}，剩余 ${game.tools[type]} 个，点击立即替换当前方块`);
    button.disabled=game.tools[type]<1||!!game.flow||!!game.batch||!!ui.animation||tourActive||['won','lost'].includes(game.status)||game.mode==='shuhang'&&!ui.batchSelected;
  }
  const remaining=TOOL_REWARD_SCORE-game.score%TOOL_REWARD_SCORE;
  $('toolProgress').textContent=game.tools.pending?`待领 ${game.tools.pending} 个`:`再得 ${remaining} 分`;
  $('toolProgress').title=`每 ${TOOL_REWARD_SCORE} 分交替获得道具，最多存 ${TOOL_CAPACITY} 个；满额奖励保留。点击立即扣除并替换当前方块。`;
}
function activateTool(type){
  if(ui.animation||tourActive)return;
  const next=copy(game),result=useTool(next,type,ui.batchSelected);
  if(!result.ok){notify(result.message,true);return;}
  closeRotationPreview();ui.plan=[];ui.step=null;stopTimer();
  if(game.mode==='shuhang'){
    const draft=ui.batchDrafts.find(item=>item.pieceId===ui.batchSelected);if(draft)draft.steps=[];
  }
  audio.unlock();audio.effect('select');notify(result.message);
  if(next.transition)beginAnimation(next,next.transition.piece,view.motion);else{game=next;render();}
}
function renderPieces(){
  if(game.mode==='shuhang'){
    document.querySelector('.piece-bar').hidden=false;
    $('poolLabel').textContent='本层候选';
    $('pieceRack').innerHTML=game.pool.map((piece,index)=>{const order=ui.batchDrafts.findIndex(item=>item.pieceId===piece.id);return `<button class="piece-chip ${ui.batchSelected===piece.id?'draft-selected':''} ${piece.used?'used':''}" data-batch-piece="${piece.id}" aria-label="候选 ${index+1}：${toolName(piece.type)}${order>=0?`，第 ${order+1} 个执行`:''}" ${game.flow||ui.animation||game.status==='lost'?'disabled':''}>${miniature(piece.type)}<b>${order<0?'待选':`第${order+1}块`}</b></button>`;}).join('');
    $('pieceRemaining').textContent=`已选 ${ui.batchDrafts.length}/${game.pool.length}`;
    $('orderNote').hidden=true;$('nextPieces').innerHTML='';$('heldPiece').innerHTML='';return;
  }
  const level=LEVELS[game.levelIndex],draftType=ui.plan.find(command=>command.id==='SELECT_PIECE')?.params.type;
  document.querySelector('.piece-bar').hidden=!['puzzle','shuhang'].includes(game.mode);
  $('poolLabel').textContent=game.mode==='puzzle'?`剩余库存 · ${level.free?'自由排序':'固定顺序'}`:'当前方块';
  if(game.mode==='puzzle'){
    $('pieceRack').innerHTML=level.free?inventory(game).sort((a,b)=>Number(b.type===(game.active?.type??draftType))-Number(a.type===(game.active?.type??draftType))).map(({type,count})=>`<button class="piece-chip ${count?'':'used'} ${draftType===type?'draft-selected':''} ${game.active?.type===type?'current':''}" data-shape="${type}" aria-label="${type} 方块，剩余 ${count} 个" ${!count||!!game.active||!!game.flow?'disabled':''}>${miniature(type)}<b>×${count}</b></button>`).join(''):
      game.pool.map((piece,index)=>({...piece,order:index+1})).filter(piece=>!piece.used).map((piece,index)=>`<button class="piece-chip queue-chip ${index===0?'current':''}" data-fixed="true" aria-label="第 ${piece.order} 块：${piece.type}，固定顺序">${miniature(piece.type)}<b>${piece.order}</b></button>`).join('');
    $('pieceRemaining').textContent=`未用 ${game.pool.filter(p=>!p.used).length}`;
  }else{
    $('pieceRack').innerHTML=`<span class="piece-chip current">${miniature(game.active?.type??'T')}</span>`;
    $('pieceRemaining').textContent=game.fallMode==='automatic'?`${game.speed} 格 / 秒`:'手动';
  }
  $('orderNote').hidden=true;
  $('nextPieces').innerHTML=`${game.active?`<div class="queue-item current" aria-label="当前方块 ${toolName(game.active.type)}"><small>当前</small>${miniature(game.active.type)}</div>`:''}${game.queue.slice(0,4).map((type,index)=>`<div class="queue-item" aria-label="后续第 ${index+1} 块 ${type}">${miniature(type)}</div>`).join('')}`;$('heldPiece').innerHTML=game.held?miniature(game.held):'<span>—</span>';
}
function renderBatchPlan(){
  const locked=!!game.flow||!!ui.animation||game.status==='lost';
  $('flowCount').textContent=ui.batchDrafts.length;
  $('flowEmpty').hidden=ui.batchDrafts.length>0;
  $('flowEmpty').textContent='逐个选择本层候选方块，安排左右移动和旋转。未加动作表示按初始方向直接落地。';
  $('planList').innerHTML=ui.batchDrafts.map((item,index)=>{
    const piece=game.pool.find(p=>p.id===item.pieceId);
    return `<li class="batch-plan ${item.pieceId===ui.batchSelected?'selected':''}"><div class="batch-plan-header"><button data-batch-edit="${item.pieceId}" ${locked?'disabled':''}>${miniature(piece.type)}<b>第 ${index+1} 块 · ${piece.type}</b></button><button class="step-action" data-batch-up="${index}" aria-label="提前第${index+1}块" ${locked||!index?'disabled':''}>↑</button><button class="step-action" data-batch-remove="${index}" aria-label="取消第${index+1}块的安排" ${locked?'disabled':''}>×</button></div>${item.steps.length?`<ol class="batch-actions">${item.steps.map((step,n)=>`<li>${label(step)} <button data-batch-step="${index}:${n}" aria-label="删除第${index+1}块第${n+1}步" ${locked?'disabled':''}>×</button></li>`).join('')}</ol>`:'<p class="batch-empty">未加动作，保持初始方向</p>'}<p class="batch-auto">⇓ 动作执行后自动落地</p></li>`;
  }).join('');
  $('planValidation').textContent=game.flow?`第 ${game.layer} 层 · 正在执行第 ${game.batch.cursor+1}/${game.pool.length} 块 · 整批方案已锁定`:`已安排 ${ui.batchDrafts.length}/${game.pool.length} 块 · 点击候选继续编辑，↑ 调整出场顺序`;
  $('runPlan').disabled=running()||!!ui.animation||game.status==='lost'||!game.flow&&ui.batchDrafts.length!==game.pool.length;
  $('runPlan').innerHTML=`${icon('play')}${game.flow?'继续整批执行':`整批提交（${ui.batchDrafts.length}/${game.pool.length}）`}`;
  $('stopPlan').hidden=!running();$('clearPlan').disabled=locked;
}
function renderPlan(){
  if(game.mode==='shuhang'){renderBatchPlan();return;}
  $('flowEmpty').textContent='点击按钮，添加步骤';
  const cursor=game.flow?.cursor??0,locked=!!game.flow;
  $('flowCount').textContent=ui.plan.length;$('flowEmpty').hidden=ui.plan.length>0;
  $('planList').innerHTML=ui.plan.map((command,index)=>`<li class="plan-step ${command.id==='SELECT_PIECE'?'select-step':''} ${index<cursor?'executed':''} ${running()&&index===cursor?'current':''}"><span class="step-index">${index<cursor?'✓':String(index+1).padStart(2,'0')}</span><span class="step-label">${label(command)}</span><button class="step-action" data-up="${index}" aria-label="上移第${index+1}步" ${locked||index===0?'disabled':''}>↑</button><button class="step-action" data-remove="${index}" aria-label="移除第${index+1}步" ${locked?'disabled':''}>×</button></li>`).join('');
  $('planValidation').textContent=running()?`运行 ${cursor} / ${ui.plan.length} · 碰撞在执行时判断`:game.flow?'已暂停 · 继续后不会重放已执行步骤':game.placementOpen?'已落地未提交 · 可以运行调整步骤，调整完毕后提交当前方块':ui.plan.length?`共 ${ui.plan.length} 步 · 运行前不展示效果或判断碰撞`:'编排一块的动作，运行结束后固定当前位置。';
  $('runPlan').disabled=running()||(!ui.plan.length&&!game.flow&&!game.placementOpen)||['won','lost'].includes(game.status);
  $('runPlan').innerHTML=`${icon('play')}${game.flow?'继续运行':game.placementOpen?(ui.plan.length?'运行调整步骤':'提交当前方块'):'结束并运行流程'}`;
  $('stopPlan').hidden=!running();$('clearPlan').disabled=locked;
}
function renderResult(){
  const paused=game.flow?.status==='paused'||game.mode==='classic'&&game.status==='paused',ended=['won','lost'].includes(game.status),won=game.status==='won';
  $('resultOverlay').hidden=!paused&&!ended;if(!paused&&!ended)return;
  $('resultIcon').textContent=paused?'Ⅱ':won?'✓':'↻';$('resultEyebrow').textContent=paused?'TAKE YOUR TIME':won?'WELL PLAYED':'ANOTHER WAY AWAITS';
  $('resultTitle').textContent=paused?(game.mode==='classic'?'游戏已暂停':'流程已暂停'):won?'全部消除！':'换个方案，再试一次。';
  $('resultDescription').textContent=paused?(game.mode==='classic'?(game.placementOpen?'继续后仍可调整当前方块，确认位置后提交。':'继续后恢复自动下落，也可以撤回上一块。'):'已执行步骤保留，继续后从下一步运行。'):won?`全部 ${game.pool.length} 块已使用，${game.moves} 次动作，消除 ${game.lines} 行。`:game.message;
  $('resultPrimary').innerHTML=paused?`${icon('play')}${game.mode==='classic'?'继续游戏':'继续运行'}`:won&&game.mode==='puzzle'&&game.levelIndex<LEVELS.length-1?`下一关 ${icon('arrow')}`:won?'重新挑战':'重新开始';
  $('resultSecondary').textContent=paused?'重开本局':won?'再试一次':'重新安排步骤';
  if(game.mode==='shuhang'){
    if(!paused){$('resultTitle').textContent=`止步第 ${game.layer} 层`;$('resultDescription').textContent=`已通过 ${game.clearedLayers} 层 · ${game.score} 分 · 消除 ${game.lines} 行。${game.message}`;$('resultSecondary').textContent='重新挑战';}
    else $('resultDescription').textContent='整批方案保持锁定，继续后从当前块的下一步执行。';
  }
}
function render(){
  if(game.status==='won'&&game.mode==='puzzle'&&!completed.has(game.levelIndex)){
    completed.add(game.levelIndex);try{localStorage.setItem(recordKey,JSON.stringify([...completed]));}catch{}
  }
  if(game.mode==='shuhang'&&ui.batchLayer!==game.layer){ui.batchLayer=game.layer;ui.batchDrafts=[];ui.batchSelected=null;}
  document.body.dataset.mode=game.mode;document.body.dataset.composing='true';document.body.dataset.running=String(running());
  $('puzzleMode').classList.toggle('active',game.mode==='puzzle');$('endlessMode').classList.toggle('active',game.mode==='endless');
  $('puzzleMode').setAttribute('aria-pressed',String(game.mode==='puzzle'));$('endlessMode').setAttribute('aria-pressed',String(game.mode==='endless'));
  for(const selector of ['.mission-copy','.level-section','.thinking-note'])document.querySelector(selector).hidden=game.mode!=='puzzle';
  $('shuhangMode').classList.toggle('active',game.mode==='shuhang');$('shuhangMode').setAttribute('aria-pressed',String(game.mode==='shuhang'));
  $('batchControls').hidden=game.mode!=='shuhang';$('batchDifficulty').value=game.difficulty;$('batchDifficulty').disabled=!!game.flow||!!ui.animation;
  $('layerStatus').textContent=`第 ${game.layer} 层`;$('layerStatus').setAttribute('aria-label',`第 ${game.layer} 层，已通过 ${game.clearedLayers} 层`);
  $('undoButton').hidden=game.mode==='shuhang';
  $('classicMode').classList.toggle('active',game.mode==='classic');$('classicMode').setAttribute('aria-pressed',String(game.mode==='classic'));
  $('classicControls').hidden=game.mode!=='classic';$('classicLevel').value=String(game.startLevel);$('autoLevel').checked=game.autoLevel;
  $('classicSpeed').textContent=`当前 ${classicLevel(game)} 级`;
  $('classicLevel').disabled=!!ui.animation;$('autoLevel').disabled=!!ui.animation;
  $('scoreValue').textContent=game.score;
  const flowHeading=document.querySelector('.flow-mode-heading');if(flowHeading)flowHeading.firstChild.textContent=game.mode==='shuhang'?'整层方案 ':'流程编排 ';
  document.querySelector('#flowPanel .section-caption span').textContent=game.mode==='shuhang'?'本层执行顺序':'我的指令流程';
  $('undoButton').disabled=!game.undo||!!game.flow||!!ui.animation;
  document.querySelectorAll('.control-heading h2').forEach(el=>el.textContent=game.mode==='shuhang'?'规划这一层':game.mode==='classic'?'即时操作':'编排你的下一步');
  $('endlessNote').hidden=['puzzle','shuhang'].includes(game.mode);
  $('fallSummaryText').textContent=game.mode==='shuhang'?'整批规划 · 自动落地':game.fallMode==='automatic'?`自动 · ${game.speed} 格/秒`:'手动下落';
  $('holdButton').hidden=true;
  $('commandHint').textContent=game.mode==='shuhang'?(game.flow?'整批执行中，方案锁定':ui.batchSelected?`为当前选中块添加动作`:'先选择候选方块'):game.mode==='classic'?'点击立即操作 · 自动下落':running()?'正在执行，不能插入动作':'点击按钮，只添加步骤';
  const shownPiece=game.active??draftPiece();
  renderTools();
  $('boardStatus').textContent=game.mode==='shuhang'?`第 ${game.layer} 层 · ${game.status==='lost'?'本局结束':game.flow?`执行第 ${game.batch.cursor+1}/${game.pool.length} 块`:'整批规划中'}`:game.mode==='classic'?`常规模式 · ${game.status==='playing'?'进行中':game.status==='paused'?'已暂停':'已结束'}`:running()?`运行中 · 第 ${(game.flow?.cursor??0)+1} 步`:game.status==='won'?'关卡完成':game.status==='lost'?'本次结束':game.flow?'流程暂停':shownPiece?`待编排 · ${shownPiece.type} 方块`:'待编排 · 先选一个形状';
  $('pauseButton').hidden=game.mode!=='classic';$('pauseButton').disabled=['won','lost'].includes(game.status);$('pauseButton').innerHTML=icon(game.status==='paused'?'play':'pause');
  $('pauseButton').setAttribute('aria-label',game.status==='paused'?'继续游戏':'暂停游戏');
  $('scoreLabel').textContent='当前得分';
  $('linesStat').innerHTML=`${game.score}<small> 分</small>`;
  $('movesStat').innerHTML=`${game.moves}<small> 步</small>`;$('thirdLabel').textContent=game.mode!=='puzzle'?'已消行数':'已用方块';
  $('mobileStats').textContent=`消除 ${game.lines} 行 · ${game.moves} 步`;
  $('thirdStat').innerHTML=game.mode!=='puzzle'?`${game.lines}<small> 行</small>`:`${game.pool.filter(p=>p.used).length}<small> / ${game.pool.length}</small>`;
  $('boardHint').hidden=true;
  $('boardHint').textContent=game.mode==='shuhang'?'选完全部方块后整批提交':'先选形状，再编排。';
  $('boardNote').textContent='流程结束即固定，悬空也会成为下一块的障碍。';
  $('executionToast').hidden=!running();$('executionProgress').textContent=running()?`正在执行 ${game.flow.cursor} / ${ui.plan.length} 步`:'';
  document.querySelectorAll('[data-command]').forEach(button=>{
    button.disabled=button.dataset.command.startsWith('ROTATE')&&isTool(shownPiece?.type)||!!game.flow||!!ui.animation||['won','lost'].includes(game.status)||game.mode==='classic'&&game.status!=='playing'||game.mode==='shuhang'&&!ui.batchSelected;
    const item=COMMANDS.find(c=>c.id===button.dataset.command);button.querySelector('.command-detail').textContent=item.parameter?`${game.mode==='classic'?1:ui.quantity} 格`:item.id==='HARD_DROP'?(game.mode==='classic'?'立即落地固定':'运行并提交'):'旋转方块';
  });
  const dropButton=document.querySelector('[data-command="HARD_DROP"]');
  dropButton.querySelector('.command-label').firstChild.textContent=ui.dropOnly?'落地':'落地并提交';
  dropButton.querySelector('.command-detail').textContent=ui.dropOnly?(game.mode==='classic'?'不提交 · 长按切换':'加入流程 · 长按切换'):'长按切换为只落地';
  dropButton.setAttribute('aria-label',ui.dropOnly?'落地，不提交，长按切换':'落地并提交，长按切换');
  dropButton.title=game.mode==='classic'?'短按立即操作；长按 0.5 秒或 Shift+Enter 切换落地/落地并提交':'只落地仅加入流程，运行后执行；长按 0.5 秒或 Shift+Enter 切换落地/落地并提交';
  dropButton.classList.toggle('drop-only',ui.dropOnly);
  $('submitPlacement').hidden=game.mode!=='classic'||!game.placementOpen;
  $('submitPlacement').disabled=!!ui.animation||game.status!=='playing';
  $('rotationPreviewButton').disabled=isTool(shownPiece?.type)||!shownPiece||!!game.flow||!!ui.animation||['won','lost'].includes(game.status);
  if($('rotationPreviewButton').disabled)closeRotationPreview();
  renderLevels();renderPieces();renderPlan();renderResult();view.render(game,game.mode==='shuhang'?ui.batchDrafts:ui.plan);
  if(game.mode==='shuhang')$('executionProgress').textContent=game.flow?`第 ${game.layer} 层 · 执行第 ${game.batch.cursor+1}/${game.pool.length} 块`:'';
  draw();
}
const canvas=$('board'),ctx=canvas.getContext('2d');
const axes=[...document.querySelectorAll('[data-axis]')];
function drawCoordinates(){
  if(!axes.length)return;
  const rect=canvas.getBoundingClientRect(),stage=$('boardStage').getBoundingClientRect();
  for(const axis of axes){
    const horizontal=axis.dataset.axis==='top'||axis.dataset.axis==='bottom',count=horizontal?game.width:game.height;
    if(axis.dataset.count!==String(count)){
      axis.replaceChildren(...Array.from({length:count},(_,index)=>{const mark=document.createElement('span');mark.textContent=String(index+1);return mark;}));
      axis.dataset.count=String(count);
    }
    axis.style.left=`${rect.left-stage.left+(axis.dataset.axis==='left'?-14:axis.dataset.axis==='right'?rect.width+3:0)}px`;
    axis.style.top=`${rect.top-stage.top+(axis.dataset.axis==='top'?-13:axis.dataset.axis==='bottom'?rect.height+2:0)}px`;
    axis.style.width=`${horizontal?rect.width:11}px`;
    axis.style.height=`${horizontal?11:rect.height}px`;
    axis.style[horizontal?'gridTemplateColumns':'gridTemplateRows']=`repeat(${count},1fr)`;
  }
}
function tile(x,y,color){
  const unit=40,pad=2.2,side=unit-pad*2,px=x*unit+pad,py=y*unit+pad;
  ctx.beginPath();ctx.roundRect(px,py,side,side,3);
  const gradient=ctx.createLinearGradient(px,py,px,py+side);gradient.addColorStop(0,color);gradient.addColorStop(1,color+'dd');ctx.fillStyle=gradient;ctx.fill();
  ctx.strokeStyle='#ffffff38';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px+4,py+1);ctx.lineTo(px+side-4,py+1);ctx.stroke();
}
function ghostTile(x,y){
  ctx.beginPath();ctx.roundRect(x*40+4,y*40+4,32,32,3);
  ctx.fillStyle='#e8ffdb20';ctx.fill();
  ctx.strokeStyle='#d9f6caaf';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.stroke();ctx.setLineDash([]);
}
function draw(){
  const metrics=sizeBoard(canvas,$('boardStage'),game.width,game.height);
  drawGrid(ctx,game.width,game.height,metrics);
  drawCoordinates();
  const animation=ui.animation,phase=!animation?'idle':animation.elapsed<animation.motion?'move':animation.explosion?'blast':animation.rows.length&&animation.elapsed<animation.motion+480?'clear':animation.rows.length?'collapse':'move';
  canvas.dataset.phase=phase;
  const board=animation&&phase!=='move'?animation.next.transition.board:game.board;
  const progress=phase==='collapse'?Math.min(1,(animation.elapsed-animation.motion-480)/180):0;
  for(let y=0;y<game.height;y++)for(let x=0;x<game.width;x++){
    const type=board[y][x];if(!type)continue;
    if(phase==='collapse'&&animation.rows.includes(y))continue;
    const shift=phase==='collapse'?animation.rows.filter(row=>row>y).length*progress:0;
    if(phase==='blast'&&animation.next.transition.area.some(c=>c.x===x&&c.y===y))ctx.globalAlpha=Math.max(0,1-(animation.elapsed-animation.motion)/350);
    tile(x,y+shift,phase==='clear'&&animation.rows.includes(y)&&Math.floor((animation.elapsed-animation.motion)/80)%2===0?'#fff5bd':COLORS[type]);ctx.globalAlpha=1;
  }
  let piece=game.active??draftPiece();
  if(animation&&phase==='move'){
    piece=animation.target;
    if(piece&&animation.from?.id===piece.id&&animation.from?.type===piece.type){
      const progress=Math.min(1,animation.elapsed/animation.motion),eased=1-(1-progress)**2;
      piece={...piece,x:animation.from.x+(piece.x-animation.from.x)*eased,y:animation.from.y+(piece.y-animation.from.y)*eased};
    }
  }else if(animation)piece=null;
  const preview=piece&&!animation&&!game.flow?ui.previewPiece:null;
  if(piece&&!preview&&game.mode!=='shuhang'){
    const landing=landingPiece(game,animation?.target??piece);
    if(landing&&landing.y>piece.y)for(const {x,y} of cells(landing))ghostTile(x,y);
  }
  if(piece)for(const {x,y} of cells(preview??piece)){
    if(piece.type==='PHASE')ctx.globalAlpha=.45+.55*(.5+.5*Math.sin(performance.now()/130));
    tile(x,y,COLORS[piece.type]);ctx.globalAlpha=1;
    if(piece.type==='BOMB'){
      ctx.fillStyle='#352d2a';ctx.beginPath();ctx.arc(x*40+20,y*40+23,11,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#fff6c4';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x*40+22,y*40+13);ctx.quadraticCurveTo(x*40+22,y*40+4,x*40+30,y*40+8);ctx.stroke();
      ctx.fillStyle=Math.sin(performance.now()/90)>0?'#fff5ab':'#ff5c32';ctx.beginPath();ctx.arc(x*40+30,y*40+8,3,0,Math.PI*2);ctx.fill();
    }
  }
  if(phase==='blast'){
    const effect=animation.next.transition,p=(animation.elapsed-animation.motion)/480;
    ctx.save();ctx.globalAlpha=1-p;
    for(const {x,y} of effect.area){ctx.fillStyle=p<.22?'#fff7c9':'#ff9d45';ctx.fillRect(x*40+2,y*40+2,36,36);}
    const cx=(effect.piece.x+.5)*40,cy=(effect.piece.y+.5)*40;
    ctx.strokeStyle='#ffe0a2';ctx.lineWidth=5*(1-p);ctx.beginPath();ctx.arc(cx,cy,12+p*65,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<8;i++){const angle=i*Math.PI/4,d=14+p*63;ctx.fillStyle=i%2?'#ffd68c':'#ff835d';ctx.fillRect(cx+Math.cos(angle)*d-3,cy+Math.sin(angle)*d-3,6*(1-p),6*(1-p));}
    ctx.restore();
  }
  const step=$('activeStep');step.hidden=!ui.step;
  if(ui.step){
    step.textContent=ui.step.text;
    const anchor=(game.flow?piece:null)??ui.step.piece,rect=canvas.getBoundingClientRect(),stage=$('boardStage').getBoundingClientRect();
    if(anchor){
      const bounds=cells(anchor),right=(Math.max(...bounds.map(cell=>cell.x))+1)*rect.width/game.width,left=Math.min(...bounds.map(cell=>cell.x))*rect.width/game.width;
      const offset=rect.left-stage.left,top=rect.top-stage.top+Math.min(...bounds.map(cell=>cell.y))*rect.height/game.height;
      let x=offset+right+7,y=top;
      if(x+step.offsetWidth>stage.width-6){x=offset+left-step.offsetWidth-7;if(x<6){x=offset+left;y=top-step.offsetHeight-6;if(y<6)y=top+3*rect.height/game.height;}}
      step.style.left=`${Math.max(6,Math.min(stage.width-step.offsetWidth-6,x))}px`;step.style.top=`${Math.max(6,Math.min(stage.height-step.offsetHeight-6,y))}px`;
    }
  }
  canvas.setAttribute('aria-label',`${game.width}列${game.height}行棋盘，已消除${game.lines}行，${piece?`当前方块${toolName(piece.type)}`:game.mode==='shuhang'?`第${game.layer}层规划中，不预览方块`:'等待选择形状'}${preview?'，正在临时预览旋转结果':''}`);
}
const commandOrder=['MOVE_LEFT','MOVE_RIGHT','MOVE_DOWN','ROTATE_CCW','ROTATE_CW','HARD_DROP'];
$('commandGrid').innerHTML=commandOrder.map(id=>COMMANDS.find(item=>item.id===id)).map(item=>`<button class="command-button" data-command="${item.id}"><span class="command-symbol" aria-hidden="true">${item.symbol}</span><span class="command-label">${item.label}<small class="command-detail">${item.parameter?'1 格':item.id==='HARD_DROP'?'提交本轮':'旋转方块'}</small></span></button>`).join('');
const dropGesture={timer:null,longPressed:false,x:0,y:0};
const dropControl=document.querySelector('[data-command="HARD_DROP"]');
function cancelDropHold(){clearTimeout(dropGesture.timer);dropGesture.timer=null;}
function toggleDropMode(){
  if(dropControl.disabled||tourActive)return;
  ui.dropOnly=!ui.dropOnly;audio.unlock();audio.effect('click');
  showRuleToast(ui.dropOnly?'已切换：只落地，之后仍可调整并提交。':'已切换：落地并提交。');render();
}
dropControl.addEventListener('pointerdown',event=>{
  if(event.button!==0||dropControl.disabled)return;
  cancelDropHold();dropGesture.longPressed=false;dropGesture.x=event.clientX;dropGesture.y=event.clientY;
  dropGesture.timer=setTimeout(()=>{dropGesture.timer=null;dropGesture.longPressed=true;toggleDropMode();},500);
});
dropControl.addEventListener('pointermove',event=>{if(Math.hypot(event.clientX-dropGesture.x,event.clientY-dropGesture.y)>10)cancelDropHold();});
for(const event of ['pointerup','pointercancel','pointerleave'])dropControl.addEventListener(event,cancelDropHold);
dropControl.addEventListener('contextmenu',event=>event.preventDefault());
dropControl.addEventListener('keydown',event=>{
  if(event.key==='Enter'&&event.shiftKey){event.preventDefault();if(event.repeat)return;cancelDropHold();toggleDropMode();}
  else if(event.key==='Enter'||event.key===' '){dropGesture.longPressed=false;}
});
$('commandGrid').onclick=event=>{
  const button=event.target.closest('[data-command]');if(!button)return;
  if(button===dropControl&&dropGesture.longPressed){dropGesture.longPressed=false;return;}
  const id=button===dropControl&&ui.dropOnly?'LAND':button.dataset.command;
  append({id,params:{cells:ui.quantity}});
};
const submitPlacement=document.createElement('button');submitPlacement.id='submitPlacement';submitPlacement.className='secondary-button full-width';submitPlacement.textContent='提交当前方块';submitPlacement.hidden=true;
submitPlacement.onclick=()=>append({id:'SUBMIT_PIECE'});$('commandGrid').after(submitPlacement);
$('rotationPreviewButton').onclick=()=>{
  if(game.mode==='classic'&&game.status==='playing')pause();
  if(!$('rotationPreviewMenu').hidden){closeRotationPreview();draw();return;}
  const previewRect=$('rotationPreviewButton').getBoundingClientRect(),menu=$('rotationPreviewMenu');
  menu.style.left=`${Math.max(8,Math.min(innerWidth-222,previewRect.left-214))}px`;menu.style.top=`${Math.max(8,Math.min(innerHeight-62,previewRect.top))}px`;
  $('rotationPreviewMenu').hidden=false;if(game.mode==='classic')$('resultOverlay').hidden=true;$('rotationPreviewButton').setAttribute('aria-expanded','true');
};
$('rotationPreviewMenu').onclick=event=>{
  const button=event.target.closest('[data-preview]');if(!button)return;
  const piece=ui.previewPiece??game.active??draftPiece(),direction=button.dataset.preview;
  if(!piece)return;
  const trace=rotationTrace(game,piece,direction==='ROTATE_CW');
  if(!trace.ok)showRuleToast(`当前位置无法${direction==='ROTATE_CW'?'顺时针':'逆时针'}旋转。`);
  else ui.previewPiece=trace.piece;
  $('rotationPreviewMenu').querySelectorAll('[data-preview]').forEach(item=>item.setAttribute('aria-pressed',String(item===button&&trace.ok)));
  draw();
};
$('rotationPreviewMenu').addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'){closeRotationPreview();draw();}});
document.addEventListener('pointerdown',event=>{if(!$('rotationPreviewMenu').hidden&&!event.target.closest('#rotationPreviewButton,#rotationPreviewMenu')){closeRotationPreview();draw();}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('rotationPreviewMenu').hidden){closeRotationPreview();draw();$('rotationPreviewButton').focus();}});
$('quantity').onchange=()=>{ui.quantity=Number($('quantity').value);render();};
$('pieceRack').onclick=event=>{
  if(game.mode==='shuhang'){const button=event.target.closest('[data-batch-piece]');if(button&&!game.flow&&!ui.animation){const id=button.dataset.batchPiece;if(!ui.batchDrafts.some(item=>item.pieceId===id))ui.batchDrafts.push({pieceId:id,steps:[]});ui.batchSelected=id;notify('为选中方块添加左右移动或旋转；可直接选择下一块。');render();}return;}
const fixed=event.target.closest('[data-fixed]');if(fixed){showRuleToast('本关是固定顺序关卡，请按库存顺序使用。');return;}const piece=event.target.closest('[data-shape]');if(piece)append({id:'SELECT_PIECE',params:{type:piece.dataset.shape}});};
$('levelsList').onclick=event=>{const button=event.target.closest('[data-level]');if(button)loadGame({mode:'puzzle',levelIndex:Number(button.dataset.level)});};
$('puzzleMode').onclick=()=>{if(game.mode!=='puzzle'){loadGame({mode:'puzzle',levelIndex:0});}};$('endlessMode').onclick=()=>{if(game.mode!=='endless'){loadGame({mode:'endless'});}};
$('shuhangMode').onclick=()=>{if(game.mode!=='shuhang'){loadGame({mode:'shuhang'});}};
$('batchDifficulty').onchange=()=>{if(game.flow||ui.animation)return;ui.batchDifficulty=$('batchDifficulty').value;loadGame({mode:'shuhang'});};
$('classicMode').onclick=()=>{if(game.mode!=='classic'){loadGame({mode:'classic'});}};
function resumeClassic(){game.status='playing';game.gravity=0;audio.unlock();audio.music(true);render();}
$('pauseButton').onclick=()=>{if(game.mode==='classic'){if(game.status==='playing')pause();else resumeClassic();}};
$('undoButton').onclick=()=>{if(ui.animation)return;if(undoLastPiece(game)){ui.plan=[];ui.step=null;stopTimer();closeRotationPreview();notify(game.message);render();}};
function setClassicDifficulty(){
  if(ui.animation)return;
  ui.classicStartLevel=Number($('classicLevel').value);ui.autoLevel=$('autoLevel').checked;
  game.startLevel=ui.classicStartLevel;game.autoLevel=ui.autoLevel;game.speed=CLASSIC_SPEEDS[classicLevel(game)-1];game.gravity=0;
  render();
}
$('classicLevel').onchange=setClassicDifficulty;$('autoLevel').onchange=setClassicDifficulty;
$('restartButton').onclick=()=>showDialog('restartDialog');$('confirmRestart').onclick=()=>{$('restartDialog').close();loadGame();};
$('helpButton').onclick=()=>{document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());startTour();};$('settingsButton').onclick=()=>showDialog('settingsDialog');$('fallSummary').onclick=()=>showDialog('settingsDialog');$('voiceButton').onclick=()=>showDialog('voiceDialog');
document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>button.closest('dialog').close());
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}}));
$('gravityToggle').onchange=updateSpeedControls;$('speedInput').oninput=updateSpeedControls;
document.querySelectorAll('[data-speed]').forEach(button=>button.onclick=()=>{$('speedInput').value=button.dataset.speed;updateSpeedControls();});
$('saveSettings').onclick=()=>{
  if(game.mode==='endless'&&!game.flow){
    ui.lastFallMode=$('gravityToggle').checked?'automatic':'manual';ui.lastSpeed=Number($('speedInput').value);
    dispatch(game,{id:'SET_FALL_MODE',params:{mode:ui.lastFallMode}});dispatch(game,{id:'SET_FALL_SPEED',params:{speed:ui.lastSpeed}});
    notify('设置已更新；仅在运行流程期间自动下落。');
  }
  $('settingsDialog').close();render();
};
$('musicToggle').onchange=()=>{audio.unlock();audio.set('music',$('musicToggle').checked);audio.music(running());};
$('effectsToggle').onchange=()=>{audio.unlock();audio.set('effects',$('effectsToggle').checked);};
$('rotationDemoButton').onclick=()=>{$('settingsDialog').close();$('rotationFrame').src='rotation-demo.html';$('rotationDialog').showModal();};
$('rotationDialog').addEventListener('close',()=>{$('rotationFrame').src='about:blank';$('settingsDialog').showModal();});
document.addEventListener('pointerdown',()=>audio.unlock(),{once:true});
document.addEventListener('click',event=>{if(event.target.closest('button:not(:disabled),summary')){audio.unlock();audio.effect('click');}},true);
$('clearPlan').onclick=()=>{if(game.flow||ui.animation)return;if(game.mode==='shuhang'){ui.batchDrafts=[];ui.batchSelected=null;render();return;}ui.plan=[];notify('草稿已清空，棋盘没有变化。');render();};
$('planList').onclick=event=>{
  if(game.flow||ui.animation)return;
  if(game.mode==='shuhang'){
    const edit=event.target.closest('[data-batch-edit]'),up=event.target.closest('[data-batch-up]'),remove=event.target.closest('[data-batch-remove]'),step=event.target.closest('[data-batch-step]');
    if(edit)ui.batchSelected=edit.dataset.batchEdit;
    if(up){const n=Number(up.dataset.batchUp);if(n>0)[ui.batchDrafts[n-1],ui.batchDrafts[n]]=[ui.batchDrafts[n],ui.batchDrafts[n-1]];}
    if(remove){const [item]=ui.batchDrafts.splice(Number(remove.dataset.batchRemove),1);if(item?.pieceId===ui.batchSelected)ui.batchSelected=null;}
    if(step){const [n,k]=step.dataset.batchStep.split(':').map(Number);ui.batchDrafts[n].steps.splice(k,1);}
    render();return;
  }
  const remove=event.target.closest('[data-remove]'),up=event.target.closest('[data-up]');
  if(remove)ui.plan.splice(Number(remove.dataset.remove),1);
  if(up){const index=Number(up.dataset.up);if(index>0)[ui.plan[index],ui.plan[index-1]]=[ui.plan[index-1],ui.plan[index]];}
  render();
};
$('runPlan').onclick=runPlan;$('stopPlan').onclick=pause;$('toastPause').onclick=pause;
$('resultPrimary').onclick=()=>{if(game.mode==='classic'&&game.status==='paused'){resumeClassic();return;}if(game.flow){runPlan();return;}if(game.status==='won'&&game.levelIndex<LEVELS.length-1)loadGame({levelIndex:game.levelIndex+1});else loadGame();};
$('resultSecondary').onclick=()=>loadGame();
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(running()||game.mode==='classic'&&game.status==='playing')pause();audio.pause();}});
let lastTime=performance.now();
function tick(now){
  const elapsed=Math.min((now-lastTime)/1000,.15);lastTime=now;
  if(game.mode==='classic'){
    if(ui.animation&&game.status==='playing')animate(elapsed*1000);
    else if(game.status==='playing'&&!tourActive){
      const next=copy(game);next.transition=null;advance(next,elapsed);
      if(next.transition)beginAnimation(next,next.transition.piece,view.gravity);
      else{const moved=next.active?.y!==game.active?.y;game=next;if(moved)render();}
    }
  }else if(running()){
    ui.wait+=elapsed*1000;
    ui.gravityTime+=elapsed;
    if(ui.animation)animate(elapsed*1000);
    else{
      if(ui.wait>=450){ui.wait=0;executeNext();}
      else{
        const next=copy(game);next.transition=null;advance(next,ui.gravityTime);ui.gravityTime=0;
        if(!next.flow){ui.step={text:'自动下落 · 接地提交',piece:next.transition?.piece,remaining:900};beginAnimation(next,next.transition?.piece,view.gravity);}
        else if(next.active?.y!==game.active?.y){ui.step={text:'自动下落 · 下移 1 格',piece:next.active,remaining:900};beginAnimation(next,next.active,view.gravity);}
        else game=next;
      }
    }
  }
  if(!game.flow&&ui.step){ui.step.remaining-=elapsed*1000;if(ui.step.remaining<=0)ui.step=null;}
  draw();requestAnimationFrame(tick);
}
let tourActive=false,tourIndex=0,tourSteps=[],tourResume=false,tourPreviousFocus=null;
function startTour(){
  tourPreviousFocus=document.activeElement;tourResume=game.mode==='classic'&&game.status==='playing';
  if(tourResume)game.status='paused';else if(running())pause();
  closeRotationPreview();
  const classic=game.mode==='classic',mobile=view.name==='mobile';
  tourSteps=[
    ['.mode-switch','选择玩法','解谜闯关用给定方块清空棋盘；无尽方块逐块编排；常规模式即时操作并自动下落；舒航模式整层规划、整批执行。'],
    ...(!classic&&game.mode==='puzzle'?[[mobile?'#openLevels':'.level-section','选择关卡','默认从第一关开始。十五关分为简单、中等、困难、特困难，可随时选关；用完全部方块并清空棋盘才算通关。']]:[]),
    ...(!['puzzle','shuhang'].includes(game.mode)?[['#toolShelf','道具替换当前方块','点击立即扣除道具、取消当前块并在顶部换上道具块。穿墙单格可以穿过堆积，落地填本列最低空格；炸弹碰到障碍或边界就引爆周围 3×3。单格无需旋转。每 1000 分交替奖励，最多存四个，满额奖励保留；清空或换道具不退款。']]:[]),
    ['#scoreValue','查看得分','得分在棋盘侧边显示，消行后会累积。'],
    ['#restartButton','重新开始','重置当前棋盘、分数和流程，重新挑战当前关卡或本局。'],
    ['#rotationPreviewButton','旋转预览','眼睛图标是预览入口。展开后点顺时针或逆时针，临时查看真实旋转结果，不添加动作。关闭或离开后恢复原样。常规模式预览前会暂停。'],
    ['#undoButton','撤回上一块','撤销最近一个已固定方块的整轮操作，包括消行和积分；恢复原来的棋盘、库存及同一个方块，重新操作。只能撤回一块，运行和动画期间不可用。'],
    [classic||game.mode==='endless'?'#endlessNote':'.piece-bar','当前方块与库存',classic?'方块列表最上面是当前方块，下面按顺序显示后续方块。':'固定顺序按队列出场；自由排序先点选一个形状，数字表示该形状剩余数量。'],
    ['#commandGrid','移动与旋转',classic?'左右移动、下移、逆转、顺转都立即生效。每次移动一格。':'点击左移、右移、下移、逆转、顺转，只添加流程步骤。格数可以设置，动作加入后自动回到一格。'],
    ['[data-command="HARD_DROP"]','落地并提交',classic?'默认短按落地并提交；长按半秒切换为只落地。只落地后自动锁定会等待，可继续左右、下移或旋转，再点“提交当前方块”；也可长按切回落地并提交。':'默认短按落地并提交；长按半秒切换为只落地。点击只落地仅加入流程，棋盘保持不动；运行流程后才落地并保留当前块，可以在落地步骤后继续编排左右或下移动作，运行调整后点“提交当前方块”，也可切回落地并提交。'],
    ...(classic?[
      ['#classicControls','九级速度','手动选择起始等级。一共九级，越高越快；勾选积分升级，每累计 1000 分在起始等级上提升一级，最高九级。取消勾选则保持手动等级。'],
      ['#pauseButton','暂停与继续','暂停会冻结自动下落，点击继续恢复。打开设置、引导或切到后台也会暂停。']
    ]:[
      [mobile?'#flowPanel':'#planList','查看流程步骤',mobile?'点“流程”打开步骤面板，可上移或删除动作，清空只清除草稿。每轮只操作一个方块。':'这里按顺序显示步骤，可上移、删除或清空。草稿只编排，不提前改变棋盘。每轮只操作一个方块。'],
      ['#runPlan','结束并运行流程','结束编排并依次执行。流程自然结束也会固定当前方块，即使它悬空；随后换下一块并清空流程。想落到底部，请加入“落地并提交”。']
    ])
  ];
  if(game.mode==='shuhang')tourSteps=[
    ['.mode-switch','舒航模式','先在脑海中规划一整层，再一次性执行。选中候选后显示它的出生位置和初始方向，方便计算移动格数；规划时不执行动作，也不预览落点或旋转结果。'],
    ['#batchControls','选择难度与层数','简单每层 3 块，中等 4 块，困难 5 块。全部执行后未溢出就进入下一层，保留棋盘和积分。切换难度会重新开局。'],
    ['.piece-bar','每一块都必须选','逐个点击本层候选，点击顺序就是执行顺序。同形状的方块各自独立，每一块都要选一次。点击已选的方块可继续编辑。'],
    ['#commandGrid','规划移动与落地','先选一块，再编排左右移动、旋转。长按落地按钮半秒可切换只落地，把落地→横移排进同一候选的流程；所有步骤仍等整批提交后执行。每块末尾自动落地并提交，不加动作表示按初始方向直接落地。'],
    [mobile?'#flowPanel':'#planList','检查整层方案','这里逐块列出操作，↑ 调整出场顺序，× 删除动作或取消某块安排。全部候选都安排完，才能整批提交。'],
    ['#runPlan','整批提交','方案锁定后逐块执行：移动和旋转 → 自动落地固定 → 消行 → 下一块。执行期间不能修改；暂停只冻结进度。'],
    ['#toolShelf','道具占用候选名额','先选中一个候选，再点道具：立即扣一个并替换该候选、清除它的旧动作，仍占本层一个名额。单格无需旋转。整批执行时穿墙或碰撞引爆，之后继续下一块；点击后取消安排也不退道具。每 1000 分交替奖励道具。'],
    ['#layerStatus','挑战更高层','整批存活就进入下一层并给出新候选；方块出生溢出时结束，显示到达层数、通过层数和得分。没有单块撤回，规划后再提交。'],
    ['#scoreValue','得分','得分在侧边显示，会跨层累计。']
  ];
  tourSteps=tourSteps.filter(([selector])=>{const target=document.querySelector(selector);return target&&(selector==='#flowPanel'&&view.name==='mobile'||target.getClientRects().length>0);});
  tourIndex=0;tourActive=true;$('tourOverlay').hidden=false;render();showTourStep();$('tourNext').focus();
}
function showTourStep(){
  const [selector,title,text]=tourSteps[tourIndex];
  if(view.name==='mobile'){
    if(selector==='#flowPanel'&&$('flowPanel').hidden)$('openFlow').click();
    else if(selector!=='#flowPanel'&&!$('flowPanel').hidden)$('closeFlow').click();
  }
  const target=document.querySelector(selector);
  $('tourTitle').textContent=title;$('tourText').textContent=text;$('tourProgress').textContent=`玩法引导 ${tourIndex+1} / ${tourSteps.length}`;
  $('tourBack').disabled=tourIndex===0;$('tourNext').textContent=tourIndex===tourSteps.length-1?'开始游戏':'下一步';
  target?.scrollIntoView({block:'nearest',inline:'nearest'});positionTour();
}
function positionTour(){
  if(!tourActive)return;
  const target=document.querySelector(tourSteps[tourIndex][0]),rect=target?.getBoundingClientRect();
  if(!rect)return;
  const spotlight=$('tourSpotlight'),card=$('tourCard'),pad=5;
  Object.assign(spotlight.style,{left:`${Math.max(2,rect.left-pad)}px`,top:`${Math.max(2,rect.top-pad)}px`,width:`${Math.min(innerWidth-4,rect.width+pad*2)}px`,height:`${Math.min(innerHeight-4,rect.height+pad*2)}px`});
  const h=card.offsetHeight,w=card.offsetWidth;
  let top=rect.bottom+14;if(top+h>innerHeight-12)top=rect.top-h-14;
  // Wide targets (e.g. the board sidebar) may need a card beside them.
  let left=Math.max(12,Math.min(innerWidth-w-12,rect.left+rect.width/2-w/2));
  if(top<12&&innerWidth>800){left=Math.min(innerWidth-w-12,rect.right+18);top=(innerHeight-h)/2;}
  card.style.left=`${left}px`;card.style.top=`${Math.max(12,Math.min(innerHeight-h-12,top))}px`;
}
function endTour(){
  tourActive=false;$('tourOverlay').hidden=true;
  if(view.name==='mobile'&&!$('flowPanel').hidden)$('closeFlow').click();
  if(tourResume&&game.mode==='classic'&&!document.hidden)resumeClassic();else render();
  if(tourPreviousFocus?.isConnected)tourPreviousFocus.focus({preventScroll:true});
}
$('tourSkip').onclick=endTour;$('tourBack').onclick=()=>{if(tourIndex>0){tourIndex--;showTourStep();}};
$('tourNext').onclick=()=>{if(tourIndex===tourSteps.length-1)endTour();else{tourIndex++;showTourStep();}};
document.addEventListener('keydown',event=>{
  if(!tourActive)return;
  if(event.key==='Escape'){event.preventDefault();endTour();}
  if(event.key==='Tab'){
    const buttons=[...$('tourCard').querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
window.addEventListener('resize',positionTour);
function initBoardLayout(){
  const stage=$('boardStage'),layout=document.createElement('div'),rail=document.createElement('aside');
  layout.className='board-layout';rail.className='board-rail';rail.setAttribute('aria-label','得分与游戏工具');
  stage.before(layout);layout.append(stage,rail);
  const tools=document.createElement('section');tools.id='toolShelf';tools.className='tool-shelf';tools.setAttribute('aria-label','道具');tools.hidden=true;
  tools.innerHTML='<button id="toolPHASE" class="tool-item" title="立即替换当前方块，穿墙填洞"><span class="tool-glyph phase-glyph" aria-hidden="true">◇</span><span>穿墙单格</span><b class="tool-count">×1</b></button><button id="toolBOMB" class="tool-item" title="立即替换当前方块，碰撞引爆 3×3"><span class="tool-glyph bomb-glyph" aria-hidden="true">●</span><span>炸弹</span><b class="tool-count">×1</b></button><small id="toolProgress"></small>';
  // Bind before the initial render; both device views use the same shelf.
  tools.querySelector('#toolPHASE').onclick=()=>activateTool('PHASE');tools.querySelector('#toolBOMB').onclick=()=>activateTool('BOMB');
  rail.append(document.querySelector('.score-banner'),tools,document.querySelector('.play-actions'),$('classicControls'),$('batchControls'),document.querySelector('.piece-bar'),$('endlessNote'));
  const quantityLabel=document.querySelector('.quantity-row label');quantityLabel.classList.add('move-quantity');rail.insertBefore(quantityLabel,$('classicControls'));
  document.body.append($('rotationPreviewMenu'));
  if(view.name==='mobile'){
    const mission=document.querySelector('.mobile-mission');mission.append($('openLevels'));
  }
  document.querySelectorAll('.voice-entry').forEach(button=>{button.classList.remove('voice-entry');button.classList.add('secondary-button','full-width');$('settingsDialog').append(button);});
}
initBoardLayout();view.init();new ResizeObserver(()=>draw()).observe($('boardStage'));render();startTour();requestAnimationFrame(tick);


