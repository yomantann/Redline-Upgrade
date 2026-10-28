import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('public/characters/bio-upgrade/pawns');
const paletteFile = await readFile(path.resolve('src/components/pawns/pawn-palettes.ts'), 'utf8');
const palettes = Object.fromEntries([...paletteFile.matchAll(/^\s{2}([\w]+): \{ body: '([^']+)', trim: '([^']+)', accent: '([^']+)' \},$/gm)]
  .map(([, id, body, trim, accent]) => [id, { body, trim, accent }]));
const designs = {
  accuser: ['detective', 'round glasses, sharp side-parted hair, magnifying lens, extended pointing arm, evidence folder'],
  alpha_prime: ['muscle', 'huge bare armored shoulders, close-cropped head, oversized gauntlet fists, prototype chest core'],
  anointed: ['crowned', 'older swept-back hair, short beard, fine tailored coat, raised ceremonial glass, narrow crown'],
  click_click: ['rat', 'low cyber-rat body, pointed ears, long curled tail, one luminous eye, tiny button gadget'],
  danger_zone: ['performer', 'glamorous stage figure, high ponytail, fitted dark outfit, jeweled eye accent, flame shoulder ornament'],
  rainbow_dash: ['rabbit', 'long upright ears, oversized goggles, patched street jacket, sneakers, small skateboard'],
  executive_p: ['executive', 'precise business suit, swept hair, slim briefcase, glowing VIP credential'],
  frostbyte: ['hacker', 'swept white hair, cropped technical jacket, chilled can, sharp ice-crystal shoulder fins'],
  guardian_h: ['guardian', 'sealed helmet, broad tactical armor, heavy shield, protective stance, small chest beacon'],
  hotwired: ['mechanic', 'tousled flame-red hair, pushed-up goggles, work coveralls, heavy wrench, ignition coil'],
  idol_core: ['idol', 'platinum bob, couture stage jacket, confident makeup, handheld microphone, star earring'],
  low_flame: ['hooded', 'dark braids, practical hoodie, guarded face, cupped ember lantern, small flame badge'],
  pain_hider: ['survivor', 'weathered older face, gray beard, worn jacket, bandaged forearm, small glass held close'],
  panic_bot: ['robot', 'boxy monitor head with anxious eyes, antenna beacon, warning claw, dangling cable, compact torso'],
  primate: ['primate', 'expressive gorilla face, short fur, rolled sleeves, stained apron, small pan and spatula'],
  prom_king: ['royal', 'styled hair, midnight formal suit, diagonal satin sash, small crown, welcoming raised hand'],
  the_rind: ['cat', 'crouched black cat, pointed ears, bright eyes, segmented street armor, lowered compact tool'],
  roll_safe: ['gambler', 'sharp fade, teal-black jacket, raised eyebrow, cocktail glass, pair of weighted dice'],
  sadman: ['alien', 'oversized bald green head, watery eyes, tiny worn jacket, reaching hands, low crawling pose'],
  the_tank: ['mech', 'very broad squat armored chassis, massive shoulder plates, hazard panels, thick arms, side-mounted cannon'],
  wandering_eye: ['watcher', 'dark high-collar coat, thoughtful face, floating eye-orb, translucent map ribbon, observant pose'],
};

const rgb = (hex) => hex.slice(1).match(/.{2}/g).map((v) => {
  const srgb = parseInt(v, 16) / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
});
const materials = [];
const materialIndexes = new Map();
const groups = new Map();
function material(hex) {
  if (!materialIndexes.has(hex)) {
    materialIndexes.set(hex, materials.length);
    materials.push({ name: `Bio ${hex}`, pbrMetallicRoughness: { baseColorFactor: [...rgb(hex), 1], metallicFactor: 0.38, roughnessFactor: 0.38 } });
    groups.set(hex, { positions: [], indices: [] });
  }
  return groups.get(hex);
}
function addPart(color, shape, pos, size, detail = 12) {
  const target = material(color);
  const verts = [];
  const faces = [];
  if (shape === 'box') {
    verts.push(...[-.5,-.5,-.5, .5,-.5,-.5, .5,.5,-.5, -.5,.5,-.5, -.5,-.5,.5, .5,-.5,.5, .5,.5,.5, -.5,.5,.5]);
    faces.push(0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,0,4,7,0,7,3,1,2,6,1,6,5);
  } else if (shape === 'sphere') {
    const lat = 8, lon = 12;
    for (let y=0;y<=lat;y++) for(let x=0;x<=lon;x++){const a=x/lon*Math.PI*2,b=y/lat*Math.PI;verts.push(Math.sin(b)*Math.cos(a)*.5,Math.cos(b)*.5,Math.sin(b)*Math.sin(a)*.5);}
    for(let y=0;y<lat;y++) for(let x=0;x<lon;x++){const a=y*(lon+1)+x,b=a+lon+1;faces.push(a,b,a+1,b,b+1,a+1);}
  } else if (shape === 'cylinder' || shape === 'cone') {
    const sides = detail;
    for(let y=0;y<2;y++) for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,r=shape==='cone'&&y===1?.015:.5;verts.push(Math.cos(a)*r,y-.5,Math.sin(a)*r);}
    for(let i=0;i<sides;i++){const a=i*2,b=((i+1)%sides)*2;faces.push(a,a+1,b,b,a+1,b+1);}
    for(let i=1;i<sides-1;i++){faces.push(0,i*2,(i+1)*2,1,(i+1)*2+1,i*2+1);}
  } else if (shape === 'torus') {
    const n=20,m=6;
    for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){const a=i/n*Math.PI*2,b=j/m*Math.PI*2,r=.42+.08*Math.cos(b);verts.push(r*Math.cos(a),.08*Math.sin(b),r*Math.sin(a));}
    for(let i=0;i<n;i++)for(let j=0;j<m;j++){const a=i*(m+1)+j,b=a+m+1;faces.push(a,b,a+1,b,b+1,a+1);}
  }
  const base = target.positions.length / 3;
  for(let i=0;i<verts.length;i+=3) target.positions.push(verts[i]*size[0]+pos[0],verts[i+1]*size[1]+pos[1],verts[i+2]*size[2]+pos[2]);
  for(const index of faces) target.indices.push(base+index);
}

function build(id, [kind, detail]) {
  const p = palettes[id];
  if (!p) throw new Error(`Missing Bio palette ${id}`);
  const { body, trim, accent } = p;
  const part = (shape, position, size, color=body, segments=12) => addPart(color, shape, position, size, segments);
  const box=(x,y,z,sx,sy,sz,c)=>part('box',[x,y,z],[sx,sy,sz],c);
  const ball=(x,y,z,sx,sy,sz,c)=>part('sphere',[x,y,z],[sx,sy,sz],c);
  const cone=(x,y,z,sx,sy,sz,c)=>part('cone',[x,y,z],[sx,sy,sz],c);
  const cyl=(x,y,z,sx,sy,sz,c)=>part('cylinder',[x,y,z],[sx,sy,sz],c);
  const ring=(x,y,z,sx,sy,sz,c)=>part('torus',[x,y,z],[sx,sy,sz],c);
  // Every model has its own character colors on an integrated, stepped plinth.
  cyl(0,.10,0,1.72,.2,1.72,body); cyl(0,.22,0,1.59,.09,1.59,trim); cyl(0,.30,0,1.43,.09,1.43,body);
  ring(0,.35,0,1.16,.5,1.16,accent); box(0,.40,.70,.32,.10,.07,accent);
  if (kind === 'rat' || kind === 'rabbit' || kind === 'cat' || kind === 'primate' || kind === 'alien') {
    const isTall = kind === 'rabbit';
    ball(0,.95,0,1.08,isTall?.72:.75,.72,body); ball(0,isTall?1.55:1.28,.06,.77,.72,.64,trim);
    if(kind==='rabbit'){cone(-.34,2.30,0,.28,1.18,.25,body);cone(.34,2.30,0,.28,1.18,.25,body);ring(0,1.60,.48,1.05,.55,.15,accent);}
    if(kind==='rat'){cone(-.38,1.62,0,.34,.42,.29,trim);cone(.38,1.62,0,.34,.42,.29,trim);ring(-.55,.70,-.38,.8,.85,.8,accent);}
    if(kind==='cat'){cone(-.34,1.72,0,.27,.65,.25,trim);cone(.34,1.72,0,.27,.65,.25,trim);ball(0,1.32,.40,.50,.12,.12,accent);}
    if(kind==='primate'){ball(0,1.34,.38,.66,.38,.35,body);ball(-.25,1.75,.18,.16,.21,.15,accent);ball(.25,1.75,.18,.16,.21,.15,accent);}
    if(kind==='alien'){ball(0,1.55,.42,.12,.10,.06,accent);ball(-.22,1.52,.36,.16,.17,.1,accent);ball(.22,1.52,.36,.16,.17,.1,accent);}
    box(-.48,.49,.08,.35,.24,.60,trim); box(.48,.49,.08,.35,.24,.60,trim);
  } else if(kind==='robot'||kind==='mech'||kind==='guardian') {
    const broad=kind==='mech'||kind==='guardian';
    box(0,broad?1.45:1.18,0,broad?1.34:.76,broad?.90:.74,.70,body);
    box(0,broad?2.14:1.90,.05,broad?.88:.76,.62,.64,trim);
    box(-.56,1.90,.10,.42,.35,.50,body); box(.56,1.90,.10,.42,.35,.50,body);
    if(kind==='robot'){box(0,1.98,.4,.51,.22,.12,accent);cone(0,2.45,0,.13,.42,.13,accent);}
    if(kind==='mech'){box(.85,1.40,0,.68,.33,.52,trim);cyl(.93,1.38,.30,.35,.32,.35,accent);}
    if(kind==='guardian'){box(.68,1.25,.50,.18,1.0,.72,trim);ring(.68,1.25,.89,.60,.60,.12,accent);}
  } else {
    const bulk=kind==='muscle';
    cyl(0,.69,0,.32,.63,.34,trim); cyl(0,1.27,0,bulk?1.24:.82,bulk?.93:.82,.64,body);
    ball(0,2.05,0,.68,.69,.62,trim);
    box(-.25,.48,.15,.36,.42,.46,body);box(.25,.48,.15,.36,.42,.46,body);
    cyl(-.66,1.25,0,.24,.78,.28,body);cyl(.66,1.25,0,.24,.78,.28,body);
    if(kind==='executive'||kind==='detective'||kind==='gambler'||kind==='watcher'){box(0,2.05,.45,.50,.12,.10,accent);box(0,1.05,.36,.40,.32,.08,trim);}
    if(kind==='detective'){ring(0,2.08,.53,.62,.26,.12,accent);box(.68,1.40,.1,.85,.10,.10,accent);}
    if(kind==='muscle'){ball(-.55,1.42,.12,.56,.48,.50,trim);ball(.55,1.42,.12,.56,.48,.50,trim);box(0,1.33,.37,.55,.18,.10,accent);}
    if(kind==='crowned'||kind==='royal'){cyl(0,2.72,0,.72,.16,.72,accent);[-1,0,1].forEach(s=>cone(s*.22,2.95,0,.18,.46,.18,accent));}
    if(kind==='performer'||kind==='idol'){ball(0,2.55,0,.75,.34,.72,accent);box(.70,1.35,.10,.10,.95,.10,trim);}
    if(kind==='hacker'){[-1,0,1].forEach(s=>cone(s*.27,2.55,-.03,.22,.58,.22,accent));cyl(.78,1.48,.1,.25,.65,.25,trim);}
    if(kind==='mechanic'){[-1,0,1].forEach(s=>ball(s*.22,2.58,.03,.25,.34,.29,accent));cyl(.92,1.55,.15,.12,.98,.12,trim);}
    if(kind==='hooded'){cone(0,2.36,-.08,1.10,.85,.90,body);cyl(0,1.40,.40,.25,.25,.10,accent);}
    if(kind==='survivor'){ball(0,1.92,.10,.70,.75,.62,trim);box(.66,1.12,.1,.22,.50,.24,accent);}
    if(kind==='prom'){box(-.08,1.30,.39,.22,1.0,.10,accent);cyl(0,2.72,0,.70,.12,.70,accent);}
    if(kind==='gambler'){ball(.72,1.68,.26,.26,.26,.26,accent);box(-.55,1.52,.24,.25,.25,.25,trim);}
    if(kind==='watcher'){ball(.95,2.10,0,.44,.44,.44,accent);ring(.95,2.10,0,.68,.68,.68,trim);}
    if(kind==='anointed'){cyl(0,1.05,.45,.18,.70,.18,accent);}
  }
  // Bio palette details make the identifying accent visible from all sides.
  ring(0,1.08,.58,.52,.5,.15,accent);
  box(-.12,1.77,.61,.12,.20,.12,accent);
}

function makeGlb(id) {
  const design=designs[id]; if(!design) throw new Error(`Missing Bio design ${id}`);
  build(id,design);
  const binParts=[]; const views=[]; const accessors=[]; const meshes=[]; const nodes=[];
  let byteOffset=0;
  const align=()=>{while(byteOffset%4){binParts.push(Buffer.from([0]));byteOffset++;}};
  for(const [color,data] of groups){
    if(!data.indices.length)continue;
    align(); const pos=Buffer.from(new Float32Array(data.positions).buffer); const posOffset=byteOffset;binParts.push(pos);byteOffset+=pos.length;
    views.push({buffer:0,byteOffset:posOffset,byteLength:pos.length,target:34962});
    const min=[0,1,2].map(i=>Math.min(...Array.from({length:data.positions.length/3},(_,n)=>data.positions[n*3+i])));
    const max=[0,1,2].map(i=>Math.max(...Array.from({length:data.positions.length/3},(_,n)=>data.positions[n*3+i])));
    accessors.push({bufferView:views.length-1,componentType:5126,count:data.positions.length/3,type:'VEC3',min,max});const posAccessor=accessors.length-1;
    const normals=new Float32Array(data.positions.length);
    for(let i=0;i<data.indices.length;i+=3){
      const ia=data.indices[i]*3,ib=data.indices[i+1]*3,ic=data.indices[i+2]*3;
      const ax=data.positions[ib]-data.positions[ia],ay=data.positions[ib+1]-data.positions[ia+1],az=data.positions[ib+2]-data.positions[ia+2];
      const bx=data.positions[ic]-data.positions[ia],by=data.positions[ic+1]-data.positions[ia+1],bz=data.positions[ic+2]-data.positions[ia+2];
      const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;
      for(const v of [ia,ib,ic]){normals[v]+=nx;normals[v+1]+=ny;normals[v+2]+=nz;}
    }
    for(let i=0;i<normals.length;i+=3){const n=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;normals[i]/=n;normals[i+1]/=n;normals[i+2]/=n;}
    align(); const normalBytes=Buffer.from(normals.buffer);const normalOffset=byteOffset;binParts.push(normalBytes);byteOffset+=normalBytes.length;
    views.push({buffer:0,byteOffset:normalOffset,byteLength:normalBytes.length,target:34962});
    accessors.push({bufferView:views.length-1,componentType:5126,count:normals.length/3,type:'VEC3'});const normalAccessor=accessors.length-1;
    align(); const idx=Buffer.from(new Uint16Array(data.indices).buffer);const idxOffset=byteOffset;binParts.push(idx);byteOffset+=idx.length;
    views.push({buffer:0,byteOffset:idxOffset,byteLength:idx.length,target:34963});
    accessors.push({bufferView:views.length-1,componentType:5123,count:data.indices.length,type:'SCALAR'});
    meshes.push({name:`${id}_${color}`,primitives:[{attributes:{POSITION:posAccessor,NORMAL:normalAccessor},indices:accessors.length-1,material:materialIndexes.get(color)}]});
    nodes.push({name:`${id}_${color}`,mesh:meshes.length-1});
  }
  const bin=Buffer.concat(binParts);
  const json={asset:{version:'2.0',generator:'Bio Pawn Procedural Mesh Asset Pipeline'},scene:0,scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,meshes,materials,accessors,bufferViews:views,buffers:[{byteLength:bin.length}]};
  const jsonBuffer=Buffer.from(JSON.stringify(json));const jsonPad=Buffer.concat([jsonBuffer,Buffer.alloc((4-jsonBuffer.length%4)%4,0x20)]);
  const binPad=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);
  const total=12+8+jsonPad.length+8+binPad.length;const header=Buffer.alloc(12);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(total,8);
  const jsonHeader=Buffer.alloc(8);jsonHeader.writeUInt32LE(jsonPad.length,0);jsonHeader.writeUInt32LE(0x4e4f534a,4);
  const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(binPad.length,0);binHeader.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([header,jsonHeader,jsonPad,binHeader,binPad]);
}

await mkdir(root,{recursive:true});
if(Object.keys(designs).length!==21||Object.keys(palettes).length!==21)throw new Error('Bio pawn pipeline requires exactly 21 designs and palettes');
for(const id of Object.keys(designs)){
  for(const group of groups.values()){group.positions.length=0;group.indices.length=0;}
  const out=path.join(root,`${id}.glb`);await writeFile(out,makeGlb(id));
  console.log(`${id}: ${designs[id][0]} -> ${out}`);
}
