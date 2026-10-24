const a=(id,params)=>({id,...(params?{params}:{})});
const left=n=>a('MOVE_LEFT',{cells:n}),right=n=>a('MOVE_RIGHT',{cells:n});
const select=type=>a('SELECT_PIECE',{type}),cw=a('ROTATE_CW'),drop=a('HARD_DROP');
export const ADVANCED_FLOWS=[
  [select('I'),left(2),drop],
  [select('O'),right(3),drop],
  [select('Z'),right(1),drop],
  [select('T'),left(2),drop],
  [select('T'),cw,cw,right(2),drop],
  [select('J'),cw,cw,right(3),drop],
  [select('S'),drop],
  [select('L'),cw,cw,left(2),drop]
];
export const LEVEL_SOLUTIONS=[
  [[right(1),drop]],
  [[drop]],
  [[select('I'),cw,drop],[select('O'),left(2),drop]],
  [[cw,cw,right(1),drop]],
  [[select('O'),left(2),drop],[select('I'),right(1),drop],[select('I'),right(1),drop]],
  ADVANCED_FLOWS,
  ADVANCED_FLOWS.map(flow=>flow.filter(command=>command.id!=='SELECT_PIECE')),
  ADVANCED_FLOWS.slice(2)
];
LEVEL_SOLUTIONS.push(
  [[left(1),drop]],
  [[right(2),drop]],
  [[cw,left(1),drop]],
  [[cw,cw,left(1),drop]],
  [[cw,cw,right(2),drop]],
  ADVANCED_FLOWS.slice(4).map(flow=>flow.filter(command=>command.id!=='SELECT_PIECE')),
  ADVANCED_FLOWS.slice(3)
);
