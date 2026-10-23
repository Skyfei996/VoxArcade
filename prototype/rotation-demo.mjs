import {SHAPES,COLORS,copy,cells,rotationTrace} from './engine.mjs';
const blank=()=>({width:10,height:10,board:Array.from({length:10},()=>Array(10).fill(null))});
const key=cell=>`${cell.x},${cell.y}`;
export function buildScenario(type,kind,clockwise=true){
  let matrix=copy(SHAPES[type]);const orientations=[];
  for(let turns=0;turns<4;turns++){
    orientations.push({matrix,turns});matrix=rotationTrace(blank(),{matrix,x:3,y:3},true).piece.matrix;
  }
  let fallback;
  for(const {matrix,turns} of orientations){
    for(const x of kind==='left'?[-2,-1,0]:kind==='right'?[7,8,9]:[3]){
      const game=blank(),piece={type,id:'demo',matrix,x,y:3},occupied=cells(piece);
      if(occupied.some(cell=>cell.x<0||cell.x>=10))continue;
      const original=new Set(occupied.map(key));
      if(kind==='left'&&Math.min(...occupied.map(cell=>cell.x))!==0)continue;
      if(kind==='right'&&Math.max(...occupied.map(cell=>cell.x))!==9)continue;
      const trace=rotationTrace(game,piece,clockwise);
      if(kind==='obstacle'||kind==='blocked'){
        const candidates=[0,-1,1,-2,2].map(offset=>({...trace.attempts[0].piece,x:x+offset}));
        if(kind==='blocked'){
          for(const candidate of candidates){const cell=cells(candidate).find(cell=>!original.has(key(cell))&&cell.x>=0&&cell.x<10);if(cell)game.board[cell.y][cell.x]='fixed';}
        }else{
          let found=false;
          for(const cell of cells(candidates[0]).filter(cell=>!original.has(key(cell)))){
            game.board[cell.y][cell.x]='fixed';const check=rotationTrace(game,piece,clockwise);
            if(check.ok&&check.attempts.length>1){found=true;break;}game.board[cell.y][cell.x]=null;
          }
          if(!found)game.board[6][5]='fixed';
        }
      }
      const result={game,piece,turns,trace:rotationTrace(game,piece,clockwise),kind,type};
      fallback??=result;
      if(kind==='empty'||type==='O'||kind==='obstacle'&&result.trace.ok&&result.trace.attempts.length>1||kind==='blocked'&&!result.trace.ok||(kind==='left'||kind==='right')&&result.trace.ok&&result.trace.attempts.length>1)return result;
    }
  }
  return fallback;
}
if(typeof document!=='undefined'){
  const $=id=>document.getElementById(id),canvas=$('demoBoard'),ctx=canvas.getContext('2d');
  let type='T',example,index=0,timer=null;
  const stop=()=>{clearInterval(timer);timer=null;$('play').textContent='▶ 播放演示';};
  function reset(){
    stop();example=buildScenario(type,$('scenario').value,$('direction').value==='cw');index=0;
    $('scenarioNote').textContent=type==='O'?'O 的旋转占格不变：只要原位置合法，就不需要挪位，也不会因旋转而受阻。':`起始朝向：从初始形状顺转 ${example.turns*90}°。虚线位置在整个演示中保持不变，方便比较。`;
    document.querySelectorAll('button[data-type]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.type===type)));render();
  }
  function drawPiece(piece,color,outline=false){
    for(const {x,y} of cells(piece)){
      const px=40+x*40,py=25+y*40;
      if(outline){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.strokeRect(px+4,py+4,32,32);ctx.setLineDash([]);}
      else{ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(px+3,py+3,34,34,4);ctx.fill();}
    }
  }
  function render(){
    const {game,piece,trace}=example,final=index===trace.attempts.length+1,attempt=index>0?trace.attempts[Math.min(index-1,trace.attempts.length-1)]:null;
    const shown=final?trace.piece:attempt?.piece??piece;
    ctx.clearRect(0,0,480,480);ctx.fillStyle='#203c30';ctx.fillRect(0,0,480,480);
    ctx.font='13px system-ui';ctx.textAlign='center';ctx.fillStyle='#c2d3b9';
    for(let n=0;n<10;n++){ctx.fillText(String(n+1),60+n*40,17);ctx.fillText(String(n+1),20,50+n*40);}
    for(let y=0;y<10;y++)for(let x=0;x<10;x++){
      ctx.strokeStyle='#a8c09d70';ctx.lineWidth=1;ctx.strokeRect(40+x*40,25+y*40,40,40);
      if(game.board[y][x])drawPiece({matrix:[[1]],x,y},'#7d9081');
    }
    const size=piece.matrix.length,cx=40+(piece.x+size/2)*40,cy=25+(piece.y+size/2)*40;
    ctx.strokeStyle='#d9e9c0';ctx.setLineDash([5,4]);ctx.strokeRect(40+piece.x*40,25+piece.y*40,size*40,size*40);ctx.setLineDash([]);
    drawPiece(shown,COLORS[type]);drawPiece(piece,'#ffffffb0',true);
    if(attempt&&!final)for(const cell of attempt.blocked){ctx.fillStyle='#ed7566c0';ctx.fillRect(40+cell.x*40+2,25+cell.y*40+2,36,36);}
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-7,cy);ctx.lineTo(cx+7,cy);ctx.moveTo(cx,cy-7);ctx.lineTo(cx,cy+7);ctx.stroke();
    $('stepTitle').textContent=index===0?'① 看清原来的位置':final?trace.ok?'③ 旋转完成':'③ 无法旋转，保持原样':`② 尝试 ${index}：${attempt.offset===0?'原位':`${attempt.offset<0?'左':'右'}移 ${Math.abs(attempt.offset)} 格`}`;
    const columns=shown=>{const xs=cells(shown).map(cell=>cell.x+1);return `${Math.min(...xs)}–${Math.max(...xs)}`;};
    $('stepDescription').textContent=index===0?'实色方块就是起点。虚线大框包含空格，白色 ＋ 是旋转中心。点击下一步，看它转过去。':final?trace.ok?`原来占第 ${columns(piece)} 列，现在占第 ${columns(trace.piece)} 列。${type==='O'?'O 的占格完全不变。':`格框${trace.attempts.at(-1).offset===0?'没有横移':`${trace.attempts.at(-1).offset<0?'向左':'向右'}挪了 ${Math.abs(trace.attempts.at(-1).offset)} 格`}。`}`:'原位、左 1、右 1、左 2、右 2 都受阻，因此这一步跳过，方块回到原样。':attempt.ok?'这个位置没有碰撞，采用这里，不再尝试后面的挪位。':`红色格碰到了${attempt.blocked.some(cell=>cell.x<0||cell.x>=10)?'墙':'已有方块'}，这个位置不能用，继续尝试下一个位置。`;
    $('attemptList').innerHTML=trace.attempts.map((attempt,n)=>`<li class="${index>n?attempt.ok?'valid':'tried':''} ${index===n+1?'current':''}">${n+1}. ${attempt.offset===0?'原位':`${attempt.offset<0?'左':'右'}移 ${Math.abs(attempt.offset)} 格`} ${index>n?attempt.ok?'✓ 可用':'× 碰撞':'· 待尝试'}</li>`).join('');
    $('next').disabled=final;canvas.dataset.step=String(index);canvas.dataset.type=type;canvas.dataset.result=final?trace.ok?'success':'blocked':'playing';
    canvas.setAttribute('aria-label',`${type} 方块，${$('scenario').selectedOptions[0].textContent}，${$('stepTitle').textContent}`);
  }
  function next(){if(index<example.trace.attempts.length+1){index++;render();}else stop();}
  $('shapes').innerHTML=Object.keys(SHAPES).map(shape=>`<button data-type="${shape}" aria-pressed="false" aria-label="演示 ${shape} 方块">${shape}</button>`).join('');
  $('shapes').onclick=event=>{const button=event.target.closest('[data-type]');if(button){type=button.dataset.type;reset();}};
  $('scenario').onchange=reset;$('direction').onchange=reset;$('next').onclick=()=>{stop();next();};
  $('replay').onclick=()=>{reset();$('play').click();};
  $('play').onclick=()=>{if(timer){stop();return;}if(index>=example.trace.attempts.length+1){index=0;render();}$('play').textContent='Ⅱ 暂停演示';timer=setInterval(next,1000);};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});reset();
}
