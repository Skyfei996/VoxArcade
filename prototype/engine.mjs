export const SHAPES = {
  I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O:[[1,1],[1,1]],T:[[0,1,0],[1,1,1],[0,0,0]],
  J:[[1,0,0],[1,1,1],[0,0,0]],L:[[0,0,1],[1,1,1],[0,0,0]],
  S:[[0,1,1],[1,1,0],[0,0,0]],Z:[[1,1,0],[0,1,1],[0,0,0]]
};
export const TOOL_TYPES=['PHASE','BOMB'];
export const TOOL_CAPACITY=4;
export const TOOL_REWARD_SCORE=1000;
export const toolName=type=>({PHASE:'穿墙单格',BOMB:'炸弹'}[type]??type);
export const isTool=type=>TOOL_TYPES.includes(type);
export const shapeMatrix=type=>isTool(type)?[[1]]:SHAPES[type];
export const COLORS={I:'#95e6d8',O:'#f1ca72',T:'#b9a5eb',J:'#8bb9ec',L:'#f1ac7a',S:'#b9ed8c',Z:'#ef969b',PHASE:'#c6abff',BOMB:'#ff956d',fixed:'#59766a'};
export const LEVELS=[
  {id:'P001',title:'最后一条缝',rows:['##....'],pieces:['I'],free:false,goal:'用 I 补齐底行。用完全部方块并清空棋盘。',tags:['入门','固定顺序']},
  {id:'P002',title:'正方形钥匙',rows:['##..##','##..##'],pieces:['O'],free:false,goal:'用 O 同时消除两行。用完全部方块并清空棋盘。',tags:['入门','固定顺序']},
  {id:'P003',title:'谁先落地',rows:['###.##','###.##','..#.##','..#.##'],pieces:['O','I'],free:true,goal:'自行安排 I 和 O 的顺序，用完两块并清空棋盘。',tags:['顺序思考','自由排序']},
  {id:'P004',title:'翻个面',rows:['##...#','###.##'],pieces:['T'],free:false,goal:'旋转 T，填补空位。用完全部方块并清空棋盘。',tags:['旋转练习','固定顺序']},
  {id:'P005',title:'三步清场',rows:['..####','..####','##....','##....'],pieces:['I','I','O'],free:true,goal:'自行安排三个方块，先打开通道，再全部消除。',tags:['组合解谜','自由排序']},
  {id:'P006',title:'七形拼图',width:8,height:12,rows:[],pieces:['I','O','T','T','J','L','S','Z'],free:true,goal:'七种形状共八块，T 有两块。自己决定顺序，用完全部方块且全盘清空。',tags:['进阶 · 8 块','自由排序']},
  {id:'P007',title:'既定的旅程',width:8,height:12,rows:[],pieces:['I','O','Z','T','T','J','S','L'],free:false,goal:'八块按预设队列出场。不能改序，规划每块的朝向和位置，最终全部消除。',tags:['进阶 · 8 块','固定顺序']},
  {id:'P008',title:'不完整的拼图',width:8,height:12,rows:['......##','####..##'],pieces:['T','J','L','S','Z','T'],free:true,goal:'利用底部已有布局，自行安排五种形状共六块。必须用完，再清空整个棋盘。',tags:['进阶 · 6 块','自由排序']}
];
const EXTRA_LEVELS=[
  {"id":"P009","title":"两块接力","rows":["......","..####"],"pieces":["O","I"],"free":false,"difficulty":"简单","goal":"安排两块的位置，用完全部方块并清空棋盘。"},
  {"id":"P010","title":"转角拼合","rows":["#.....","##.#.."],"pieces":["T","O"],"free":false,"difficulty":"简单","goal":"观察 T 和 O 如何配合，用完两块并清空棋盘。"},
  {"id":"P011","title":"留出下一步","rows":["......","...###","...###"],"pieces":["L","I","S"],"free":true,"difficulty":"中等","goal":"自行安排三种形状，兼顾当前落点和后续空间，用完全部方块并清空棋盘。"},
  {"id":"P012","title":"错层接力","rows":["#.....","#.....","###.#."],"pieces":["T","L","O"],"free":false,"difficulty":"中等","goal":"三块按固定顺序出场。观察消行后的错层变化，用完全部方块并清空棋盘。"},
  {"id":"P013","title":"双折线布局","rows":["#.....","##....","..#..#","..#.##"],"pieces":["Z","J","O","Z"],"free":true,"difficulty":"中等","goal":"两块 Z 与 J、O 自由排序，规划落点与通道，用完四块并清空棋盘。"},
  {id:'P014',title:'残局接力',width:8,height:12,rows:['.#......','#####.##'],pieces:['T','J','S','L'],free:false,difficulty:'困难',goal:'四块按固定顺序出场。利用底部缺口，逐步消除并清空。'},
  {id:'P015',title:'五块协作',width:8,height:12,rows:['...##.##'],pieces:['L','T','S','J','T'],free:true,difficulty:'困难',goal:'五块自由排序，T 有两块。规划顺序与朝向，全部用完并清空。'}
];
LEVELS.forEach((level,index)=>level.difficulty=index<2?'简单':index<5?'中等':'特困难');
LEVELS.push(...EXTRA_LEVELS.map(level=>({...level,tags:[level.difficulty,level.free?'自由排序':'固定顺序']})));
export const LEGACY_LEVEL_IDS=Array.from({length:15},(_,i)=>`P${String(i+1).padStart(3,'0')}`);
LEVELS.push(...[
  {"id":"P016","width":6,"height":8,"rows":["...#.#","#..###"],"pieces":["S","L","T"],"free":true,"title":"台阶铺垫","difficulty":"中等","goal":"自行安排出场顺序，观察铺垫与消行后的布局，用完全部方块并清空棋盘。"},
  {"id":"P017","width":6,"height":8,"rows":["#.....","#.....","##.#.#"],"pieces":["S","T","I"],"free":false,"title":"折角换位","difficulty":"中等","goal":"按给定顺序出场，观察铺垫与消行后的布局，用完全部方块并清空棋盘。"},
  {"id":"P018","width":6,"height":8,"rows":[".....#","....##","...###"],"pieces":["L","S","T"],"free":true,"title":"双向接力","difficulty":"中等","goal":"自行安排出场顺序，观察铺垫与消行后的布局，用完全部方块并清空棋盘。"},
  {"id":"P019","width":6,"height":8,"rows":["..##.."],"pieces":["L","S","L","O"],"free":false,"title":"错落成行","difficulty":"中等","goal":"按给定顺序出场，观察铺垫与消行后的布局，用完全部方块并清空棋盘。"},
  {"id":"P020","width":6,"height":8,"rows":["#.....","#....."],"pieces":["O","T","T","L"],"free":true,"title":"四块衔接","difficulty":"中等","goal":"自行安排出场顺序，观察铺垫与消行后的布局，用完全部方块并清空棋盘。"},
  {"id":"P021","width":8,"height":12,"rows":["#.......","##.....#","##.....#","##.#..##"],"pieces":["Z","I","T","I","J"],"free":true,"title":"窄口接龙","difficulty":"困难","goal":"自行安排出场顺序，观察铺垫与消行后的布局，用完全部方块并清空棋盘。"},
  {"id":"P022","width":8,"height":12,"rows":["#.......","#.....#.","##....#.","##.####."],"pieces":["J","L","I","S","I"],"free":false,"title":"交错长桥","difficulty":"困难","goal":"按给定顺序出场，观察铺垫与消行后的布局，用完全部方块并清空棋盘。"},
  {"id":"P023","width":8,"height":12,"rows":["#.......","#.......","#.......","#.#.##.#"],"pieces":["T","Z","S","Z","L","T"],"free":true,"title":"六块连环","difficulty":"困难","goal":"自行安排出场顺序，观察铺垫与消行后的布局，用完全部方块并清空棋盘。"},
  {"id":"P024","width":8,"height":12,"rows":["......#.","......#.","...##.##","#..#####"],"pieces":["J","J","I","O","I","L","I"],"free":true,"title":"七步回环","difficulty":"特困难","goal":"自行安排出场顺序，观察铺垫与消行后的布局，用完全部方块并清空棋盘。"},
  {"id":"P025","width":8,"height":12,"rows":["..#.#...","..#.#...","..#.##.#"],"pieces":["O","L","I","I","T","O","T","I"],"free":false,"title":"八块终章","difficulty":"特困难","goal":"按给定顺序出场，观察铺垫与消行后的布局，用完全部方块并清空棋盘。"}
].map(level=>({...level,tags:[level.difficulty,level.free?'自由排序':'固定顺序']})));
const DIFFICULTY_ORDER=['简单','中等','困难','特困难'];
LEVELS.sort((a,b)=>DIFFICULTY_ORDER.indexOf(a.difficulty)-DIFFICULTY_ORDER.indexOf(b.difficulty));
export function completedLevelIds(saved,legacy=false){
  if(!Array.isArray(saved))return [];
  const ids=legacy?saved.filter(Number.isInteger).map(index=>LEGACY_LEVEL_IDS[index]):saved;
  return [...new Set(ids.filter(id=>LEVELS.some(level=>level.id===id)))];
}
export const LINE_POINTS=[0,100,300,600,1000];
export const CLASSIC_SPEEDS=[0.8,1.2,1.8,2.6,3.6,5,6.5,8,10];
export function classicLevel(game){return game.autoLevel?Math.min(9,game.startLevel+Math.floor(game.score/1000)):game.startLevel;}
function snapshot(game){const {undo,turnStart,transition,flow,...state}=game;return copy({...state,flow:null});}
export function undoLastPiece(game){
  if(game.mode==='shuhang'||!game.undo||game.flow)return false;
  const state=copy(game.undo);
  for(const key of Object.keys(game))delete game[key];
  Object.assign(game,state,{undo:null,turnStart:null,transition:null,flow:null});
  game.status='paused';
  if(game.mode==='classic')game.turnStart=snapshot(game);
  game.message='已撤回上一块，棋盘、库存和分数已恢复。';return true;
}
export const COMMANDS=[
  {id:'MOVE_LEFT',label:'左移',symbol:'←',parameter:true},
  {id:'MOVE_RIGHT',label:'右移',symbol:'→',parameter:true},
  {id:'ROTATE_CCW',label:'逆转 90°',symbol:'↶'},
  {id:'ROTATE_CW',label:'顺转 90°',symbol:'↷'},
  {id:'MOVE_DOWN',label:'下移',symbol:'↓',parameter:true},
  {id:'LAND',label:'落地',symbol:'⇓'},
  {id:'SUBMIT_PIECE',label:'提交当前方块',symbol:'✓'},
  {id:'HARD_DROP',label:'落地并提交',symbol:'⇓'}
];
export const copy=value=>structuredClone(value);
export function cells(piece){
  return piece?piece.matrix.flatMap((row,y)=>row.flatMap((v,x)=>v?[{x:piece.x+x,y:piece.y+y}]:[])):[];
}
function fits(game,piece){
  return cells(piece).every(({x,y})=>x>=0&&x<game.width&&y>=0&&y<game.height&&!game.board[y][x]);
}
export function landingPiece(game,piece){
  if(piece?.type==='PHASE'){
    if(piece.x<0||piece.x>=game.width)return null;
    for(let y=game.height-1;y>=0;y--)if(!game.board[y][piece.x])return {...piece,y};
    return null;
  }
  if(!piece||!fits(game,piece))return null;
  const landing={...piece};
  while(fits(game,{...landing,y:landing.y+1}))landing.y++;
  return landing;
}
function rotate(matrix,clockwise){
  const size=matrix.length;
  return matrix.map((row,y)=>row.map((_,x)=>clockwise?matrix[size-1-x][y]:matrix[x][size-1-y]));
}
export function rotationTrace(game,piece,clockwise=true){
  if(isTool(piece.type))return {attempts:[],piece,ok:false};
  const matrix=rotate(piece.matrix,clockwise),attempts=[];
  for(const offset of [0,-1,1,-2,2]){
    const candidate={...piece,matrix,x:piece.x+offset};
    const blocked=cells(candidate).filter(({x,y})=>x<0||x>=game.width||y<0||y>=game.height||!!game.board[y][x]);
    attempts.push({offset,piece:candidate,blocked,ok:blocked.length===0});
    if(!blocked.length)break;
  }
  return {attempts,piece:attempts.at(-1).ok?attempts.at(-1).piece:piece,ok:attempts.at(-1).ok};
}
function shuffledBag(){
  const bag=Object.keys(SHAPES);
  for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
  return bag;
}
function spawn(game,type,id){
  game.generation++;
  game.active={type,id,matrix:copy(shapeMatrix(type)),x:Math.floor((game.width-shapeMatrix(type).length)/2),y:0};
  game.gravity=0;
  if(!isTool(type)&&!fits(game,game.active)){game.status='lost';game.active=null;game.message='出生位置被挡住了，换个方案再试。';}
}
function spawnNext(game){
  if(game.mode==='shuhang')return;
  if(game.mode!=='puzzle'){
    while(game.queue.length<7)game.queue.push(...shuffledBag());
    spawn(game,game.queue.shift(),`E${++game.serial}`);
  }else if(!LEVELS[game.levelIndex].free){
    const piece=game.pool.find(p=>!p.used);
    if(piece)spawn(game,piece.type,piece.id);
  }
}
export function inventory(game){
  return Object.keys(SHAPES).filter(type=>game.pool.some(p=>p.type===type)).map(type=>({
    type,count:game.pool.filter(p=>p.type===type&&!p.used).length
  }));
}
export function createGame(options={}){
  const mode=options.mode??'puzzle',levelIndex=options.levelIndex??0,level=LEVELS[levelIndex];
  const width=mode==='puzzle'?(level.width??6):10,height=mode==='puzzle'?(level.height??8):20;
  const game={mode,levelIndex,width,height,board:Array.from({length:height},()=>Array(width).fill(null)),
    status:mode==='classic'?'playing':'paused',fallMode:mode==='classic'?'automatic':['puzzle','shuhang'].includes(mode)?'manual':options.fallMode??'manual',speed:options.speed??1,
    startLevel:Math.max(1,Math.min(9,Math.trunc(options.startLevel||1))),autoLevel:options.autoLevel??true,undo:null,turnStart:null,
    difficulty:['easy','medium','hard'].includes(options.difficulty)?options.difficulty:'easy',layer:1,clearedLayers:0,batch:null,
    tools:mode==='puzzle'?null:{PHASE:1,BOMB:1,rewarded:0,pending:0,next:0},
    active:null,pool:[],queue:[],held:null,holdUsed:false,score:0,lines:0,moves:0,elapsed:0,
    gravity:0,generation:0,serial:0,flow:null,lastFlow:null,message:'先编排，点击运行后才执行。'};
  if(mode==='puzzle'){
    level.rows.forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='#')game.board[height-level.rows.length+y][x]='fixed';}));
    game.pool=level.pieces.map((type,i)=>({type,id:`${type}#${i+1}`,used:false}));
  }
  if(mode==='shuhang')dealBatch(game);else spawnNext(game);if(mode==='classic'){game.speed=CLASSIC_SPEEDS[classicLevel(game)-1];game.turnStart=snapshot(game);}return game;
}
function awardTools(game){
  if(!game.tools)return;
  const earned=Math.floor(game.score/TOOL_REWARD_SCORE);
  game.tools.pending+=Math.max(0,earned-game.tools.rewarded);
  game.tools.rewarded=Math.max(game.tools.rewarded,earned);
  while(game.tools.pending>0&&game.tools.PHASE+game.tools.BOMB<TOOL_CAPACITY){
    game.tools[TOOL_TYPES[game.tools.next%TOOL_TYPES.length]]++;
    game.tools.next++;game.tools.pending--;
  }
}
export function useTool(game,type,pieceId){
  if(!game.tools||!isTool(type))return {ok:false,message:'此模式不提供该道具。'};
  if(game.flow||game.batch||['won','lost'].includes(game.status))return {ok:false,message:'当前不能替换方块，请等待本轮结束。'};
  if(game.tools[type]<1)return {ok:false,message:'这个道具已用完。'};
  const candidate=game.mode==='shuhang'?game.pool.find(p=>p.id===pieceId&&!p.used):game.active;
  if(!candidate)return {ok:false,message:game.mode==='shuhang'?'先选中一个本层候选方块。':'当前没有可替换的方块。'};
  game.tools[type]--;awardTools(game);
  game.undo=null;game.turnStart=null;game.transition=null;game.lastFlow=null;game.gravity=0;
  if(game.mode==='shuhang')candidate.type=type;
  else{
    spawn(game,type,candidate.id);
    game.turnStart=snapshot(game);
    if(type==='BOMB'&&!fits(game,game.active)){game.active.detonated=true;commit(game);}
  }
  game.message=`已消耗${toolName(type)}，原方块已替换。`;
  return {ok:true,message:game.message};
}
function phasePosition(game,piece){
  if(!game.board[piece.y]?.[piece.x]&&piece.y>=0&&piece.y<game.height)return piece;
  for(let y=piece.y+1;y<game.height;y++)if(!game.board[y][piece.x])return {...piece,y};
  for(let y=Math.min(piece.y-1,game.height-1);y>=0;y--)if(!game.board[y][piece.x])return {...piece,y};
  return null;
}
export function blastCells(game,piece){
  const area=[];
  for(let y=Math.max(0,piece.y-1);y<=Math.min(game.height-1,piece.y+1);y++)
    for(let x=Math.max(0,piece.x-1);x<=Math.min(game.width-1,piece.x+1);x++)area.push({x,y});
  return area;
}
function commit(game){
  let piece=game.active;if(!piece)return;
  if(piece.type==='PHASE'){
    piece=phasePosition(game,piece);
    if(!piece){game.status='lost';game.active=null;game.message='这一列没有空格，穿墙单格无法固定。';return;}
    game.active=piece;
  }
  game.undo=game.mode==='shuhang'?null:game.turnStart;
  let explosion=null;
  if(piece.type==='BOMB'){
    if(!piece.detonated){const landing=landingPiece(game,piece);if(landing)piece=landing;}
    const area=blastCells(game,piece),before=copy(game.board);
    for(const {x,y} of area)game.board[y][x]=null;
    explosion={kind:'explosion',area,board:before,piece:copy(piece),rows:[]};
  }else for(const {x,y} of cells(piece))game.board[y][x]=piece.type;
  const used=game.pool.find(p=>p.id===piece.id);if(used)used.used=true;
  const kept=game.board.filter(row=>row.some(v=>!v)),cleared=game.height-kept.length;
  game.transition=explosion??{piece:copy(piece),board:copy(game.board),rows:game.board.flatMap((row,y)=>row.every(Boolean)?[y]:[])};
  game.score+=explosion?0:LINE_POINTS[cleared]??0;awardTools(game);
  if(game.mode==='classic')game.speed=CLASSIC_SPEEDS[classicLevel(game)-1];
  game.lines+=cleared;
  game.board=[...Array.from({length:cleared},()=>Array(game.width).fill(null)),...kept];
  game.active=null;game.generation++;game.holdUsed=false;
  game.message=explosion?'炸弹引爆，清除周围 3×3 范围。':cleared?`消除 ${cleared} 行。`:'方块已固定在当前位置。';
  if(game.mode==='puzzle'&&game.pool.every(p=>p.used)){
    game.status=game.board.every(row=>row.every(v=>!v))?'won':'lost';
    game.message=game.status==='won'?'全部方块已用完，棋盘全部清空！':'方块已用完，棋盘还没清空。换个方案再试。';
  }else spawnNext(game);
  if(game.mode==='classic')game.turnStart=snapshot(game);
}
function endFlow(game,reason,commitActive=true){
  const flow=game.flow;if(!flow)return;
  const owned=!!game.active&&game.active.id===flow.pieceId;
  if(commitActive&&owned)commit(game);
  if(commitActive&&owned&&game.transition?.kind==='explosion')reason='explosion';
  if(!['won','lost'].includes(game.status))game.status='paused';
  const messages={submit:'当前方块已提交。',explosion:'炸弹碰撞引爆，后续步骤已终止。',complete:'流程执行完毕，方块已固定；流程已清空。',downBlocked:'下方受阻，剩余步骤已终止，方块已固定。',sideBlocked:'接地后横移受阻，剩余步骤已终止，方块已固定。',hardDrop:'已落地提交；流程已清空。',gravity:'自动下落遇阻，剩余步骤已终止。',hold:'已暂存交换；流程已清空。',invalid:`${flow.logs.at(-1)?.message??'指令无法执行。'} 本轮流程已终止。`,stale:'方块已更换，旧流程已终止。'};
  const message=game.status==='won'?game.message:game.status==='lost'?`${messages[reason]??'本轮已结束。'} ${game.message}`:messages[reason]??reason;
  game.lastFlow={reason,executed:flow.cursor,logs:copy(flow.logs),message};
  game.flow=null;game.gravity=0;game.message=message;
}
export function validatePlan(steps){
  if(!Array.isArray(steps)||!steps.length)return {ok:false,message:'请先添加指令。'};
  if(steps.length>60)return {ok:false,message:'一轮流程最多 60 步。'};
  for(const step of steps){
    if(!step||typeof step.id!=='string'||step.params!==undefined&&(!step.params||typeof step.params!=='object'||Array.isArray(step.params)))return {ok:false,message:'指令格式无效。'};
    if(['MOVE_LEFT','MOVE_RIGHT','MOVE_DOWN'].includes(step.id)){
      const count=step.params?.cells??1,max=step.id==='MOVE_DOWN'?20:9;
      if(!Number.isInteger(count)||count<1||count>max)return {ok:false,message:`格数须为 1–${max} 的整数。`};
    }else if(step.id==='SELECT_PIECE'){
      if(!SHAPES[step.params?.type])return {ok:false,message:'请选择有效的方块形状。'};
    }else if(!['ROTATE_CW','ROTATE_CCW','LAND','SUBMIT_PIECE','HARD_DROP','HOLD'].includes(step.id))return {ok:false,message:'没有这个预制指令。'};
  }
  return {ok:true,message:'执行时判断碰撞，不提前展示结果。'};
}
export function startFlow(game,steps){
  if(game.mode==='classic')return {ok:false,message:'常规模式直接操作，不使用流程。'};
  if(game.mode==='shuhang'&&!game.batch)return {ok:false,message:'请完整安排本层全部方块后整批提交。'};
  if(game.flow)return {ok:false,message:'本轮流程尚未完成，请继续运行。'};
  if(['won','lost'].includes(game.status))return {ok:false,message:'请先重开或进入下一关。'};
  const check=validatePlan(steps);if(!check.ok)return check;
  game.turnStart=game.mode==='shuhang'?null:snapshot(game);
  game.flow={steps:copy(steps),cursor:0,pieceId:game.active?.id??null,logs:[],status:'running'};
  game.status='playing';game.gravity=0;return {ok:true,message:'开始运行流程'};
}
export function pauseFlow(game){
  if(game.flow){game.flow.status='paused';game.status='paused';}
}
export function resumeFlow(game){
  if(game.flow&&game.status==='paused'){game.flow.status='running';game.status='playing';game.gravity=0;return true;}
  return false;
}
export function dispatch(game,command){
  let {id,params={}}=command;
  if(id==='SET_FALL_MODE'||id==='SET_FALL_SPEED'){
    if(game.mode!=='endless')return {ok:false,message:'此模式的下落方式固定。'};
    if(game.flow)return {ok:false,message:'本轮流程完成后再修改设置。'};
    if(id==='SET_FALL_MODE'){
      if(!['automatic','manual'].includes(params.mode))return {ok:false,message:'下落方式无效。'};
      game.fallMode=params.mode;
    }else{
      if(!Number.isFinite(params.speed)||params.speed<0.1||params.speed>10)return {ok:false,message:'速度须为每秒 0.1–10 格。'};
      game.speed=Math.round(params.speed*10)/10;
    }
    game.gravity=0;return {ok:true,message:'下落设置已更新'};
  }
  if(game.status!=='playing'||!game.flow)return {ok:false,message:'只能通过运行流程执行指令。'};
  if(game.mode==='shuhang'&&!['MOVE_LEFT','MOVE_RIGHT','ROTATE_CW','ROTATE_CCW','LAND','HARD_DROP'].includes(id))return {ok:false,message:'舒航模式仅执行左右移动、旋转及自动落地。'};
  if(id==='SELECT_PIECE'){
    if(game.mode!=='puzzle'||!LEVELS[game.levelIndex].free)return {ok:false,message:'本关使用固定顺序。'};
    if(game.active)return {ok:false,message:'一轮流程只操作一个方块。'};
    const piece=game.pool.find(p=>p.type===params.type&&!p.used);
    if(!piece)return {ok:false,message:`${params.type} 方块已经用完。`};
    spawn(game,piece.type,piece.id);game.flow.pieceId=piece.id;
    if(game.turnStart)game.turnStart.active=copy(game.active);
    return {ok:game.status!=='lost',message:`选择 ${piece.type} 方块`};
  }
  if(!game.active)return {ok:false,message:'本轮需要先选择一个形状。'};
  if(game.flow.pieceId!==game.active.id)return {ok:false,reason:'stale',message:'方块已更换。'};
  if(id==='SUBMIT_PIECE'){game.moves++;return {ok:true,terminal:true,reason:'submit',message:'提交当前方块。'};}
  if(isTool(game.active.type))return toolAction(game,command);
  if(id==='LAND'){
    const distance=landingPiece(game,game.active).y-game.active.y;
    // Resolve at execution time, after preceding moves/rotations. Exact contact
    // does not lock; normal flow completion or the next gravity collision does.
    if(!distance){game.moves++;return {ok:true,message:'下移 0 格，已在落点。'};}
    id='MOVE_DOWN';params={cells:distance};
  }
  if(id==='HOLD'){
    if(game.mode!=='endless'||game.holdUsed)return {ok:false,message:'当前不能暂存。'};
    const type=game.active.type,held=game.held;game.held=type;
    if(held)spawn(game,held,`E${++game.serial}`);else spawnNext(game);
    game.holdUsed=true;game.moves++;
    return {ok:true,terminal:true,reason:'hold',commit:false,message:'暂存交换，结束本轮'};
  }
  if(id==='HARD_DROP'){
    while(fits(game,{...game.active,y:game.active.y+1}))game.active.y++;

    game.moves++;return {ok:true,terminal:true,reason:'hardDrop',message:'落地并提交'};
  }
  if(['MOVE_LEFT','MOVE_RIGHT','MOVE_DOWN'].includes(id)){
    const count=params.cells??1,max=id==='MOVE_DOWN'?20:9;
    if(!Number.isInteger(count)||count<1||count>max)return {ok:false,message:`格数须为 1–${max} 的整数。`};
    const dx=id==='MOVE_LEFT'?-1:id==='MOVE_RIGHT'?1:0,dy=id==='MOVE_DOWN'?1:0;
    const candidate=copy(game.active);let moved=0;
    while(moved<count&&fits(game,{...candidate,x:candidate.x+dx,y:candidate.y+dy})){candidate.x+=dx;candidate.y+=dy;moved++;}
    game.moves++;
    if(dx&&moved<count){
      if(!['classic','shuhang'].includes(game.mode)&&!fits(game,{...game.active,y:game.active.y+1}))return {ok:true,terminal:true,reason:'sideBlocked',message:'接地后左右受阻，终止流程。'};
      return {ok:true,skipped:true,message:game.mode==='classic'?'左右受阻，方块保持原位。':'左右受阻，本步不生效，继续下一步。'};
    }
    game.active=candidate;

    if(dy&&moved<count)return {ok:true,terminal:true,reason:'downBlocked',message:`下移 ${moved} 格后受阻，终止流程。`};
    return {ok:true,message:`${dx<0?'左移':dx>0?'右移':'下移'} ${moved} 格`};
  }
  if(id==='ROTATE_CW'||id==='ROTATE_CCW'){
    const trace=rotationTrace(game,game.active,id==='ROTATE_CW');game.moves++;
    if(trace.ok){game.active=trace.piece;return {ok:true,message:id==='ROTATE_CW'?'顺转 90°':'逆转 90°'};}
    return {ok:true,skipped:true,message:game.mode==='classic'?'旋转受阻，方块保持原位。':'旋转受阻，本步不生效，继续下一步。'};
  }
  return {ok:false,message:'没有这个预制指令。'};
}
function toolAction(game,command){
  const piece=game.active,{id,params={}}=command;
  const detonate=()=>{piece.detonated=true;return {ok:true,terminal:true,reason:'explosion',message:'碰撞引爆炸弹！'};};
  if(piece.type==='BOMB'&&!fits(game,piece))return detonate();
  if(id.startsWith('ROTATE'))return {ok:true,skipped:true,message:'单格道具无需旋转。'};
  if(id==='HARD_DROP'||id==='LAND'){
    game.moves++;
    const landing=landingPiece(game,piece);
    if(landing)Object.assign(piece,landing);
    if(id==='LAND'&&piece.type==='PHASE'&&landing)return {ok:true,message:'穿墙单格落入本列最低空格，继续正常流程。'};
    return piece.type==='BOMB'?detonate():{ok:true,terminal:true,reason:'hardDrop',message:'穿墙单格落入本列最低空格。'};
  }
  if(!['MOVE_LEFT','MOVE_RIGHT','MOVE_DOWN'].includes(id))return {ok:false,message:'道具只能左右移动、下移或落地。'};
  const count=params.cells??1,max=id==='MOVE_DOWN'?20:9;
  if(!Number.isInteger(count)||count<1||count>max)return {ok:false,message:`格数须为 1–${max} 的整数。`};
  const dx=id==='MOVE_LEFT'?-1:id==='MOVE_RIGHT'?1:0,dy=id==='MOVE_DOWN'?1:0;
  game.moves++;
  if(piece.type==='PHASE'&&dx&&(piece.x+dx*count<0||piece.x+dx*count>=game.width))return {ok:true,skipped:true,message:'已到棋盘边界，本次横移不生效。'};
  for(let step=0;step<count;step++){
    const next={...piece,x:piece.x+dx,y:piece.y+dy};
    const inside=next.x>=0&&next.x<game.width&&next.y>=0&&next.y<game.height;
    if(!inside||piece.type==='BOMB'&&!fits(game,next)){
      if(piece.type==='BOMB')return detonate();
      return dy?{ok:true,terminal:true,reason:'downBlocked',message:'穿墙单格到达底边。'}:{ok:true,skipped:true,message:'已到棋盘边界。'};
    }
    piece.x=next.x;piece.y=next.y;
  }
  return {ok:true,message:`${toolName(piece.type)}${dx<0?'左移':dx>0?'右移':'下移'} ${count} 格`};
}
function gravityFits(game,piece){
  if(piece.type==='PHASE')return piece.y+1<game.height;
  return fits(game,{...piece,y:piece.y+1});
}
export function stepFlow(game){
  const flow=game.flow;
  if(!flow||flow.status!=='running'||game.status!=='playing')return {ok:false,message:'流程未运行。'};
  const command=flow.steps[flow.cursor],result=dispatch(game,command);
  flow.cursor++;flow.logs.push({id:command.id,...result});
  if(!result.ok)endFlow(game,result.reason??'invalid',false);
  else if(result.terminal)endFlow(game,result.reason,result.commit!==false);
  else if(flow.cursor>=flow.steps.length)endFlow(game,'complete');
  return {...result,finished:!game.flow};
}
export function classicAction(game,command){
  if(game.mode!=='classic'||game.status!=='playing')return {ok:false,message:'请先继续游戏。'};
  if(!['MOVE_LEFT','MOVE_RIGHT','MOVE_DOWN','ROTATE_CW','ROTATE_CCW','LAND','SUBMIT_PIECE','HARD_DROP'].includes(command.id))return {ok:false,message:'常规模式不使用流程。'};
  game.transition=null;
  game.flow={pieceId:game.active?.id};
  const result=dispatch(game,command);game.flow=null;
  if(result.terminal)commit(game);
  if(!game.transition)game.message=result.message;return result;
}
export function advance(game,seconds){
  if(game.mode==='classic'){
    if(game.status!=='playing')return;
    game.elapsed+=seconds;game.gravity+=seconds;
    const interval=1/game.speed;
    while(game.gravity>=interval&&game.active){
      game.gravity-=interval;
      if(gravityFits(game,game.active))game.active.y++;
      else{game.transition=null;if(game.active.type==='BOMB')game.active.detonated=true;commit(game);break;}
    }
    return;
  }
  if(game.status!=='playing'||game.flow?.status!=='running')return;
  game.elapsed+=seconds;
  if(game.fallMode!=='automatic'||!game.active)return;
  game.gravity+=seconds;const interval=1/game.speed;
  while(game.gravity>=interval&&game.active&&game.flow){
    if(!gravityFits(game,game.active)){if(game.active.type==='BOMB')game.active.detonated=true;endFlow(game,game.active.type==='BOMB'?'explosion':'gravity');break;}
    game.active.y++;game.gravity-=interval;
  }
}


export const BATCH_SIZES={easy:3,medium:4,hard:5};
const BATCH_ACTIONS=['MOVE_LEFT','MOVE_RIGHT','ROTATE_CW','ROTATE_CCW','LAND','HARD_DROP'];
function dealBatch(game){
  const count=BATCH_SIZES[game.difficulty];
  while(game.queue.length<count)game.queue.push(...shuffledBag());
  game.pool=game.queue.splice(0,count).map(type=>({type,id:`B${game.layer}-${++game.serial}`,used:false}));
  game.active=null;game.flow=null;game.batch=null;game.status='paused';game.undo=null;
  game.message=`第 ${game.layer} 层：安排全部 ${count} 块，再整批提交。`;
}
function beginBatchPiece(game){
  const item=game.batch.items[game.batch.cursor],piece=game.pool.find(p=>p.id===item.pieceId);
  spawn(game,piece.type,piece.id);
  if(game.status==='lost'){game.batch=null;return;}
  startFlow(game,[...item.steps,{id:'HARD_DROP'}]);
}
export function startBatch(game,items){
  if(game.mode!=='shuhang')return {ok:false,message:'此模式不使用整批提交。'};
  if(game.batch||game.flow)return {ok:false,message:'本层正在执行，不能修改方案。'};
  if(game.status==='lost')return {ok:false,message:'本局已结束，请重新开始。'};
  if(!Array.isArray(items)||items.length!==game.pool.length)return {ok:false,message:'必须安排本层全部方块。'};
  const ids=new Set();
  for(const item of items){
    if(!item||!game.pool.some(p=>p.id===item.pieceId&&!p.used)||ids.has(item.pieceId))return {ok:false,message:'每个候选方块必须且只能使用一次。'};
    ids.add(item.pieceId);
    if(!Array.isArray(item.steps)||item.steps.length>59)return {ok:false,message:'每个方块最多编排 59 步。'};
    if(item.steps.some(step=>!step||!BATCH_ACTIONS.includes(step.id)))return {ok:false,message:'舒航模式只能编排左右移动和旋转。'};
    const check=validatePlan([...item.steps,{id:'HARD_DROP'}]);if(!check.ok)return check;
  }
  game.batch={items:copy(items),cursor:0};game.status='playing';beginBatchPiece(game);
  return {ok:true,message:game.status==='lost'?game.message:'本层方案已锁定，开始整批执行。'};
}
export function stepBatch(game){
  if(game.mode!=='shuhang'||!game.batch||!game.flow||game.status!=='playing')return {ok:false,message:'本层未运行。'};
  const result=stepFlow(game);
  if(!game.flow){
    if(game.status==='lost'||!result.ok){game.batch=null;return result;}
    game.batch.cursor++;
    if(game.batch.cursor===game.batch.items.length){
      game.clearedLayers++;game.layer++;dealBatch(game);
    }else{game.status='playing';beginBatchPiece(game);}
  }
  return {...result,finished:!game.batch};
}

