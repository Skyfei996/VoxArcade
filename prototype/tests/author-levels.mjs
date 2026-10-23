// Offline authoring check: search real command flows; never used by the game UI.
import {LEVELS,createGame,copy,startFlow,stepFlow} from '../engine.mjs';
LEVELS.push({id:'AUTHOR',width:8,height:12,rows:[],pieces:['I','O','T','T','J','L','S','Z'],free:true});
const base=createGame({levelIndex:LEVELS.length-1}),seen=new Set();let nodes=0;
function execute(game,commands){
  const next=copy(game);if(!startFlow(next,commands).ok)return null;
  while(next.flow){const result=stepFlow(next);if(!result.ok||result.skipped)return null;}
  return next;
}
function noHoles(game){
  for(let x=0;x<game.width;x++){
    let occupied=false;
    for(let y=0;y<game.height;y++){if(game.board[y][x])occupied=true;else if(occupied)return false;}
  }
  return true;
}
function search(game,path){
  if(game.status==='won')return path;
  if(game.status==='lost')return null;
  const counts=game.pool.filter(p=>!p.used).map(p=>p.type).sort().join('');
  const key=game.board.map(row=>row.map(Boolean).map(Number).join('')).join('/')+counts;
  if(seen.has(key))return null;seen.add(key);nodes++;
  if(nodes>150000)throw Error('Authoring search budget exceeded');
  const choices=[];
  for(const type of new Set(game.pool.filter(p=>!p.used).map(p=>p.type))){
    for(let rotation=0;rotation<4;rotation++)for(let dx=-5;dx<=5;dx++){
      const commands=[{id:'SELECT_PIECE',params:{type}},...Array.from({length:rotation},()=>({id:'ROTATE_CW'})),...(dx?[{id:dx<0?'MOVE_LEFT':'MOVE_RIGHT',params:{cells:Math.abs(dx)}}]:[]),{id:'HARD_DROP'}];
      const next=execute(game,commands);if(!next||next.status==='lost')continue;
      const ceiling=next.height-(4-next.lines);
      if(next.board.slice(0,ceiling).some(row=>row.some(Boolean))||!noHoles(next))continue;
      choices.push({game:next,commands,score:next.lines*100-next.board.filter(row=>row.some(Boolean)).length});
    }
  }
  choices.sort((a,b)=>b.score-a.score);
  for(const choice of choices){const result=search(choice.game,[...path,choice.commands]);if(result)return result;}
  return null;
}
const solution=search(base,[]);
if(!solution)throw Error('No valid rectangle solution found');
console.log(JSON.stringify({nodes,solution},null,2));
