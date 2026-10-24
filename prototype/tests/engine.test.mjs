import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,SHAPES,createGame,copy,cells,landingPiece,startFlow,stepFlow,pauseFlow,resumeFlow,dispatch,advance,inventory,validatePlan} from '../engine.mjs';
import {buildScenario} from '../rotation-demo.mjs';
import {clearVolume} from '../audio.mjs';
import {LEVEL_SOLUTIONS} from './level-solutions.mjs';
const a=(id,params)=>({id,params}),move=(id,cells)=>a(id,{cells}),select=type=>a('SELECT_PIECE',{type});
const drop=a('HARD_DROP');
test('all 70 rotation demonstrations use legal starts and match actual command execution',()=>{
  for(const type of Object.keys(SHAPES))for(const clockwise of [true,false])for(const kind of ['empty','left','right','obstacle','blocked']){
    const example=buildScenario(type,kind,clockwise),{piece,trace}=example,game={...example.game,active:copy(piece),moves:0,status:'playing',flow:{pieceId:'demo'}};
    assert.ok(cells(piece).every(({x,y})=>x>=0&&x<10&&y>=0&&y<10&&!game.board[y][x]));
    const result=dispatch(game,a(clockwise?'ROTATE_CW':'ROTATE_CCW'));
    assert.equal(result.skipped??false,!trace.ok);assert.deepEqual(game.active,trace.piece);
    assert.deepEqual(trace.attempts.map(attempt=>attempt.offset),[0,-1,1,-2,2].slice(0,trace.attempts.length));
    if(type!=='O'&&kind==='blocked')assert.equal(trace.ok,false);
    if(type!=='O'&&['left','right','obstacle'].includes(kind))assert.ok(trace.ok&&trace.attempts.length>1);
    if(type==='O')assert.deepEqual(trace.piece,piece);
  }
});
test('clear transition retains full rows for animation while final game is settled once',()=>{
  const game=createGame({levelIndex:1});run(game,[drop]);
  assert.equal(game.transition.rows.length,2);assert.equal(game.lines,2);assert.equal(game.status,'won');
  assert.ok(game.transition.rows.every(y=>game.transition.board[y].every(Boolean)));
  assert.ok(game.board.flat().every(value=>!value));
  const before=copy(game);stepFlow(game);assert.deepEqual(game,before);
});
test('clear sound volume increases for one through four lines within the limit',()=>{
  const volumes=[1,2,3,4].map(clearVolume);assert.ok(volumes.every((v,i)=>i===0||v>volumes[i-1]));assert.ok(volumes.at(-1)<=.3);
});
function run(game,steps){
  const result=startFlow(game,steps);assert.equal(result.ok,true,result.message);
  while(game.flow){const next=stepFlow(game);assert.equal(next.ok,true,next.message);}
  return game.lastFlow;
}
function endlessFixture(){
  const game=createGame({mode:'endless'});
  game.active={type:'O',id:game.active.id,matrix:copy(SHAPES.O),x:4,y:0};
  return game;
}
test('landing shadow stops at the first obstruction without changing the game',()=>{
  const game=endlessFixture();
  game.board[7][4]='fixed';
  const before=copy(game);
  const landing=landingPiece(game,game.active);
  assert.equal(landing.y,5);
  assert.equal(landingPiece(game,{...game.active,y:7}),null);
  assert.deepEqual(game,before);
});
for(let index=0;index<LEVELS.length;index++)test(`${LEVELS[index].id}: all pieces used and cleared through real flows`,()=>{
  const game=createGame({levelIndex:index});
  for(const steps of LEVEL_SOLUTIONS[index]){
    run(game,steps);assert.equal(game.flow,null);
    assert.ok(game.lastFlow.logs.every(log=>!log.skipped));
  }
  assert.equal(game.status,'won');assert.ok(game.pool.every(p=>p.used));assert.ok(game.board.flat().every(v=>!v));
});
test('planning never executes commands or advances gravity',()=>{
  const game=endlessFixture(),before=copy(game);
  assert.equal(dispatch(game,move('MOVE_LEFT',1)).ok,false);
  validatePlan([move('MOVE_LEFT',9),drop]);advance(game,60);
  assert.deepEqual(game,before);
});
test('left collision cancels the whole move and continues the flow',()=>{
  const game=endlessFixture();game.board[0][2]='fixed';
  run(game,[move('MOVE_LEFT',3),move('MOVE_DOWN',2)]);
  assert.equal(game.lastFlow.executed,2);assert.equal(game.lastFlow.logs[0].skipped,true);
  assert.equal(game.board[2][4],'O');assert.equal(game.board[2][3],null);
});
test('right collision cannot tunnel through obstacles',()=>{
  const game=endlessFixture();game.board[0][7]='fixed';
  run(game,[move('MOVE_RIGHT',3),move('MOVE_DOWN',2)]);
  assert.equal(game.lastFlow.logs[0].skipped,true);assert.equal(game.board[2][4],'O');
});
test('down collision stops at the last legal cell and discards the tail',()=>{
  const game=endlessFixture();game.board[5][4]='fixed';game.board[5][5]='fixed';
  run(game,[move('MOVE_DOWN',20),move('MOVE_LEFT',1),drop]);
  assert.equal(game.lastFlow.reason,'downBlocked');assert.equal(game.lastFlow.executed,1);
  assert.equal(game.board[3][4],'O');assert.equal(game.board[4][4],'O');assert.equal(game.board[3][3],null);
});
test('exact-count downward contact allows a sideways escape and another descent',()=>{
  const game=endlessFixture();game.board[5][4]='fixed';game.board[8][5]='fixed';
  run(game,[move('MOVE_DOWN',3),move('MOVE_RIGHT',1),move('MOVE_DOWN',3),move('MOVE_DOWN',1)]);
  assert.equal(game.lastFlow.reason,'downBlocked');assert.equal(game.lastFlow.executed,4);
  assert.equal(game.board[6][5],'O');assert.equal(game.board[7][6],'O');
  assert.equal(game.lastFlow.logs[0].terminal,undefined);
  assert.equal(game.lastFlow.logs[2].terminal,undefined);
});
test('downward contact followed by a blocked move ends at the contact position',()=>{
  const game=endlessFixture();game.board[5][4]='fixed';
  run(game,[move('MOVE_DOWN',3),move('MOVE_DOWN',1),move('MOVE_RIGHT',1)]);
  assert.equal(game.lastFlow.reason,'downBlocked');assert.equal(game.lastFlow.executed,2);
  assert.equal(game.board[3][4],'O');
});
test('sideways collision on contact ends the flow, including a wall',()=>{
  const obstacle=endlessFixture();obstacle.board[5][4]='fixed';obstacle.board[3][3]='fixed';
  run(obstacle,[move('MOVE_DOWN',3),move('MOVE_LEFT',1),move('MOVE_RIGHT',1)]);
  assert.equal(obstacle.lastFlow.reason,'sideBlocked');assert.equal(obstacle.lastFlow.executed,2);
  assert.equal(obstacle.board[3][4],'O');
  const wall=endlessFixture();wall.active.x=0;wall.active.y=18;
  run(wall,[move('MOVE_LEFT',1),move('MOVE_RIGHT',1)]);
  assert.equal(wall.lastFlow.reason,'sideBlocked');assert.equal(wall.lastFlow.executed,1);
});
test('normal completion fixes a floating piece and spawns exactly one next piece',()=>{
  const game=endlessFixture(),id=game.active.id,serial=game.serial;
  run(game,[move('MOVE_DOWN',3)]);
  assert.equal(game.board[3][4],'O');assert.equal(game.board[4][4],'O');
  assert.equal(game.board[5][4],null);assert.notEqual(game.active.id,id);assert.equal(game.serial,serial+1);
  const before=copy(game);advance(game,60);assert.deepEqual(game,before);
});
test('hard drop terminates the flow without freezing the new spawn',()=>{
  const game=endlessFixture(),serial=game.serial;
  run(game,[drop,move('MOVE_LEFT',2)]);
  assert.equal(game.lastFlow.reason,'hardDrop');assert.equal(game.lastFlow.executed,1);
  assert.equal(game.serial,serial+1);assert.equal(game.board.flat().filter(Boolean).length,4);
});
test('failed rotation is skipped and later steps still execute',()=>{
  const game=endlessFixture();game.active.type='T';game.active.matrix=copy(SHAPES.T);game.active.x=3;
  game.board[2]=Array(10).fill('fixed');
  run(game,[a('ROTATE_CW'),move('MOVE_RIGHT',1)]);
  assert.equal(game.lastFlow.logs[0].skipped,true);assert.equal(game.lastFlow.executed,2);
});
test('inventory groups duplicate shapes and only decreases on commit',()=>{
  const game=createGame({levelIndex:5});
  assert.equal(inventory(game).find(p=>p.type==='T').count,2);
  const before=copy(game);validatePlan([select('T'),move('MOVE_LEFT',2),move('MOVE_DOWN',3)]);
  assert.deepEqual(game,before);
  run(game,[select('T'),move('MOVE_LEFT',2),move('MOVE_DOWN',3)]);
  assert.equal(inventory(game).find(p=>p.type==='T').count,1);
});
test('fixed-order levels reject manual shape selection',()=>{
  const game=createGame({levelIndex:6}),id=game.active.id;
  startFlow(game,[select('O')]);const result=stepFlow(game);
  assert.equal(result.ok,false);assert.equal(game.active.id,id);assert.ok(game.pool.every(p=>!p.used));
});
test('empty board with unused pieces is not an early win',()=>{
  const game=createGame({levelIndex:1});
  game.width=4;game.board=Array.from({length:8},()=>Array(4).fill(null));
  game.pool=[{type:'I',id:'I#1',used:false},{type:'I',id:'I#2',used:false}];
  game.active={type:'I',id:'I#1',matrix:copy(SHAPES.I),x:0,y:0};
  run(game,[drop]);assert.ok(game.board.flat().every(v=>!v));assert.equal(game.status,'paused');
  run(game,[drop]);assert.equal(game.status,'won');
});
test('pause freezes an in-flight flow and resume does not replay steps',()=>{
  const game=endlessFixture();startFlow(game,[move('MOVE_LEFT',1),move('MOVE_DOWN',2)]);
  stepFlow(game);pauseFlow(game);const before=copy(game);advance(game,20);stepFlow(game);assert.deepEqual(game,before);
  assert.equal(resumeFlow(game),true);stepFlow(game);assert.equal(game.moves,2);assert.equal(game.board[2][3],'O');
});
test('the flow owns a copy of its instructions',()=>{
  const game=endlessFixture(),plan=[move('MOVE_DOWN',3)];startFlow(game,plan);
  plan[0].params.cells=20;stepFlow(game);assert.equal(game.board[3][4],'O');
});
test('automatic gravity freezes during planning and terminates on contact',()=>{
  const game=endlessFixture();game.fallMode='automatic';game.speed=2;
  const y=game.active.y;advance(game,20);assert.equal(game.active.y,y);
  startFlow(game,Array.from({length:20},()=>a('ROTATE_CW')));
  advance(game,.5);assert.equal(game.active.y,y+1);
  pauseFlow(game);const before=copy(game);advance(game,20);assert.deepEqual(game,before);
  resumeFlow(game);advance(game,20);assert.equal(game.flow,null);assert.equal(game.lastFlow.reason,'gravity');
});
test('automatic gravity waits for an actual blocked tick and can escape sideways',()=>{
  const game=endlessFixture();game.fallMode='automatic';game.board[5][4]='fixed';
  startFlow(game,[move('MOVE_RIGHT',1),move('MOVE_DOWN',1),drop]);
  advance(game,3);assert.equal(game.active.y,3);assert.ok(game.flow);
  stepFlow(game);assert.equal(game.active.x,5);
  advance(game,1);assert.equal(game.active.y,4);assert.ok(game.flow);
  const blocked=endlessFixture();blocked.fallMode='automatic';blocked.board[5][4]='fixed';
  startFlow(blocked,[drop]);advance(blocked,3);assert.ok(blocked.flow);
  advance(blocked,1);assert.equal(blocked.lastFlow.reason,'gravity');
});
test('gravity settings remain locked in puzzles and during a running flow',()=>{
  const puzzle=createGame({levelIndex:0});assert.equal(dispatch(puzzle,a('SET_FALL_MODE',{mode:'automatic'})).ok,false);
  const game=endlessFixture();assert.equal(dispatch(game,a('SET_FALL_SPEED',{speed:2})).ok,true);
  for(const speed of [0,-1,11,NaN])assert.equal(dispatch(game,a('SET_FALL_SPEED',{speed})).ok,false);
  startFlow(game,[drop]);assert.equal(dispatch(game,a('SET_FALL_SPEED',{speed:4})).ok,false);
});
test('invalid parameters are rejected without simulating the board',()=>{
  const game=endlessFixture(),before=copy(game);
  for(const cells of [0,-1,10,1.5,NaN])assert.equal(startFlow(game,[move('MOVE_LEFT',cells)]).ok,false);
  assert.deepEqual(game,before);
  assert.equal(validatePlan([move('MOVE_LEFT',9)]).ok,true);
});


test('line rewards stay fixed and strongly reward a four-line clear',async()=>{
  const {LINE_POINTS}=await import('../engine.mjs');
  assert.deepEqual(LINE_POINTS,[0,100,300,600,1000]);
  assert.ok(LINE_POINTS[4]>2*LINE_POINTS[2]);
  for(let lines=1;lines<=4;lines++){
    const game=createGame({mode:'endless'});
    game.lines=20;
    game.active={type:'I',id:'score',matrix:[[1],[1],[1],[1]],x:0,y:0};
    for(let y=game.height-lines;y<game.height;y++)game.board[y].fill('fixed',1);
    run(game,[drop]);assert.equal(game.score,LINE_POINTS[lines]);
  }
});
test('undo restores a clear, score, inventory and original spawn, once only',async()=>{
  const {undoLastPiece}=await import('../engine.mjs');
  const game=createGame({levelIndex:1}),before=copy(game);
  run(game,[drop]);assert.equal(game.score,300);
  assert.equal(undoLastPiece(game),true);
  for(const key of ['board','score','lines','moves','pool','queue','active'])assert.deepEqual(game[key],before[key]);
  assert.equal(game.status,'paused');assert.equal(undoLastPiece(game),false);
  run(game,[drop]);assert.equal(game.status,'won');assert.equal(game.score,300);
});
test('undo a free-order selection gives the same piece back ready to plan',async()=>{
  const {undoLastPiece}=await import('../engine.mjs');
  const game=createGame({levelIndex:2});run(game,[select('I'),a('ROTATE_CW'),drop]);
  assert.equal(undoLastPiece(game),true);assert.equal(game.active.type,'I');
  assert.deepEqual(game.active.matrix,SHAPES.I);assert.equal(game.pool.filter(p=>p.used).length,0);
  run(game,[a('ROTATE_CW'),drop]);assert.equal(game.lines,2);
});
test('undo cannot interrupt a flow, and restores an endless queue after a failed spawn',async()=>{
  const {undoLastPiece}=await import('../engine.mjs');
  const game=createGame({mode:'endless'});game.board[0].fill('fixed');game.board[0][0]=null;game.board[1].fill('fixed');game.board[1][0]=null;
  const original=copy(game.active),queue=copy(game.queue);startFlow(game,[drop]);
  assert.equal(undoLastPiece(game),false);while(game.flow)stepFlow(game);
  assert.equal(game.status,'lost');assert.equal(undoLastPiece(game),true);
  assert.deepEqual(game.active,original);assert.deepEqual(game.queue,queue);
});
test('classic actions are immediate and never commit on grounded lateral collision',async()=>{
  const {classicAction}=await import('../engine.mjs');const game=createGame({mode:'classic'});
  game.active={type:'O',id:game.active.id,matrix:copy(SHAPES.O),x:0,y:18};
  const generation=game.generation;
  assert.equal(classicAction(game,move('MOVE_LEFT',1)).skipped,true);
  assert.equal(game.generation,generation);assert.equal(game.active.x,0);assert.equal(game.flow,null);
  classicAction(game,move('MOVE_RIGHT',1));assert.equal(game.active.x,1);
  classicAction(game,drop);assert.equal(game.generation,generation+2);assert.equal(game.flow,null);
});
test('classic gravity, pause, nine levels and score-based acceleration',async()=>{
  const {classicLevel,CLASSIC_SPEEDS,classicAction}=await import('../engine.mjs');
  const game=createGame({mode:'classic',startLevel:2}),y=game.active.y;
  advance(game,1/game.speed);assert.equal(game.active.y,y+1);
  game.status='paused';const before=copy(game);advance(game,20);assert.deepEqual(game,before);
  assert.equal(classicAction(game,drop).ok,false);game.status='playing';
  game.score=7000;assert.equal(classicLevel(game),9);game.score=90000;assert.equal(classicLevel(game),9);
  game.autoLevel=false;assert.equal(classicLevel(game),2);assert.equal(CLASSIC_SPEEDS.length,9);
  for(let i=1;i<9;i++)assert.ok(CLASSIC_SPEEDS[i]>CLASSIC_SPEEDS[i-1]);
});
test('classic undo restores a full turn and pauses for a deliberate retry',async()=>{
  const {classicAction,undoLastPiece}=await import('../engine.mjs');
  const game=createGame({mode:'classic'}),piece=copy(game.active),queue=copy(game.queue);
  classicAction(game,move('MOVE_LEFT',1));advance(game,3);classicAction(game,drop);
  assert.equal(undoLastPiece(game),true);assert.equal(game.status,'paused');
  assert.deepEqual(game.active,piece);assert.deepEqual(game.queue,queue);assert.equal(game.board.flat().some(Boolean),false);
});
test('classic clear actually applies automatic acceleration and manual speed stays fixed',async()=>{
  const {CLASSIC_SPEEDS,classicAction}=await import('../engine.mjs');
  for(const autoLevel of [true,false]){
    const game=createGame({mode:'classic',startLevel:1,autoLevel});game.score=900;
    game.active={type:'I',id:game.active.id,matrix:[[1],[1],[1],[1]],x:0,y:0};
    for(let y=16;y<20;y++)game.board[y].fill('fixed',1);
    classicAction(game,drop);assert.equal(game.score,1900);
    assert.equal(game.speed,CLASSIC_SPEEDS[autoLevel?1:0]);
    assert.equal(game.lines,4);assert.equal(game.status,'playing');
  }
});

// Shuhang uses the same per-piece executor but owns and locks a whole layer.
const batchModule=await import('../engine.mjs');
const {startBatch,stepBatch}=batchModule;
function batchItems(game){return game.pool.map(piece=>({pieceId:piece.id,steps:[]}));}
function finishBatch(game){let count=0;while(game.flow){assert.ok(++count<400);assert.equal(stepBatch(game).ok,true);}return count;}
test('Shuhang deals 3/4/5 individually identified candidates, freezes planning and has no active preview',()=>{
  for(const [difficulty,count] of [['easy',3],['medium',4],['hard',5]]){
    const game=createGame({mode:'shuhang',difficulty});assert.equal(game.pool.length,count);
    assert.equal(new Set(game.pool.map(p=>p.id)).size,count);assert.equal(game.active,null);
    assert.equal(game.layer,1);assert.equal(game.clearedLayers,0);
    const before=copy(game);advance(game,100);assert.deepEqual(game,before);
    assert.equal(startFlow(game,[drop]).ok,false);assert.deepEqual(game,before);
  }
});
test('Shuhang rejects partial, duplicate, unknown and forbidden plans atomically',()=>{
  const game=createGame({mode:'shuhang'}),items=batchItems(game),before=copy(game);
  for(const invalid of [null,[],items.slice(1),[items[0],items[0],items[2]],[{pieceId:'missing',steps:[]},...items.slice(1)]]){
    assert.equal(startBatch(game,invalid).ok,false);assert.deepEqual(game,before);
  }
  for(const command of [drop,a('MOVE_DOWN'),select('I'),a('HOLD'),a('MOVE_LEFT',null),move('MOVE_LEFT',0),move('MOVE_RIGHT',10),move('MOVE_LEFT',1.5)]){
    const invalid=copy(items);invalid[0].steps=[command];assert.equal(startBatch(game,invalid).ok,false);assert.deepEqual(game,before);
  }
});
test('Shuhang drops each selected instance exactly once, scores clears and only then deals the next layer',()=>{
  const game=createGame({mode:'shuhang'});game.pool.forEach(p=>p.type='O');
  for(const y of [18,19])for(const x of [2,3,6,7])game.board[y][x]='fixed';
  const ids=game.pool.map(p=>p.id),items=[{pieceId:ids[2],steps:[move('MOVE_LEFT',4)]},{pieceId:ids[0],steps:[]},{pieceId:ids[1],steps:[move('MOVE_RIGHT',4)]}];
  assert.equal(startBatch(game,items).ok,true);assert.equal(game.active.id,ids[2]);
  const queuedIds=copy(game.batch.items.map(p=>p.pieceId));
  stepBatch(game);assert.equal(game.active.x,0);assert.equal(game.layer,1);
  stepBatch(game);assert.equal(game.pool.filter(p=>p.used).length,1);assert.equal(game.layer,1);assert.equal(game.active.id,ids[0]);
  stepBatch(game);assert.equal(game.pool.filter(p=>p.used).length,2);assert.equal(game.layer,1);
  assert.deepEqual(game.batch.items.map(p=>p.pieceId),queuedIds);
  finishBatch(game);assert.equal(game.layer,2);assert.equal(game.clearedLayers,1);assert.equal(game.score,300);assert.equal(game.lines,2);
  assert.ok(game.board.flat().every(v=>!v));assert.equal(game.pool.length,3);assert.ok(game.pool.every(p=>!ids.includes(p.id)&&!p.used));
  assert.equal(game.active,null);assert.equal(game.batch,null);assert.equal(game.flow,null);assert.equal(game.status,'paused');
});
test('Shuhang preserves occupied cells between layers without requiring an empty board',()=>{
  const game=createGame({mode:'shuhang',difficulty:'hard'});startBatch(game,batchItems(game));finishBatch(game);
  assert.equal(game.layer,2);assert.equal(game.board.flat().filter(Boolean).length,20-game.lines*10);
  const before=copy(game.board);advance(game,100);assert.deepEqual(game.board,before);assert.equal(game.active,null);
});
test('Shuhang owns immutable input, disallows resubmission and resumes a paused batch without editing',()=>{
  const game=createGame({mode:'shuhang'}),items=batchItems(game);items[0].steps=[move('MOVE_LEFT',1)];
  startBatch(game,items);items[0].steps[0].params.cells=9;items.reverse();
  assert.equal(game.batch.items[0].steps[0].params.cells,1);const original=copy(game);
  assert.equal(startBatch(game,batchItems(game)).ok,false);assert.deepEqual(game,original);
  pauseFlow(game);const paused=copy(game);advance(game,10);assert.equal(stepBatch(game).ok,false);assert.deepEqual(game,paused);
  assert.equal(resumeFlow(game),true);finishBatch(game);assert.equal(game.clearedLayers,1);assert.equal(batchModule.undoLastPiece(game),false);
});
test('Shuhang initial overflow stops before consuming any candidate',()=>{
  const game=createGame({mode:'shuhang'});game.pool.forEach(p=>p.type='O');game.board[0][4]='fixed';
  assert.equal(startBatch(game,batchItems(game)).ok,true);assert.equal(game.status,'lost');
  assert.equal(game.flow,null);assert.equal(game.batch,null);assert.ok(game.pool.every(p=>!p.used));
  assert.equal(game.layer,1);assert.equal(game.clearedLayers,0);assert.equal(startBatch(game,batchItems(game)).ok,false);
});
test('Shuhang middle overflow discards the rest of the batch and does not advance the layer',()=>{
  const game=createGame({mode:'shuhang'});game.pool.forEach(p=>p.type='O');
  game.board[2][4]='fixed';game.board[2][5]='fixed';const ids=game.pool.map(p=>p.id);
  startBatch(game,batchItems(game));stepBatch(game);
  assert.equal(game.status,'lost');assert.equal(game.layer,1);assert.equal(game.clearedLayers,0);
  assert.equal(game.pool.find(p=>p.id===ids[0]).used,true);assert.ok(game.pool.slice(1).every(p=>!p.used));
  const before=copy(game);stepBatch(game);assert.deepEqual(game,before);
});

test('Shuhang grounded lateral collision skips only that action before automatic drop',()=>{
  const game=createGame({mode:'shuhang'});game.pool.forEach(p=>p.type='O');
  game.board[0][3]='fixed';game.board[2][4]='fixed';game.board[2][5]='fixed';
  const items=batchItems(game);items[0].steps=[move('MOVE_LEFT',1),move('MOVE_RIGHT',2)];
  startBatch(game,items);const id=game.active.id;
  assert.equal(stepBatch(game).skipped,true);assert.equal(game.active.id,id);assert.equal(game.pool[0].used,false);
  stepBatch(game);assert.equal(game.active.x,6);assert.equal(game.active.y,0);
  stepBatch(game);assert.equal(game.pool[0].used,true);assert.equal(game.board[19][6],'O');
});


test('all puzzle layouts are distinct, including horizontal mirrors',()=>{
  const seen=new Map();
  for(const level of LEVELS){
    const rows=level.rows.slice();while(rows[0]&&[...rows[0]].every(c=>c==='.'))rows.shift();
    const shapeKey=[...level.pieces].sort().join('');
    const geometry=rows.join('/'),mirror=rows.map(r=>[...r].reverse().join('')).join('/');
    // A mirror also swaps handed tetrominoes, so compare both forms with their inventory.
    const mirroredShapes=[...level.pieces].map(t=>({J:'L',L:'J',S:'Z',Z:'S'}[t]??t)).sort().join('');
    const prefix=`${level.width??6}x${level.height??8}:${level.free?'free':'fixed'}:`;
    for(const key of new Set([prefix+geometry+':'+shapeKey,prefix+mirror+':'+mirroredShapes])){
      assert.equal(seen.has(key),false,`${level.id} duplicates ${seen.get(key)}`);seen.set(key,level.id);
    }
  }
});

test('redesigned easy levels introduce two-piece placement and basic rotation',()=>{
  for(const index of [8,9]){
    assert.equal(LEVELS[index].difficulty,'简单');assert.equal(LEVELS[index].pieces.length,2);
    const game=createGame({levelIndex:index});run(game,LEVEL_SOLUTIONS[index][0]);
    assert.notEqual(game.status,'won');assert.equal(game.pool.filter(p=>!p.used).length,1);
  }
  assert.ok(LEVEL_SOLUTIONS[9].flat().some(c=>c.id.startsWith('ROTATE_')));
});

test('redesigned medium solutions need setup turns and do not follow inventory order',()=>{
  for(const index of [10,11,12]){
    const level=LEVELS[index];assert.equal(level.difficulty,'中等');assert.ok(level.pieces.length>=3&&level.pieces.length<=4);
    const game=createGame({levelIndex:index});run(game,LEVEL_SOLUTIONS[index][0]);
    assert.equal(game.lines,0,`${level.id} reference starts with a setup turn`);
    assert.notEqual(game.status,'won');assert.ok(game.board.flat().some(Boolean));
    if(level.free){
      const chosen=LEVEL_SOLUTIONS[index].map(flow=>flow.find(c=>c.id==='SELECT_PIECE').params.type);
      assert.notDeepEqual(chosen,level.pieces);
    }
    const naive=createGame({levelIndex:index});
    for(const type of level.pieces){
      if(naive.status==='lost')break;
      assert.equal(startFlow(naive,[...(level.free?[select(type)]:[]),drop]).ok,true);
      while(naive.flow)stepFlow(naive);
    }
    assert.equal(naive.status,'lost',`${level.id} cannot be cleared by selecting and dropping in order`);
  }
});

test('reversing the authored order fails in the redesigned free-order medium puzzles',()=>{
  for(const index of [10,12]){
    const game=createGame({levelIndex:index});
    for(const flow of [...LEVEL_SOLUTIONS[index]].reverse()){
      if(game.status==='lost')break;
      run(game,flow);
    }
    assert.equal(game.status,'lost');
  }
});

// Special blocks use the same turn, collision, score and batch executors.
import {useTool,TOOL_TYPES,shapeMatrix,classicAction,undoLastPiece} from '../engine.mjs';
function toolFixture(type,mode='endless'){
  const game=createGame({mode});
  assert.equal(useTool(game,type).ok,true);return game;
}

test('tools are excluded from puzzle mode and from ordinary random bags',()=>{
  const puzzle=createGame();assert.equal(puzzle.tools,null);
  const before=copy(puzzle);assert.equal(useTool(puzzle,'BOMB').ok,false);assert.deepEqual(puzzle,before);
  for(const mode of ['endless','classic','shuhang']){
    const game=createGame({mode});assert.equal(game.tools.PHASE,1);assert.equal(game.tools.BOMB,1);
    assert.ok(game.queue.every(type=>!TOOL_TYPES.includes(type)));assert.deepEqual(shapeMatrix('PHASE'),[[1]]);
  }
});

test('using a tool immediately consumes it, resets position and invalidates the old undo',()=>{
  const game=createGame({mode:'endless'}),id=game.active.id,queue=copy(game.queue);
  game.active.x=0;game.active.y=5;game.undo=copy(game);game.turnStart=copy(game);
  assert.equal(useTool(game,'PHASE').ok,true);
  assert.deepEqual({id:game.active.id,type:game.active.type,x:game.active.x,y:game.active.y},{id,type:'PHASE',x:4,y:0});
  assert.equal(game.tools.PHASE,0);assert.equal(game.undo,null);assert.deepEqual(game.queue,queue);
  run(game,[drop]);assert.equal(undoLastPiece(game),true);
  assert.equal(game.tools.PHASE,0);assert.equal(game.active.type,'PHASE');
  const before=copy(game);assert.equal(useTool(game,'PHASE').ok,false);assert.deepEqual(game,before);
});

test('invalid or in-flight tool activation leaves all state and inventory unchanged',()=>{
  const game=createGame({mode:'endless'});
  const before=copy(game);assert.equal(useTool(game,'UNKNOWN').ok,false);assert.deepEqual(game,before);
  startFlow(game,[move('MOVE_DOWN',2),drop]);const running=copy(game);
  assert.equal(useTool(game,'BOMB').ok,false);assert.deepEqual(game,running);
  const batch=createGame({mode:'shuhang'}),batchBefore=copy(batch);
  assert.equal(useTool(batch,'BOMB','missing').ok,false);assert.deepEqual(batch,batchBefore);
});

test('phase single penetrates walls and lands below sealed cells without overwriting them',()=>{
  const game=toolFixture('PHASE');game.board[6][4]='J';game.board[14][4]='L';game.board[19][4]='O';
  const shadow=landingPiece(game,game.active);assert.equal(shadow.y,18);
  run(game,[move('MOVE_DOWN',6),move('MOVE_RIGHT',1),move('MOVE_LEFT',1),drop]);
  assert.equal(game.board[18][4],'PHASE');assert.equal(game.board[6][4],'J');assert.equal(game.board[14][4],'L');assert.equal(game.board[19][4],'O');
  assert.equal(game.score,0);
});

test('phase settles safely when a flow ends inside a wall and fails on a completely full column',()=>{
  const game=toolFixture('PHASE');game.board[4][4]='J';run(game,[move('MOVE_DOWN',4)]);
  assert.equal(game.board[4][4],'J');assert.equal(game.board[5][4],'PHASE');
  const full=toolFixture('PHASE');for(const row of full.board)row[4]='fixed';const board=copy(full.board);
  assert.equal(landingPiece(full,full.active),null);run(full,[drop]);assert.equal(full.status,'lost');assert.deepEqual(full.board,board);
});

test('phase respects side boundaries, skips rotation, and can remain in an empty cell',()=>{
  const game=toolFixture('PHASE');run(game,[move('MOVE_LEFT',9),a('ROTATE_CW')]);
  assert.equal(game.board[0][4],'PHASE');assert.equal(game.lastFlow.logs[1].skipped,true);
  assert.equal(game.board.flat().filter(Boolean).length,1);
});

test('phase fills a buried single hole, scores normally, earns a tool once and undo reverses the reward',()=>{
  const game=createGame({mode:'endless'});game.score=900;
  game.board[19]=Array(10).fill('fixed');game.board[19][4]=null;game.board[17][4]='J';
  assert.equal(useTool(game,'PHASE').ok,true);run(game,[drop]);
  assert.equal(game.score,1000);assert.equal(game.lines,1);assert.equal(game.tools.PHASE,1);assert.equal(game.tools.rewarded,1);
  assert.equal(undoLastPiece(game),true);assert.equal(game.score,900);assert.equal(game.tools.PHASE,0);assert.equal(game.tools.rewarded,0);
});

for(const [id,obstacle] of [['MOVE_LEFT',{x:3,y:8}],['MOVE_RIGHT',{x:5,y:8}],['MOVE_DOWN',{x:4,y:9}]])
 test(`bomb explodes on ${id} collision, stops the tail and preserves outside cells`,()=>{
  const game=toolFixture('BOMB');game.active.x=4;game.active.y=8;game.board[obstacle.y][obstacle.x]='fixed';
  game.board[6][4]='L';game.board[10][4]='J';const nextId=game.active.id;
  run(game,[move(id,2),move('MOVE_DOWN',3),drop]);
  assert.equal(game.lastFlow.reason,'explosion');assert.equal(game.lastFlow.executed,1);assert.equal(game.transition.kind,'explosion');
  assert.equal(game.transition.area.length,9);assert.equal(game.board[obstacle.y][obstacle.x],null);
  assert.equal(game.board[6][4],'L');assert.equal(game.board[10][4],'J');assert.equal(game.lines,0);assert.equal(game.score,0);
  assert.notEqual(game.active.id,nextId);assert.equal(game.board.flat().includes('BOMB'),false);
 });

for(const [id,x,y] of [['MOVE_LEFT',0,8],['MOVE_RIGHT',9,8],['MOVE_DOWN',4,19]])
 test(`bomb detonates at the ${id} boundary and clips the blast to the board`,()=>{
  const game=toolFixture('BOMB');game.active.x=x;game.active.y=y;run(game,[move(id,1)]);
  assert.equal(game.transition.kind,'explosion');assert.equal(game.transition.area.length,6);
  assert.ok(game.transition.area.every(c=>c.x>=0&&c.x<10&&c.y>=0&&c.y<20));
 });

test('multi-cell bomb collision detonates at the last reached cell rather than the starting cell',()=>{
  const game=toolFixture('BOMB');game.active.y=8;game.board[8][7]='fixed';run(game,[move('MOVE_RIGHT',5)]);
  assert.equal(game.transition.piece.x,6);assert.equal(game.board[8][7],null);assert.equal(game.moves,1);
});

test('bomb hard drop and natural flow ending both detonate without leaving an armed solid block',()=>{
  for(const commands of [[drop],[move('MOVE_LEFT',1)]]){
    const game=toolFixture('BOMB');game.board[17][3]='L';game.board[17][4]='J';
    run(game,commands);assert.equal(game.transition.kind,'explosion');assert.equal(game.transition.piece.y,16);
    assert.equal(game.board[17][3],null);assert.equal(game.board[17][4],null);assert.equal(game.board.flat().includes('BOMB'),false);
  }
});

test('classic tool replacement preserves playing/paused state and automatic gravity uses special collision rules',()=>{
  const game=toolFixture('PHASE','classic');game.speed=1;game.board[1][4]='J';advance(game,1);
  assert.equal(game.active.y,1);assert.equal(game.board[1][4],'J');assert.equal(game.status,'playing');
  game.status='paused';assert.equal(useTool(game,'BOMB').ok,true);assert.equal(game.status,'paused');
  const paused=copy(game);advance(game,30);assert.deepEqual(game,paused);
  game.status='playing';game.board[1][4]='J';advance(game,1);
  assert.equal(game.transition.kind,'explosion');assert.equal(game.transition.piece.y,0);assert.equal(game.board[1][4],null);
  assert.equal(game.status,'playing');
});

test('classic lateral collision detonates immediately, and a blocked bomb spawn also explodes',()=>{
  const game=toolFixture('BOMB','classic');game.board[0][5]='J';
  assert.equal(classicAction(game,move('MOVE_RIGHT',1)).reason,'explosion');assert.equal(game.board[0][5],null);
  const blocked=createGame({mode:'classic'});blocked.board[0][4]='fixed';assert.equal(useTool(blocked,'BOMB').ok,true);
  assert.equal(blocked.transition.kind,'explosion');assert.equal(blocked.board[0][4],null);assert.equal(blocked.tools.BOMB,0);
});

test('endless automatic gravity penetrates with phase and triggers bombs',()=>{
  const phase=toolFixture('PHASE');phase.fallMode='automatic';phase.speed=1;phase.board[1][4]='J';
  startFlow(phase,[move('MOVE_LEFT',1),drop]);advance(phase,1);assert.equal(phase.active.y,1);
  const bomb=toolFixture('BOMB');bomb.fallMode='automatic';bomb.speed=1;bomb.board[1][4]='J';
  startFlow(bomb,[move('MOVE_LEFT',1),drop]);advance(bomb,1);
  assert.equal(bomb.lastFlow.reason,'explosion');assert.equal(bomb.lastFlow.executed,0);assert.equal(bomb.board[1][4],null);
});

test('rewards alternate, cap at four, and pending rewards fill vacancies without loss or duplication',()=>{
  const game=createGame({mode:'endless'});game.score=4000;game.tools={PHASE:2,BOMB:2,rewarded:4,pending:0,next:4};
  game.active={type:'I',id:game.active.id,matrix:[[1],[1],[1],[1]],x:4,y:0};
  for(let y=16;y<20;y++){game.board[y]=Array(10).fill('fixed');game.board[y][4]=null;}
  run(game,[drop]);assert.equal(game.score,5000);assert.equal(game.tools.pending,1);assert.equal(game.tools.PHASE+game.tools.BOMB,4);
  assert.equal(useTool(game,'BOMB').ok,true);assert.equal(game.tools.pending,0);assert.equal(game.tools.PHASE,3);assert.equal(game.tools.BOMB,1);
  assert.equal(useTool(game,'PHASE').ok,true);assert.equal(game.tools.PHASE,2);assert.equal(game.tools.BOMB,1);
  const fresh=createGame({mode:'endless'});fresh.score=2000;assert.equal(useTool(fresh,'PHASE').ok,true);
  assert.equal(fresh.tools.PHASE,1);assert.equal(fresh.tools.BOMB,2);assert.equal(fresh.tools.rewarded,2);
});

test('Shuhang tools keep candidate identity and count, consume now and continue after an explosion',()=>{
  const game=createGame({mode:'shuhang'}),ids=game.pool.map(p=>p.id);const target=ids[0];
  assert.equal(useTool(game,'BOMB',target).ok,true);assert.deepEqual(game.pool.map(p=>p.id),ids);assert.equal(game.pool[0].type,'BOMB');assert.equal(game.tools.BOMB,0);
  const items=ids.map((pieceId,i)=>({pieceId,steps:i===0?[move('MOVE_LEFT',9),move('MOVE_RIGHT',2)]:[]}));
  assert.equal(startBatch(game,items).ok,true);const executing=copy(game);assert.equal(useTool(game,'PHASE',ids[1]).ok,false);assert.deepEqual(game,executing);
  assert.equal(stepBatch(game).reason,'explosion');assert.equal(game.batch.cursor,1);assert.equal(game.pool[0].used,true);
  finishBatch(game);assert.equal(game.layer,2);assert.equal(game.clearedLayers,1);assert.equal(game.pool.length,3);assert.equal(game.tools.BOMB,0);
});

test('Shuhang phase replaces exactly one candidate and uses the common auto-drop executor',()=>{
  const game=createGame({mode:'shuhang'}),target=game.pool[1].id;
  assert.equal(useTool(game,'PHASE',target).ok,true);assert.equal(game.tools.PHASE,0);
  const ids=[target,...game.pool.filter(p=>p.id!==target).map(p=>p.id)];game.board[10][4]='fixed';
  assert.equal(startBatch(game,ids.map(pieceId=>({pieceId,steps:[]}))).ok,true);stepBatch(game);
  assert.equal(game.board[19][4],'PHASE');assert.equal(game.board[10][4],'fixed');assert.equal(game.pool.find(p=>p.id===target).used,true);
  pauseFlow(game);const paused=copy(game);stepBatch(game);assert.deepEqual(game,paused);resumeFlow(game);finishBatch(game);assert.equal(game.layer,2);
});
