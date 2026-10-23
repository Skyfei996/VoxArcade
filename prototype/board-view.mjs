export function sizeBoard(canvas,stage,columns,rows){
  const style=getComputedStyle(stage),availableWidth=stage.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),availableHeight=stage.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
  const dpr=devicePixelRatio||1,cell=Math.max(1,Math.floor(Math.min(availableWidth/columns,availableHeight/rows)*dpr));
  const pixelWidth=cell*columns,pixelHeight=cell*rows;
  canvas.style.width=`${pixelWidth/dpr}px`;canvas.style.height=`${pixelHeight/dpr}px`;
  if(canvas.width!==pixelWidth||canvas.height!==pixelHeight){canvas.width=pixelWidth;canvas.height=pixelHeight;}
  canvas.dataset.cellPixels=String(cell);canvas.dataset.dpr=String(dpr);
  return {cell,pixelWidth,pixelHeight,dpr};
}
export function drawGrid(ctx,columns,rows,{cell,pixelWidth,pixelHeight,dpr}){
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,pixelWidth,pixelHeight);
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
    ctx.fillStyle=(x+y)%2?'#ffffff09':'#ffffff04';ctx.fillRect(x*cell,y*cell,cell,cell);
  }
  ctx.fillStyle='#a8c2aa88';const line=Math.max(1,Math.round(dpr));
  for(let x=0;x<=columns;x++)ctx.fillRect(Math.min(x*cell,pixelWidth-line),0,line,pixelHeight);
  for(let y=0;y<=rows;y++)ctx.fillRect(0,Math.min(y*cell,pixelHeight-line),pixelWidth,line);
  ctx.setTransform(cell/40,0,0,cell/40,0,0);
}
