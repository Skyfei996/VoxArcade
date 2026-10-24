import {SHAPES,COLORS,LEVELS,COMMANDS,copy,createGame,dispatch,advance,cells,landingPiece,rotationTrace,inventory,startFlow,stepFlow,pauseFlow,resumeFlow,classicAction,classicLevel,CLASSIC_SPEEDS,undoLastPiece} from './engine.mjs';
import {GameAudio,commandSound} from './audio.mjs';
import {sizeBoard,drawGrid} from './board-view.mjs';
const {view}=await import(document.body.dataset.view==='mobile'?'./mobile-view.mjs':'./desktop-view.mjs');
const audio=new GameAudio();
const $=id=>document.getElementById(id);
const icon=id=>`<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;
const recordKey='vox-prototype-v2-completed';
let completed=new Set();
try{const saved=JSON.parse(localStorage.getItem(recordKey)||'[]');if(Array.isArray(saved))completed=new Set(saved.filter(n=>Number.isInteger(n)&&n>=0&&n<LEVELS.length));}catch{}
let game=createGame({levelIndex:0});
const ui={plan:[],wait:0,gravityTime:0,animation:null,step:null,quantity:1,lastFallMode:'manual',lastSpeed:1,previewPiece:null,classicStartLevel:1,autoLevel:true};
let ruleToastTimer;
const running=()=>game.flow?.status==='running';
function miniature(type){
  const matrix=SHAPES[type];if(!matrix)return '<span class="muted">—</span>';
  const rows=matrix.filter(row=>row.some(Boolean));
  return `<span class="mini-piece" style="grid-template-columns:repeat(${rows[0].length},7px);--piece-color:${COLORS[type]}" aria-hidden="true">${rows.flatMap(row=>row.map(v=>`<i class="${v?'':'empty'}"></i>`)).join('')}</span>`;
}
function notify(message,error=false){$('feedbackText').textContent=message;$('feedback').classList.toggle('error',error);if(error&&!['won','lost'].includes(game.status))audio.effect('invalid');}
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
  stopTimer();ui.plan=[];ui.animation=null;ui.step=null;audio.pause();
  closeRotationPreview();
  clearTimeout(ruleToastTimer);$('ruleToast').hidden=true;
  game=createGame({mode:options.mode??game.mode,levelIndex:options.levelIndex??game.levelIndex,fallMode:ui.lastFallMode,speed:ui.lastSpeed,startLevel:ui.classicStartLevel,autoLevel:ui.autoLevel});
  notify(game.mode==='classic'?'点击操作立即生效，方块会持续下落。':'先编排，再运行。流程结束会固定当前方块，悬空也保留。');render();
}
function append(command){
  if(game.mode==='classic'){
    if(ui.animation)return;
    closeRotationPreview();const next=copy(game);next.transition=null;
    const result=classicAction(next,{...command,params:{cells:1}});
    if(!result.ok){notify(result.message,true);return;}
    audio.unlock();audio.music(true);const sound=commandSound(command,result);if(sound)audio.effect(sound);
    notify(result.message);if(next.transition)beginAnimation(next,next.transition.piece,view.drop);else{game=next;render();}return;
  }

  if(game.flow){notify('本轮流程尚未完成，请先继续运行。',true);return;}
  if(['won','lost'].includes(game.status)){notify('请先重开或进入下一关。',true);return;}
  closeRotationPreview();
  if(command.id==='SELECT_PIECE'){
    if(game.active){notify('本轮已给出当前方块。',true);return;}
    const existing=ui.plan.findIndex(step=>step.id==='SELECT_PIECE');
    if(existing>=0)ui.plan[existing]=command;else ui.plan.unshift(command);
  }else{
    if(command.id==='HARD_DROP'&&!game.active&&!ui.plan.some(step=>step.id==='SELECT_PIECE')){notify('请先选择一个形状。',true);return;}
    if(ui.plan.length>=60){notify('一轮流程最多 60 步。',true);return;}
    ui.plan.push(command);
  }
  if(command.id!=='SELECT_PIECE'){ui.quantity=1;$('quantity').value='1';}
  audio.unlock();audio.effect(command.id==='SELECT_PIECE'?'select':'click');
  notify(`已加入：${label(command)}。运行前不展示流程结果。`);render();$('planList').scrollTop=$('planList').scrollHeight;
  if(command.id==='HARD_DROP')runPlan();
}
function draftPiece(){
  const type=ui.plan.find(step=>step.id==='SELECT_PIECE')?.params.type;
  return !game.active&&type?{type,matrix:SHAPES[type],x:Math.floor((game.width-SHAPES[type].length)/2),y:0}:null;
}
function settleUI(){
  stopTimer();ui.plan=[];
  notify(game.mode==='classic'?game.message:game.lastFlow?.message??game.message,game.status==='lost');
  audio.music(game.mode==='classic'&&game.status==='playing');
  if(['won','lost'].includes(game.status))audio.effect(game.status);
  render();
}
function executeNext(){
  if(!running()||ui.animation)return;
  const command=game.flow.steps[game.flow.cursor],next=copy(game);next.transition=null;
  const result=stepFlow(next),target=next.transition?.piece??next.active;
  ui.step={text:`第 ${game.flow.cursor+1} 步 · ${label(command)}${result.skipped?'（受阻，跳过）':''}`,piece:target??game.active,remaining:900};
  notify(`第 ${game.flow.cursor+1} 步：${result.message}`,!result.ok);
  const sound=commandSound(command,result);if(sound)audio.effect(sound);
  beginAnimation(next,target,command.id==='HARD_DROP'?view.drop:view.motion);
}
function beginAnimation(next,target,duration){
  const from=game.active??draftPiece();
  const arrivalSound=next.transition?next.mode==='classic'||['hardDrop','downBlocked','sideBlocked','gravity'].includes(next.lastFlow?.reason)?'land':'lock':null;
  ui.animation={next,from,target,elapsed:0,motion:duration,rows:next.transition?.rows??[],clearPlayed:false,arrivalPlayed:false,arrivalSound};
  render();
}
function animate(milliseconds){
  const animation=ui.animation;animation.elapsed+=milliseconds;
  if(animation.elapsed>=animation.motion&&!animation.arrivalPlayed){animation.arrivalPlayed=true;if(animation.arrivalSound)audio.effect(animation.arrivalSound);}
  if(animation.rows.length&&animation.elapsed>=animation.motion+70&&!animation.clearPlayed){animation.clearPlayed=true;audio.effect('clear',animation.rows.length);}
  if(animation.elapsed<animation.motion+(animation.rows.length?660:0))return;
  game=animation.next;ui.animation=null;
  if(!game.flow)settleUI();else render();
}
function runPlan(){
  if(running())return;
  closeRotationPreview();
  if(game.flow){resumeFlow(game);audio.effect('resume');}
  else{
    if(!game.active&&!ui.plan.some(step=>step.id==='SELECT_PIECE')){notify('请先选择一个形状。',true);return;}
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
    $('gravityDescription').textContent=game.mode==='classic'?'常规模式持续自动下落，九级速度在棋盘上方设置。':game.mode==='puzzle'?'本关固定手动下落。':game.flow?'本轮完成后才可修改。':'仅在流程运行期间下落；编排时冻结。';
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
  $('levelTitle').textContent=level.title;$('levelGoal').textContent=`${level.difficulty} · ${level.goal}`;
  $('levelTags').innerHTML=level.tags.map(tag=>`<span>${tag}</span>`).join('');
  $('missionIndex').textContent=`${String(game.levelIndex+1).padStart(2,'0')} / ${total}`;
  $('completedCount').textContent=`${completed.size} / ${LEVELS.length}`;
}
function renderPieces(){
  const level=LEVELS[game.levelIndex],draftType=ui.plan.find(command=>command.id==='SELECT_PIECE')?.params.type;
  $('poolLabel').textContent=game.mode==='puzzle'?`剩余库存 · ${level.free?'自由排序':'固定顺序'}`:'当前方块';
  if(game.mode==='puzzle'){
    $('pieceRack').innerHTML=level.free?inventory(game).map(({type,count})=>`<button class="piece-chip ${count?'':'used'} ${draftType===type?'draft-selected':''} ${game.active?.type===type?'current':''}" data-shape="${type}" aria-label="${type} 方块，剩余 ${count} 个" ${!count||!!game.active||!!game.flow?'disabled':''}>${miniature(type)}<b>×${count}</b></button>`).join(''):
      game.pool.map((piece,index)=>({...piece,order:index+1})).filter(piece=>!piece.used).map((piece,index)=>`<button class="piece-chip queue-chip ${index===0?'current':''}" data-fixed="true" aria-label="第 ${piece.order} 块：${piece.type}，固定顺序">${miniature(piece.type)}<b>${piece.order}</b></button>`).join('');
    $('pieceRemaining').textContent=`未用 ${game.pool.filter(p=>!p.used).length}`;
  }else{
    $('pieceRack').innerHTML=`<span class="piece-chip current">${miniature(game.active?.type??'T')}</span>`;
    $('pieceRemaining').textContent=game.fallMode==='automatic'?`${game.speed} 格 / 秒`:'手动';
  }
  $('orderNote').hidden=true;
  $('nextPieces').innerHTML=game.queue.slice(0,5).map(miniature).join('');$('heldPiece').innerHTML=game.held?miniature(game.held):'<span>—</span>';
}
function renderPlan(){
  const cursor=game.flow?.cursor??0,locked=!!game.flow;
  $('flowCount').textContent=ui.plan.length;$('flowEmpty').hidden=ui.plan.length>0;
  $('planList').innerHTML=ui.plan.map((command,index)=>`<li class="plan-step ${command.id==='SELECT_PIECE'?'select-step':''} ${index<cursor?'executed':''} ${running()&&index===cursor?'current':''}"><span class="step-index">${index<cursor?'✓':String(index+1).padStart(2,'0')}</span><span class="step-label">${label(command)}</span><button class="step-action" data-up="${index}" aria-label="上移第${index+1}步" ${locked||index===0?'disabled':''}>↑</button><button class="step-action" data-remove="${index}" aria-label="移除第${index+1}步" ${locked?'disabled':''}>×</button></li>`).join('');
  $('planValidation').textContent=running()?`运行 ${cursor} / ${ui.plan.length} · 碰撞在执行时判断`:game.flow?'已暂停 · 继续后不会重放已执行步骤':ui.plan.length?`共 ${ui.plan.length} 步 · 运行前不展示效果或判断碰撞`:'编排一块的动作，运行结束后固定当前位置。';
  $('runPlan').disabled=running()||(!ui.plan.length&&!game.flow)||['won','lost'].includes(game.status);
  $('runPlan').innerHTML=`${icon('play')}${game.flow?'继续运行':'结束并运行流程'}`;
  $('stopPlan').hidden=!running();$('clearPlan').disabled=locked;
}
function renderResult(){
  const paused=game.flow?.status==='paused'||game.mode==='classic'&&game.status==='paused',ended=['won','lost'].includes(game.status),won=game.status==='won';
  $('resultOverlay').hidden=!paused&&!ended;if(!paused&&!ended)return;
  $('resultIcon').textContent=paused?'Ⅱ':won?'✓':'↻';$('resultEyebrow').textContent=paused?'TAKE YOUR TIME':won?'WELL PLAYED':'ANOTHER WAY AWAITS';
  $('resultTitle').textContent=paused?(game.mode==='classic'?'游戏已暂停':'流程已暂停'):won?'全部消除！':'换个方案，再试一次。';
  $('resultDescription').textContent=paused?(game.mode==='classic'?'继续后恢复自动下落，也可以撤回上一块。':'已执行步骤保留，继续后从下一步运行。'):won?`全部 ${game.pool.length} 块已使用，${game.moves} 次动作，消除 ${game.lines} 行。`:game.message;
  $('resultPrimary').innerHTML=paused?`${icon('play')}${game.mode==='classic'?'继续游戏':'继续运行'}`:won&&game.mode==='puzzle'&&game.levelIndex<LEVELS.length-1?`下一关 ${icon('arrow')}`:won?'重新挑战':'重新开始';
  $('resultSecondary').textContent=paused?'重开本局':won?'再试一次':'重新安排步骤';
}
function render(){
  if(game.status==='won'&&game.mode==='puzzle'&&!completed.has(game.levelIndex)){
    completed.add(game.levelIndex);try{localStorage.setItem(recordKey,JSON.stringify([...completed]));}catch{}
  }
  document.body.dataset.mode=game.mode;document.body.dataset.composing='true';document.body.dataset.running=String(running());
  $('puzzleMode').classList.toggle('active',game.mode==='puzzle');$('endlessMode').classList.toggle('active',game.mode==='endless');
  $('puzzleMode').setAttribute('aria-pressed',String(game.mode==='puzzle'));$('endlessMode').setAttribute('aria-pressed',String(game.mode==='endless'));
  for(const selector of ['.mission-copy','.level-section','.thinking-note'])document.querySelector(selector).hidden=game.mode!=='puzzle';
  $('classicMode').classList.toggle('active',game.mode==='classic');$('classicMode').setAttribute('aria-pressed',String(game.mode==='classic'));
  $('classicControls').hidden=game.mode!=='classic';$('classicLevel').value=String(game.startLevel);$('autoLevel').checked=game.autoLevel;
  $('classicSpeed').textContent=`当前 ${classicLevel(game)} 级 · ${game.speed} 格/秒`;
  $('classicLevel').disabled=!!ui.animation;$('autoLevel').disabled=!!ui.animation;
  $('scoreValue').textContent=game.score;
  $('undoButton').disabled=!game.undo||!!game.flow||!!ui.animation;
  document.querySelectorAll('.control-heading h2').forEach(el=>el.textContent=game.mode==='classic'?'即时操作':'编排你的下一步');
  $('endlessNote').hidden=game.mode==='puzzle';
  $('fallSummaryText').textContent=game.fallMode==='automatic'?`自动 · ${game.speed} 格/秒`:'手动下落';
  $('holdButton').hidden=true;
  $('commandHint').textContent=game.mode==='classic'?'点击立即操作 · 自动下落':running()?'正在执行，不能插入动作':'点击按钮，只添加步骤';
  const shownPiece=game.active??draftPiece();
  $('boardStatus').textContent=game.mode==='classic'?`常规模式 · ${game.status==='playing'?'进行中':game.status==='paused'?'已暂停':'已结束'}`:running()?`运行中 · 第 ${(game.flow?.cursor??0)+1} 步`:game.status==='won'?'关卡完成':game.status==='lost'?'本次结束':game.flow?'流程暂停':shownPiece?`待编排 · ${shownPiece.type} 方块`:'待编排 · 先选一个形状';
  $('pauseButton').hidden=game.mode!=='classic';$('pauseButton').disabled=['won','lost'].includes(game.status);$('pauseButton').innerHTML=icon(game.status==='paused'?'play':'pause');
  $('pauseButton').setAttribute('aria-label',game.status==='paused'?'继续游戏':'暂停游戏');
  $('scoreLabel').textContent='当前得分';
  $('linesStat').innerHTML=`${game.score}<small> 分</small>`;
  $('movesStat').innerHTML=`${game.moves}<small> 步</small>`;$('thirdLabel').textContent=game.mode!=='puzzle'?'已消行数':'已用方块';
  $('mobileStats').textContent=`消除 ${game.lines} 行 · ${game.moves} 步`;
  $('thirdStat').innerHTML=game.mode!=='puzzle'?`${game.lines}<small> 行</small>`:`${game.pool.filter(p=>p.used).length}<small> / ${game.pool.length}</small>`;
  $('boardHint').hidden=!!game.active||!!draftPiece()||!!game.flow||['won','lost'].includes(game.status);
  $('boardHint').textContent='先选形状，再编排。';
  $('boardNote').textContent='流程结束即固定，悬空也会成为下一块的障碍。';
  $('executionToast').hidden=!running();$('executionProgress').textContent=running()?`正在执行 ${game.flow.cursor} / ${ui.plan.length} 步`:'';
  document.querySelectorAll('[data-command]').forEach(button=>{
    button.disabled=!!game.flow||!!ui.animation||['won','lost'].includes(game.status)||game.mode==='classic'&&game.status!=='playing';
    const item=COMMANDS.find(c=>c.id===button.dataset.command);button.querySelector('.command-detail').textContent=item.parameter?`${game.mode==='classic'?1:ui.quantity} 格`:item.id==='HARD_DROP'?(game.mode==='classic'?'立即落地固定':'运行并提交'):'旋转方块';
  });
  $('rotationPreviewButton').disabled=!shownPiece||!!game.flow||!!ui.animation||['won','lost'].includes(game.status);
  if($('rotationPreviewButton').disabled)closeRotationPreview();
  renderLevels();renderPieces();renderPlan();renderResult();view.render(game,ui.plan);draw();
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
  const animation=ui.animation,phase=!animation?'idle':animation.elapsed<animation.motion?'move':animation.rows.length&&animation.elapsed<animation.motion+480?'clear':animation.rows.length?'collapse':'move';
  canvas.dataset.phase=phase;
  const board=animation&&phase!=='move'?animation.next.transition.board:game.board;
  const progress=phase==='collapse'?Math.min(1,(animation.elapsed-animation.motion-480)/180):0;
  for(let y=0;y<game.height;y++)for(let x=0;x<game.width;x++){
    const type=board[y][x];if(!type)continue;
    if(phase==='collapse'&&animation.rows.includes(y))continue;
    const shift=phase==='collapse'?animation.rows.filter(row=>row>y).length*progress:0;
    tile(x,y+shift,phase==='clear'&&animation.rows.includes(y)&&Math.floor((animation.elapsed-animation.motion)/80)%2===0?'#fff5bd':COLORS[type]);
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
  if(piece&&!preview){
    const landing=landingPiece(game,animation?.target??piece);
    if(landing&&landing.y>piece.y)for(const {x,y} of cells(landing))ghostTile(x,y);
  }
  if(piece)for(const {x,y} of cells(preview??piece))tile(x,y,COLORS[piece.type]);
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
  canvas.setAttribute('aria-label',`${game.width}列${game.height}行棋盘，已消除${game.lines}行，${piece?`当前方块${piece.type}`:'等待选择形状'}${preview?'，正在临时预览旋转结果':''}`);
}
const commandOrder=['MOVE_LEFT','MOVE_RIGHT','MOVE_DOWN','ROTATE_CCW','ROTATE_CW','HARD_DROP'];
$('commandGrid').innerHTML=commandOrder.map(id=>COMMANDS.find(item=>item.id===id)).map(item=>`<button class="command-button" data-command="${item.id}"><span class="command-symbol" aria-hidden="true">${item.symbol}</span><span class="command-label">${item.label}<small class="command-detail">${item.parameter?'1 格':item.id==='HARD_DROP'?'提交本轮':'旋转方块'}</small></span></button>`).join('');
$('commandGrid').onclick=event=>{const button=event.target.closest('[data-command]');if(button)append({id:button.dataset.command,params:{cells:ui.quantity}});};
$('rotationPreviewButton').onclick=()=>{
  if(game.mode==='classic'&&game.status==='playing')pause();
  if(!$('rotationPreviewMenu').hidden){closeRotationPreview();draw();return;}
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
$('pieceRack').onclick=event=>{const fixed=event.target.closest('[data-fixed]');if(fixed){showRuleToast('本关是固定顺序关卡，请按库存顺序使用。');return;}const piece=event.target.closest('[data-shape]');if(piece)append({id:'SELECT_PIECE',params:{type:piece.dataset.shape}});};
$('levelsList').onclick=event=>{const button=event.target.closest('[data-level]');if(button)loadGame({mode:'puzzle',levelIndex:Number(button.dataset.level)});};
$('puzzleMode').onclick=()=>{if(game.mode!=='puzzle'){loadGame({mode:'puzzle',levelIndex:0});startTour();}};$('endlessMode').onclick=()=>{if(game.mode!=='endless'){loadGame({mode:'endless'});startTour();}};
$('classicMode').onclick=()=>{if(game.mode!=='classic'){loadGame({mode:'classic'});startTour();}};
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
$('clearPlan').onclick=()=>{if(game.flow)return;ui.plan=[];notify('草稿已清空，棋盘没有变化。');render();};
$('planList').onclick=event=>{
  if(game.flow)return;
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
    ['.mode-switch','选择玩法','解谜闯关用给定方块清空棋盘；无尽方块可以一直编排；常规模式操作立即生效，方块持续下落。'],
    ...(!classic&&game.mode==='puzzle'?[[mobile?'#openLevels':'.level-section','选择关卡','默认从第一关开始。十五关分为简单、中等、困难、特困难，可随时选关；用完全部方块并清空棋盘才算通关。']]:[]),
    ['#scoreValue','一次消得越多，奖励越高','同时消除一、二、三、四行分别获得 100、300、600、1000 分。一次四行高于两次两行。'],
    ['#restartButton','重新开始','重置当前棋盘、分数和流程，重新挑战当前关卡或本局。'],
    ['#rotationPreviewButton','旋转预览','眼睛图标是预览入口。展开后点顺时针或逆时针，临时查看真实旋转结果，不添加动作。关闭或离开后恢复原样。常规模式预览前会暂停。'],
    ['#undoButton','撤回上一块','撤销最近一个已固定方块的整轮操作，包括消行和积分；恢复原来的棋盘、库存及同一个方块，重新操作。只能撤回一块，运行和动画期间不可用。'],
    ['.piece-bar','当前方块与库存',classic?'这里显示当前方块；后续方块显示在预告区。':'固定顺序按队列出场；自由排序先点选一个形状，数字表示该形状剩余数量。'],
    ['#commandGrid','移动与旋转',classic?'左右移动、下移、逆转、顺转都立即生效。每次移动一格。':'点击左移、右移、下移、逆转、顺转，只添加流程步骤。格数可以设置，动作加入后自动回到一格。'],
    ['[data-command="HARD_DROP"]','落地并提交',classic?'立即降到落点并固定当前方块，然后换下一块。':'把“落地并提交”加入末尾，并自动执行整份流程；先执行前面的移动和旋转，再落地固定。'],
    ...(classic?[
      ['#classicControls','九级速度','手动选择起始等级。一共九级，越高越快；勾选积分升级，每累计 1000 分在起始等级上提升一级，最高九级。取消勾选则保持手动等级。'],
      ['#pauseButton','暂停与继续','暂停会冻结自动下落，点击继续恢复。打开设置、引导或切到后台也会暂停。']
    ]:[
      [mobile?'#flowPanel':'#planList','查看流程步骤',mobile?'点“流程”打开步骤面板，可上移或删除动作，清空只清除草稿。每轮只操作一个方块。':'这里按顺序显示步骤，可上移、删除或清空。草稿只编排，不提前改变棋盘。每轮只操作一个方块。'],
      ['#runPlan','结束并运行流程','结束编排并依次执行。流程自然结束也会固定当前方块，即使它悬空；随后换下一块并清空流程。想落到底部，请加入“落地并提交”。']
    ])
  ];
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
view.init();new ResizeObserver(()=>draw()).observe($('boardStage'));render();startTour();requestAnimationFrame(tick);

