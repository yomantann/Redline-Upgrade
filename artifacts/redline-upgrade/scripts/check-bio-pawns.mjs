import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Color } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const rosterSource = await readFile('src/game/characters.ts', 'utf8');
const rosterIds = [...rosterSource.matchAll(/^\s*\['([^']+)'/gm)].map(([, id]) => id).sort();
const paletteSource = await readFile('src/components/pawns/pawn-palettes.ts', 'utf8');
const palettes = Object.fromEntries([...paletteSource.matchAll(/^\s{2}([\w]+): \{ body: '([^']+)', trim: '([^']+)', accent: '([^']+)' \},$/gm)]
  .map(([, id, body, trim, accent]) => [id, [body, trim, accent].map((hex) => Number.parseInt(hex.slice(1), 16))]));
const root = 'public/characters/bio-upgrade/pawns';
const files = (await readdir(root)).filter((file) => file.endsWith('.glb')).sort();
assert.deepEqual(files.map((file) => file.slice(0, -4)), rosterIds, 'there is exactly one Bio GLB per roster character');
assert.deepEqual(Object.keys(palettes).sort(), rosterIds, 'every pawn has a unique Bio palette');

const loader = new GLTFLoader();
const hashes = new Set();
for (const id of rosterIds) {
  const bytes = await readFile(`${root}/${id}.glb`);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, `${id} has a GLB header`);
  hashes.add(createHash('sha256').update(bytes).digest('hex'));
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const colors = new Set();
  let meshCount = 0;
  gltf.scene.traverse((object) => {
    if (!object.isMesh) return;
    meshCount += 1;
    assert(object.geometry.attributes.position.count > 0, `${id} has vertices`);
    assert(object.geometry.attributes.normal, `${id} has lit 3D surface normals`);
    colors.add(object.material.color.getHex());
  });
  assert(meshCount >= 3, `${id} has separate colored mesh groups`);
  for (const color of palettes[id]) assert(colors.has(new Color(color).getHex()), `${id} includes its assigned color ${color.toString(16)}`);
  assert(gltf.scene.children.length > 0, `${id} GLB scene is populated`);
}
assert.equal(hashes.size, 21, 'all 21 Bio models have distinct mesh assets');
console.log('PASS: all 21 Bio characters map to distinct, loadable, lit GLB pawn models with their assigned colors.');
