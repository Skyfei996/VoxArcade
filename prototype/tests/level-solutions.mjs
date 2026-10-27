import {LEVELS,LEGACY_LEVEL_IDS} from '../engine.mjs';
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
// Redesigned P009-P013, followed by the unchanged hard-level reference flows.
LEVEL_SOLUTIONS.push(
  [[{"id":"MOVE_LEFT","params":{"cells":2}},{"id":"HARD_DROP"}],[{"id":"MOVE_RIGHT","params":{"cells":1}},{"id":"HARD_DROP"}]],
  [[{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"HARD_DROP"}],[{"id":"MOVE_RIGHT","params":{"cells":2}},{"id":"HARD_DROP"}]],
  [[{"id":"SELECT_PIECE","params":{"type":"L"}},{"id":"ROTATE_CW"},{"id":"MOVE_LEFT","params":{"cells":2}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"S"}},{"id":"ROTATE_CW"},{"id":"MOVE_LEFT","params":{"cells":1}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"I"}},{"id":"MOVE_RIGHT","params":{"cells":1}},{"id":"HARD_DROP"}]],
  [[{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":1}},{"id":"HARD_DROP"}],[{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":3}},{"id":"HARD_DROP"}],[{"id":"MOVE_LEFT","params":{"cells":1}},{"id":"HARD_DROP"}]],
  [[{"id":"SELECT_PIECE","params":{"type":"Z"}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"Z"}},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":2}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"J"}},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":1}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"O"}},{"id":"MOVE_LEFT","params":{"cells":2}},{"id":"HARD_DROP"}]],
  ADVANCED_FLOWS.slice(4).map(flow=>flow.filter(command=>command.id!=='SELECT_PIECE')),
  ADVANCED_FLOWS.slice(3)
);

// Solutions follow stable IDs; display ordering may change independently.
const solutionsById=new Map(LEGACY_LEVEL_IDS.map((id,index)=>[id,LEVEL_SOLUTIONS[index]]));
solutionsById.set('P016',[[{"id":"SELECT_PIECE","params":{"type":"S"}},{"id":"ROTATE_CW"},{"id":"MOVE_LEFT","params":{"cells":2}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"L"}},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"T"}},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":2}},{"id":"HARD_DROP"}]]);
solutionsById.set('P017',[[{"id":"ROTATE_CW"},{"id":"MOVE_LEFT","params":{"cells":1}},{"id":"HARD_DROP"}],[{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":2}},{"id":"HARD_DROP"}],[{"id":"MOVE_RIGHT","params":{"cells":1}},{"id":"HARD_DROP"}]]);
solutionsById.set('P018',[[{"id":"SELECT_PIECE","params":{"type":"L"}},{"id":"ROTATE_CW"},{"id":"MOVE_LEFT","params":{"cells":2}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"S"}},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"T"}},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":1}},{"id":"HARD_DROP"}]]);
solutionsById.set('P019',[[{"id":"ROTATE_CW"},{"id":"MOVE_LEFT","params":{"cells":2}},{"id":"HARD_DROP"}],[{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":2}},{"id":"HARD_DROP"}],[{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":3}},{"id":"HARD_DROP"}],[{"id":"MOVE_LEFT","params":{"cells":1}},{"id":"HARD_DROP"}]]);
solutionsById.set('P020',[[{"id":"SELECT_PIECE","params":{"type":"O"}},{"id":"MOVE_RIGHT","params":{"cells":2}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"T"}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"T"}},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_LEFT","params":{"cells":1}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"L"}},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":2}},{"id":"HARD_DROP"}]]);
solutionsById.set('P021',[[{"id":"SELECT_PIECE","params":{"type":"Z"}},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"I"}},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":2}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"T"}},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_LEFT","params":{"cells":1}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"I"}},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":1}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"J"}},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":3}},{"id":"HARD_DROP"}]]);
solutionsById.set('P022',[[{"id":"MOVE_RIGHT","params":{"cells":1}},{"id":"HARD_DROP"}],[{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_LEFT","params":{"cells":1}},{"id":"HARD_DROP"}],[{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":4}},{"id":"HARD_DROP"}],[{"id":"MOVE_RIGHT","params":{"cells":2}},{"id":"HARD_DROP"}],[{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_LEFT","params":{"cells":1}},{"id":"HARD_DROP"}]]);
solutionsById.set('P023',[[{"id":"SELECT_PIECE","params":{"type":"T"}},{"id":"ROTATE_CW"},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"Z"}},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":3}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"S"}},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":2}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"Z"}},{"id":"ROTATE_CW"},{"id":"MOVE_LEFT","params":{"cells":2}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"L"}},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_LEFT","params":{"cells":1}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"T"}},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":3}},{"id":"HARD_DROP"}]]);
solutionsById.set('P024',[[{"id":"SELECT_PIECE","params":{"type":"J"}},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":1}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"J"}},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_LEFT","params":{"cells":1}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"I"}},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_LEFT","params":{"cells":3}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"O"}},{"id":"MOVE_LEFT","params":{"cells":1}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"I"}},{"id":"ROTATE_CW"},{"id":"MOVE_LEFT","params":{"cells":3}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"L"}},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":4}},{"id":"HARD_DROP"}],[{"id":"SELECT_PIECE","params":{"type":"I"}},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":1}},{"id":"HARD_DROP"}]]);
solutionsById.set('P025',[[{"id":"MOVE_LEFT","params":{"cells":3}},{"id":"HARD_DROP"}],[{"id":"ROTATE_CW"},{"id":"MOVE_LEFT","params":{"cells":3}},{"id":"HARD_DROP"}],[{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":3}},{"id":"HARD_DROP"}],[{"id":"ROTATE_CW"},{"id":"MOVE_LEFT","params":{"cells":1}},{"id":"HARD_DROP"}],[{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":3}},{"id":"HARD_DROP"}],[{"id":"MOVE_LEFT","params":{"cells":2}},{"id":"HARD_DROP"}],[{"id":"ROTATE_CW"},{"id":"ROTATE_CW"},{"id":"MOVE_RIGHT","params":{"cells":2}},{"id":"HARD_DROP"}],[{"id":"MOVE_RIGHT","params":{"cells":1}},{"id":"HARD_DROP"}]]);
LEVEL_SOLUTIONS.splice(0,LEVEL_SOLUTIONS.length,...LEVELS.map(level=>solutionsById.get(level.id)));
