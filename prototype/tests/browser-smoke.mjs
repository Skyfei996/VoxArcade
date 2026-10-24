import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {LEVEL_SOLUTIONS} from './level-solutions.mjs';
const require=createRequire(import.meta.url),{chromium,devices}=require(process.argv[2]||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),base='http://localhost:4173/',errors=[];
const review=new URL('../review/',import.meta.url);
async function ready(page,url=base){await page.goto(url);await page.locator('[data-command="HARD_DROP"]').waitFor();await page.locator('#tourSkip').click();}
async function selectLevel(page,level){if(await page.locator('body').getAttribute('data-view')==='mobile')await page.locator('#openLevels').click();await page.locator('[data-level="'+level+'"]').click();}
async function checkGrid(page){
 const samples=await page.locator('#board').evaluate(canvas=>{
  const ctx=canvas.getContext('2d'),cell=Number(canvas.dataset.cellPixels),cols=Math.round(canvas.width/cell),rows=Math.round(canvas.height/cell),sum=(x,y)=>{const p=ctx.getImageData(x,y,1,1).data,alpha=p[3]/255;return [28,48,39].reduce((total,value,index)=>total+p[index]*alpha+value*(1-alpha),0);};
  const background=sum(Math.floor(cell*1.5),Math.floor(cell*5.5));
  const vertical=Array.from({length:cols+1},(_,x)=>sum(Math.min(x*cell,canvas.width-1),Math.floor(cell*5.5)));
  const horizontal=Array.from({length:rows+1},(_,y)=>sum(Math.floor(cell*1.5),Math.min(y*cell,canvas.height-1)));
  const r=canvas.getBoundingClientRect();return {background,vertical,horizontal,width:r.width,height:r.height,dpr:devicePixelRatio,pixels:[canvas.width,canvas.height]};
 });
 assert.ok(samples.vertical.every(v=>v>samples.background+50));assert.ok(samples.horizontal.every(v=>v>samples.background+50));
 assert.ok(Math.abs(samples.width*samples.dpr-samples.pixels[0])<1);assert.ok(Math.abs(samples.height*samples.dpr-samples.pixels[1])<1);assert.ok(Math.abs(samples.width/samples.height-.5)<.001);
}
try{
 for(const config of [{view:'desktop',width:615,height:973,dpr:1},{view:'desktop',width:1024,height:768,dpr:1.25},{view:'desktop',width:1366,height:900,dpr:1.5},{view:'desktop',width:1440,height:973,dpr:1},{view:'desktop',width:1920,height:1080,dpr:2},{view:'desktop',width:1800,height:1216,dpr:.8},{view:'desktop',width:1152,height:778,dpr:1.25},{view:'desktop',width:960,height:649,dpr:1.5},...([320,375,390,430].map(width=>({view:'mobile',width,height:844,dpr:3}))),{view:'mobile',width:844,height:390,dpr:2}]){
  const options={viewport:{width:config.width,height:config.height},deviceScaleFactor:config.dpr,...(config.view==='mobile'?{isMobile:true,hasTouch:true,userAgent:devices['iPhone 13'].userAgent}:{})};
  const page=await browser.newPage(options);page.on('pageerror',error=>errors.push(error.message));await ready(page);assert.equal(await page.locator('body').getAttribute('data-view'),config.view);await page.locator('#endlessMode').click();await page.locator('#tourSkip').click();await page.evaluate(()=>new Promise(requestAnimationFrame));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true);await checkGrid(page);
  assert.equal(await page.locator('[data-hold]').count(),0);assert.equal(await page.locator('#holdButton').isVisible(),false);
  assert.deepEqual(await page.locator('[data-command]').evaluateAll(buttons=>buttons.map(button=>button.dataset.command)),['MOVE_LEFT','MOVE_RIGHT','MOVE_DOWN','ROTATE_CCW','ROTATE_CW','HARD_DROP']);
  if(config.view==='desktop'){
   assert.deepEqual(await page.locator('[data-axis="top"] span').allTextContents(),Array.from({length:10},(_,i)=>String(i+1)));
   assert.deepEqual(await page.locator('[data-axis="left"] span').allTextContents(),Array.from({length:20},(_,i)=>String(i+1)));
   const aligned=await page.evaluate(()=>{const board=document.getElementById('board').getBoundingClientRect(),top=document.querySelector('[data-axis="top"]').getBoundingClientRect(),left=document.querySelector('[data-axis="left"]').getBoundingClientRect();return Math.abs(top.left-board.left)<1&&Math.abs(top.width-board.width)<1&&Math.abs(left.top-board.top)<1&&Math.abs(left.height-board.height)<1;});
   assert.equal(aligned,true);
  }
  for(const button of await page.locator('[data-command]').all()){const r=await button.boundingBox();assert.ok(r.height>=44);if(config.view==='mobile')assert.ok(r.y>=0&&r.y+r.height<=config.height);}
  if(config.view==='desktop'){const queue=await page.locator('#nextPieces>.mini-piece').evaluateAll(items=>items.map(item=>{const r=item.getBoundingClientRect();return {x:r.x,y:r.y};}));assert.ok(queue.every((p,i)=>i===0||p.x===queue[0].x&&p.y>queue[i-1].y));}
  if(config.width===1440||config.width===390||config.width===615)await page.screenshot({path:fileURLToPath(new URL(config.view+'-'+config.width+'-devices.png',review)),fullPage:true});
  if(config.width===390){assert.ok((await page.locator('#board').boundingBox()).height>=400);await page.locator('[data-command="MOVE_LEFT"]').click();await page.locator('#openFlow').click();assert.equal(await page.locator('#planList .plan-step').count(),1);await page.locator('[data-remove="0"]').click();assert.equal(await page.locator('#flowCount').textContent(),'0');await page.locator('#closeFlow').click();}
  const path=page.url();await page.setViewportSize({width:config.view==='mobile'?844:600,height:config.view==='mobile'?390:900});assert.equal(page.url(),path);assert.equal(await page.locator('body').getAttribute('data-view'),config.view);
  console.log('PASS: '+config.view+' '+config.width+'×'+config.height+' DPR '+config.dpr+', complete grid and stable device route.');await page.close();
 }
 const preview=await browser.newPage({viewport:{width:390,height:844}});await ready(preview,base+'?view=mobile');assert.equal(await preview.locator('body').getAttribute('data-view'),'mobile');await preview.close();
 const quantity=await browser.newPage({viewport:{width:1440,height:973}});await ready(quantity);await quantity.locator('#quantity').selectOption('3');await quantity.locator('[data-command="MOVE_LEFT"]').click();assert.equal(await quantity.locator('#planList .step-label').last().textContent(),'左移 3 格');assert.equal(await quantity.locator('#quantity').inputValue(),'1');await quantity.close();
 for(const view of ['desktop','mobile']){
  const page=await browser.newPage({viewport:view==='desktop'?{width:1440,height:973}:{width:390,height:844},...(view==='mobile'?{isMobile:true,hasTouch:true,userAgent:devices['iPhone 13'].userAgent}:{})});page.on('pageerror',error=>errors.push(error.message));await ready(page);
  for(let level=0;level<LEVEL_SOLUTIONS.length;level++){
   await selectLevel(page,level);
   for(const steps of LEVEL_SOLUTIONS[level]){
    for(const command of steps){if(command.id==='SELECT_PIECE')await page.locator('[data-shape="'+command.params.type+'"]').click();else{if(command.params?.cells)await page.locator('#quantity').selectOption(String(command.params.cells));await page.locator('[data-command="'+command.id+'"]').click();}}
    if(!steps.some(command=>command.id==='HARD_DROP'))await page.locator('#runPlan').click();await page.waitForFunction(()=>document.getElementById('flowCount').textContent==='0');
   }
   assert.equal(await page.locator('#resultTitle').textContent(),'全部消除！');console.log('PASS: '+view+' level '+(level+1)+' cleared using visible controls.');
  }
  await page.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS: no browser JavaScript errors.');
}finally{await browser.close();}
