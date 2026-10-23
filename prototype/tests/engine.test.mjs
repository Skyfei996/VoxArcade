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

