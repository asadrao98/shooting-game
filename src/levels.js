// Each level: { name, spawn:{x,z,y?}, size:{w,d}, defaultFloor?, ceiling?, ceilingHeight?,
//   walls:[[x,y,z,w,h,d]], floors:[[x,y,z,w,d]], ramps:[{from,to,width}],
//   obstacles:[{type,...}], enemies:[{x,y?,z}] }

const sbLine = (sx, sz, dir, count, sp = 1.4) => {
  const arr = [];
  const rot = dir[0] !== 0 ? Math.PI / 2 : 0;
  for (let i = 0; i < count; i++) {
    arr.push({ type: 'sandbag', x: sx + dir[0] * i * sp, z: sz + dir[1] * i * sp, rot });
  }
  return arr;
};

const trees = (positions, height = 5) =>
  positions.map(([x, z]) => ({ type: 'tree', x, z, height: height + (Math.random() - 0.5) * 1.8 }));

const rocks = (positions, size = 1.2) =>
  positions.map(([x, z, s]) => ({ type: 'rock', x, z, size: s || size }));

const crates = (positions) => positions.map(([x, z]) => ({ type: 'crate', x, z }));

const perimeter = (w, d, h = 5) => [
  [0,  h / 2, -d / 2, w, h, 0.6],
  [0,  h / 2,  d / 2, w, h, 0.6],
  [-w / 2, h / 2, 0, 0.6, h, d],
  [ w / 2, h / 2, 0, 0.6, h, d],
];

export const LEVELS = [
  {
    name: 'COMPOUND YARD',
    spawn: { x: 0, z: 14 },
    size: { w: 32, d: 32 },
    walls: [],
    obstacles: [
      { type: 'vehicle', x: -8, z: 4, rot: 0.3 },
      ...crates([[3, 2], [5, 2.5], [-3, -4]]),
      ...sbLine(-7, -8, [1, 0], 5),
      ...sbLine(6, -2, [0, 1], 4),
      { type: 'pillar', x: 0, z: -11, height: 4, radius: 0.5 },
      { type: 'barrel', x: -5, z: 3 },
      { type: 'barrel', x: -5, z: 4.2 },
    ],
    enemies: [{ x: -8, z: -8 }, { x: 8, z: -10 }, { x: 0, z: -14 }],
  },

  {
    name: 'WAREHOUSE INTERIOR',
    spawn: { x: 0, z: 11 },
    size: { w: 38, d: 28 },
    walls: [
      ...perimeter(38, 28, 5),
      // internal partitions
      [-6, 2.5, -2, 14, 5, 0.5],
      [ 8, 2.5,  3, 12, 5, 0.5],
      [-13, 2.5, 6, 0.5, 5, 8],
      [ 14, 2.5, -4, 0.5, 5, 10],
      // doorway frames (small lintels)
      [-6, 4.5, 4, 4, 1, 0.5],
    ],
    obstacles: [
      { type: 'crateStack', x: -14, z: -10, count: 2 },
      { type: 'crateStack', x: 14, z: 10, count: 2 },
      ...crates([[-2, -7], [3, -10], [-9, 8], [10, -8]]),
      ...sbLine(-15, 0, [1, 0], 3),
      { type: 'barrel', x: 15, z: 0 },
      { type: 'barrel', x: -15, z: -2 },
      { type: 'pillar', x: 0, z: 5, height: 5, radius: 0.4 },
    ],
    enemies: [
      { x: -10, z: -6 }, { x: 10, z: 6 }, { x: -14, z: 10 }, { x: 12, z: -10 },
      { x: 0, z: -10, type: 'rusher' },
    ],
  },

  {
    name: 'CONTAINER YARD',
    spawn: { x: 0, z: 16 },
    size: { w: 50, d: 36 },
    walls: [],
    obstacles: [
      { type: 'container', x: -12, z: 5, rot: 0, color: 0x884028 },
      { type: 'container', x: -12, z: -3, rot: 0, color: 0x2c4a6a },
      { type: 'container', x: 10, z: 6, rot: Math.PI / 2, color: 0x3a5c2a },
      { type: 'container', x: 10, z: -6, rot: Math.PI / 2, color: 0x6a5028 },
      { type: 'container', x: -4, z: -12, rot: 0.2, color: 0x484848 },
      { type: 'container', x: 16, z: -14, rot: -0.3, color: 0x7a3030 },
      { type: 'vehicle', x: 2, z: 4, rot: 0.5 },
      { type: 'vehicle', x: -16, z: -14, rot: -0.6 },
      ...crates([[0, -2], [2, -3], [-6, 8], [18, 0]]),
      { type: 'barrel', x: -4, z: 6 },
      { type: 'barrel', x: -3, z: 7 },
      { type: 'barrel', x: 6, z: -9 },
    ],
    enemies: [
      { x: -10, z: -8 }, { x: 14, z: 0 }, { x: 0, z: -12 },
      { x: -16, z: 6 }, { x: 8, z: 10 },
      { x: -4, z: 4, type: 'rusher' }, { x: 14, z: -12, type: 'rusher' },
    ],
  },

  {
    name: 'TRENCH NETWORK',
    spawn: { x: 0, z: 18 },
    size: { w: 50, d: 40 },
    walls: [],
    floors: [
      [-18, 1.6, -8, 5, 5],   // lookout platform 1
      [ 18, 1.6,  6, 5, 5],   // lookout platform 2
    ],
    ramps: [
      { from: [-18, 0, -3], to: [-18, 1.6, -6], width: 2.5 },
      { from: [18, 0, 11], to: [18, 1.6, 8], width: 2.5 },
    ],
    obstacles: [
      ...sbLine(-10, 8, [1, 0], 7),
      ...sbLine(4, 8, [1, 0], 6),
      ...sbLine(-8, -2, [0, -1], 6),
      ...sbLine(6, 0, [0, -1], 5),
      ...sbLine(-14, -10, [1, 0], 5),
      ...sbLine(0, -14, [1, 0], 7),
      { type: 'crateStack', x: -16, z: 12, count: 2 },
      { type: 'crateStack', x: 14, z: 14, count: 2 },
      { type: 'vehicle', x: -2, z: 4, rot: 1.5 },
      { type: 'barrel', x: 0, z: -8 },
      { type: 'barrel', x: 1, z: -9 },
    ],
    enemies: [
      { x: -12, z: -6 }, { x: 8, z: -4 }, { x: -16, z: -14 },
      { x: 12, z: -14 }, { x: -2, z: -17 }, { x: 18, z: 6, y: 2.45 },
    ],
    pickups: [{ x: 0, z: 2 }],
  },

  {
    name: 'THE BUNKER',
    spawn: { x: 0, z: 11 },
    size: { w: 40, d: 28 },
    ceiling: true,
    ceilingHeight: 4.2,
    walls: [
      ...perimeter(40, 28, 4.2),
      // network of corridor walls
      [-10, 2.1, 6, 12, 4.2, 0.5],
      [-4, 2.1, 0, 0.5, 4.2, 12],
      [ 6, 2.1, -2, 14, 4.2, 0.5],
      [-12, 2.1, -6, 0.5, 4.2, 12],
      [ 4, 2.1, 6, 0.5, 4.2, 8],
      [ 14, 2.1, 4, 0.5, 4.2, 8],
      [-2, 2.1, -8, 10, 4.2, 0.5],
      [ 12, 2.1, 8, 8, 4.2, 0.5],
    ],
    obstacles: [
      ...crates([[-16, 8], [14, -10], [-8, 4], [8, -6]]),
      { type: 'barrel', x: -14, z: 0 },
      { type: 'barrel', x: 16, z: 6 },
      { type: 'pillar', x: -6, z: -10, height: 4.2, radius: 0.35 },
      { type: 'pillar', x: 10, z: 10, height: 4.2, radius: 0.35 },
    ],
    enemies: [
      { x: -14, z: -6 }, { x: 14, z: -8 }, { x: -16, z: 10 },
      { x: 12, z: -4 }, { x: 0, z: -10 }, { x: 16, z: 12 },
      { x: -8, z: 4, type: 'heavy' },
    ],
    pickups: [{ x: 0, z: 4 }],
  },

  {
    name: 'TWO-STORY OUTPOST',
    spawn: { x: 8, z: 11 },
    size: { w: 30, d: 30 },
    walls: [
      ...perimeter(30, 30, 7),
      // second floor edge railing (low wall)
      [-7, 3.6, 2, 14, 1.2, 0.4],
      // some internal walls on ground (height 3 so they don't poke through second floor)
      [-8, 1.5, -8, 8, 3, 0.5],
      [-12, 1.5, -4, 0.5, 3, 6],
    ],
    floors: [
      [-7, 3, 0, 14, 28],   // second floor slab covering left half (x from -14 to 0)
    ],
    ramps: [
      { from: [4, 0, -10], to: [-2, 3, -10], width: 3 },
    ],
    obstacles: [
      ...crates([[-12, 8], [-8, 10], [10, -8], [12, -10]]),
      { type: 'crateStack', x: 8, z: 8, count: 2 },
      { type: 'pillar', x: 0, z: 0, height: 7, radius: 0.4 },
      { type: 'barrel', x: -6, z: 6 },
      { type: 'barrel', x: -10, z: 12 },
      // upstairs cover
      { type: 'crate', x: -10, z: 6, y: 3.5 },
      { type: 'crate', x: -4, z: -4, y: 3.5 },
    ],
    enemies: [
      { x: 10, z: -8 }, { x: 12, z: 4 }, { x: -10, z: -10 },
      // upstairs
      { x: -10, z: 4, y: 3.85 }, { x: -4, z: -8, y: 3.85 }, { x: -12, z: -2, y: 3.85 },
    ],
    pickups: [{ x: -6, z: 10, y: 3.3 }],
  },

  {
    name: 'FOREST EDGE',
    spawn: { x: 0, z: 22 },
    size: { w: 60, d: 50 },
    walls: [],
    obstacles: [
      ...trees([
        [-18, 12], [-22, 6], [-14, 4], [-20, -2], [-16, -10], [-24, -14],
        [18, 10], [22, 4], [16, -2], [24, -8], [20, -16],
        [-6, -18], [4, -20], [-10, 8], [8, 14], [-2, -8],
        [10, -10], [-12, -2], [6, 0], [-8, 16], [12, 6],
      ], 6),
      ...rocks([
        [-10, 4, 1.4], [12, -8, 1.8], [-4, 12, 1.2], [16, 14, 1.6],
        [-18, -8, 1.5], [6, -14, 1.3], [-14, 0, 1.2],
      ]),
      ...sbLine(-4, -2, [1, 0], 4),
      { type: 'crateStack', x: -8, z: -12, count: 2 },
      { type: 'vehicle', x: 0, z: 6, rot: 0.8 },
    ],
    enemies: [
      { x: -14, z: -8 }, { x: 12, z: -6 }, { x: -6, z: -16 },
      { x: 10, z: -16 }, { x: 18, z: 0 }, { x: -16, z: 4 }, { x: 2, z: -10 },
      { x: 0, z: 0, type: 'rusher' }, { x: -4, z: -4, type: 'rusher' },
    ],
  },

  {
    name: 'TOWN PLAZA',
    spawn: { x: 0, z: 20 },
    size: { w: 56, d: 46 },
    walls: [
      // NW building
      [-18, 3, -14, 14, 6, 0.6],
      [-25, 3, -10, 0.6, 6, 8],
      [-18, 3, -6, 14, 6, 0.6],
      // NE building
      [18, 3, -14, 14, 6, 0.6],
      [25, 3, -10, 0.6, 6, 8],
      [18, 3, -6, 14, 6, 0.6],
      // SW building
      [-18, 3, 14, 14, 6, 0.6],
      [-25, 3, 10, 0.6, 6, 8],
      // SE building
      [18, 3, 14, 14, 6, 0.6],
      [25, 3, 10, 0.6, 6, 8],
    ],
    obstacles: [
      // central fountain
      { type: 'pillar', x: 0, z: 0, height: 1.2, radius: 1.5 },
      { type: 'pillar', x: 0, z: 0, height: 2.5, radius: 0.3 },
      // barricades around plaza
      ...sbLine(-6, -2, [1, 0], 4),
      ...sbLine(2, 4, [1, 0], 4),
      ...crates([[-10, 6], [8, -8], [-2, 10], [-8, -10]]),
      { type: 'crateStack', x: 12, z: 8, count: 2 },
      { type: 'vehicle', x: -6, z: -14, rot: 0.2 },
      { type: 'vehicle', x: 8, z: 16, rot: -0.4 },
      { type: 'barrel', x: -4, z: 0 },
      { type: 'barrel', x: -3, z: 1 },
      { type: 'barrel', x: 6, z: -2 },
    ],
    enemies: [
      { x: -12, z: -3 }, { x: 14, z: -3 }, { x: -10, z: 10 },
      { x: 10, z: 12 }, { x: 0, z: -12 }, { x: -22, z: 0 }, { x: 22, z: 6 },
    ],
  },

  {
    name: 'INDUSTRIAL COMPLEX',
    spawn: { x: 0, z: 20 },
    size: { w: 66, d: 46 },
    walls: [
      // mini-building 1 (left) — doorway on south wall centered at x=-22
      [-22, 3, -10, 12, 6, 0.5],
      [-28, 3, -6, 0.5, 6, 8],
      [-25.5, 3, -2, 5, 6, 0.5],
      [-18.5, 3, -2, 5, 6, 0.5],
      [-16, 3, -6, 0.5, 6, 8],
      // lintel above doorway
      [-22, 5.2, -2, 2, 1.6, 0.5],
      // mini-building 2 (right)
      [22, 3, 6, 14, 6, 0.5],
      [29, 3, 10, 0.5, 6, 8],
      [22, 3, 14, 14, 6, 0.5],
    ],
    obstacles: [
      // pipes (tall thin pillars)
      { type: 'pillar', x: -8, z: 4, height: 6, radius: 0.25 },
      { type: 'pillar', x: -6, z: 4, height: 6, radius: 0.25 },
      { type: 'pillar', x: 6, z: -12, height: 6, radius: 0.25 },
      { type: 'pillar', x: 8, z: -12, height: 6, radius: 0.25 },
      { type: 'pillar', x: 14, z: -2, height: 5, radius: 0.35 },
      // containers
      { type: 'container', x: 0, z: -4, rot: 0 },
      { type: 'container', x: -4, z: 8, rot: Math.PI / 2, color: 0x6a4830 },
      { type: 'container', x: 12, z: 0, rot: -0.3, color: 0x2c4a6a },
      // misc
      { type: 'vehicle', x: -14, z: 8, rot: 0.5 },
      { type: 'vehicle', x: 18, z: -10, rot: 1.2 },
      ...crates([[-2, -10], [4, -10], [-20, 6], [16, -16]]),
      { type: 'crateStack', x: 10, z: -6, count: 2 },
      { type: 'barrel', x: -10, z: -8 },
      { type: 'barrel', x: -10, z: -7 },
      { type: 'barrel', x: -9, z: -8 },
      { type: 'barrel', x: 22, z: 2 },
      ...sbLine(-2, 12, [1, 0], 4),
    ],
    enemies: [
      { x: -18, z: -6 }, { x: 20, z: 10 }, { x: -4, z: -12 },
      { x: 12, z: -14 }, { x: -22, z: 6 }, { x: 22, z: -6 },
      { x: 4, z: 4 }, { x: -8, z: 14 },
      { x: 0, z: -8, type: 'heavy' },
    ],
    pickups: [{ x: 0, z: 0 }, { x: -22, z: -8 }],
  },

  {
    name: 'THE CITADEL',
    spawn: { x: 0, z: 22 },
    size: { w: 54, d: 54 },
    walls: [
      // outer ring suggestion (low walls)
      [0, 1.5, -25, 50, 3, 0.6],
      [0, 1.5,  25, 50, 3, 0.6],
      [-25, 1.5, 0, 0.6, 3, 50],
      [ 25, 1.5, 0, 0.6, 3, 50],
    ],
    floors: [
      [0, 2.5, 0, 14, 14],   // central elevated arena
    ],
    ramps: [
      { from: [0, 0, 12], to: [0, 2.5, 8], width: 3.5 },
      { from: [0, 0, -12], to: [0, 2.5, -8], width: 3.5 },
      { from: [12, 0, 0], to: [8, 2.5, 0], width: 3.5 },
      { from: [-12, 0, 0], to: [-8, 2.5, 0], width: 3.5 },
    ],
    obstacles: [
      // crown of pillars around central platform
      { type: 'pillar', x: -7, z: -7, height: 5, radius: 0.5 },
      { type: 'pillar', x:  7, z: -7, height: 5, radius: 0.5 },
      { type: 'pillar', x: -7, z:  7, height: 5, radius: 0.5 },
      { type: 'pillar', x:  7, z:  7, height: 5, radius: 0.5 },
      // perimeter pillars
      { type: 'pillar', x: -18, z: -18, height: 6, radius: 0.6 },
      { type: 'pillar', x:  18, z: -18, height: 6, radius: 0.6 },
      { type: 'pillar', x: -18, z:  18, height: 6, radius: 0.6 },
      { type: 'pillar', x:  18, z:  18, height: 6, radius: 0.6 },
      // ground cover
      ...sbLine(-16, -4, [1, 0], 3),
      ...sbLine(12, 6, [1, 0], 3),
      ...crates([[16, -10], [-16, 10], [-12, 14]]),
      { type: 'crateStack', x: 14, z: 14, count: 2 },
      { type: 'crateStack', x: -14, z: -14, count: 2 },
      // top of platform cover
      { type: 'crate', x: -3, z: -3, y: 3.0 },
      { type: 'crate', x:  3, z:  3, y: 3.0 },
      { type: 'barrel', x: 0, z: 4 },
      { type: 'barrel', x: 1, z: 4 },
    ],
    enemies: [
      // on central platform — boss zone
      { x: -3, z: 0, y: 3.35, type: 'heavy' }, { x:  3, z: 0, y: 3.35, type: 'heavy' },
      { x: 0, z: -3, y: 3.35 },
      // ground
      { x: -16, z: -6 }, { x:  16, z: -6 }, { x: -8, z: -16 }, { x:  8, z: -16 },
      { x: -18, z:  6 }, { x:  18, z:  6 }, { x:  0, z: -20 },
      // rushers from sides
      { x: -10, z: 10, type: 'rusher' }, { x: 10, z: 10, type: 'rusher' },
    ],
    pickups: [{ x: 0, z: 0, y: 3.0 }, { x: -18, z: 14 }],
  },
];
