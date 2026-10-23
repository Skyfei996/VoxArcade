export function deviceView(nav=globalThis.navigator,screenInfo=globalThis.screen,coarse=globalThis.matchMedia?.('(pointer:coarse)').matches??false,search=''){
  const requested=new URLSearchParams(search).get('view');
  if(requested==='mobile'||requested==='desktop')return requested;
  const agent=nav.userAgent??'';
  if(nav.userAgentData?.mobile||/Android|iPhone|iPad|iPod|Mobile/i.test(agent))return 'mobile';
  if(nav.maxTouchPoints>1&&(/Macintosh|MacIntel/.test(agent+' '+nav.platform)||Math.max(screenInfo.width,screenInfo.height)<=1366&&/Tablet/i.test(agent)))return 'mobile';
  if(nav.maxTouchPoints>0&&coarse&&Math.min(screenInfo.width,screenInfo.height)<600)return 'mobile';
  return 'desktop';
}
if(typeof location!=='undefined')location.replace(new URL(`${deviceView(undefined,undefined,undefined,location.search)}.html${location.search}${location.hash}`,location.href));
