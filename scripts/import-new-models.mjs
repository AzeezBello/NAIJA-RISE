#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const TMP_DIR = '/tmp/rise_glb_opt';
fs.mkdirSync(TMP_DIR, { recursive: true });

// Unpack the 3 zip archives into TMP_DIR so we can process all 51 assets uniformly
function unpackZip(zipPath, subDir) {
  const dest = path.join(TMP_DIR, subDir);
  fs.mkdirSync(dest, { recursive: true });
  execFileSync('unzip', ['-q', '-o', zipPath, '-d', dest]);
  return dest;
}

// Convert a .gltf + .bin + textures folder into a standalone .glb buffer
function gltfFolderToGlbBuffer(folder) {
  const gltfPath = path.join(folder, 'scene.gltf');
  const json = JSON.parse(fs.readFileSync(gltfPath, 'utf8'));
  const binPath = path.join(folder, json.buffers[0].uri);
  const binBuf = fs.readFileSync(binPath);

  const chunks = [binBuf];
  let byteOffset = binBuf.length;
  function pad4(n) { return (4 - (n % 4)) % 4; }
  const p0 = pad4(byteOffset);
  if (p0 > 0) { chunks.push(Buffer.alloc(p0)); byteOffset += p0; }

  json.bufferViews = json.bufferViews || [];
  for (const img of (json.images || [])) {
    if (img.uri) {
      const imgPath = path.join(folder, img.uri);
      if (fs.existsSync(imgPath)) {
        const ibuf = fs.readFileSync(imgPath);
        const bvIdx = json.bufferViews.length;
        json.bufferViews.push({
          buffer: 0,
          byteOffset,
          byteLength: ibuf.length
        });
        chunks.push(ibuf);
        byteOffset += ibuf.length;
        const pad = pad4(byteOffset);
        if (pad > 0) { chunks.push(Buffer.alloc(pad)); byteOffset += pad; }
        delete img.uri;
        img.bufferView = bvIdx;
        img.mimeType = imgPath.endsWith('.jpg') || imgPath.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
      }
    }
  }
  delete json.buffers[0].uri;
  json.buffers[0].byteLength = byteOffset;
  return packGlb(json, Buffer.concat(chunks));
}

function packGlb(json, binChunk) {
  let jsonStr = JSON.stringify(json);
  while (Buffer.byteLength(jsonStr, 'utf8') % 4 !== 0) jsonStr += ' ';
  const jsonBuf = Buffer.from(jsonStr, 'utf8');
  const padBin = (4 - (binChunk.length % 4)) % 4;
  const paddedBin = padBin > 0 ? Buffer.concat([binChunk, Buffer.alloc(padBin)]) : binChunk;
  const totalLen = 12 + 8 + jsonBuf.length + 8 + paddedBin.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0); // 'glTF'
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLen, 8);
  const jHeader = Buffer.alloc(8);
  jHeader.writeUInt32LE(jsonBuf.length, 0);
  jHeader.writeUInt32LE(0x4E4F534A, 4); // 'JSON'
  const bHeader = Buffer.alloc(8);
  bHeader.writeUInt32LE(paddedBin.length, 0);
  bHeader.writeUInt32LE(0x004E4942, 4); // 'BIN\0'
  return Buffer.concat([header, jHeader, jsonBuf, bHeader, paddedBin]);
}

function parseGlb(buf) {
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  const binStart = 20 + jsonLen + 8;
  const bin = buf.slice(binStart);
  return { json, bin };
}

function resizeImageBuffer(imgBuf, mimeType, maxDim = 256) {
  const ext = mimeType === 'image/jpeg' ? '.jpg' : '.png';
  const inFile = path.join(TMP_DIR, `in_${process.pid}${ext}`);
  const outFile = path.join(TMP_DIR, `out_${process.pid}${ext}`);
  try {
    fs.writeFileSync(inFile, imgBuf);
    execFileSync('/usr/bin/sips', ['-Z', String(maxDim), inFile, '--out', outFile], { stdio: 'ignore' });
    const resized = fs.readFileSync(outFile);
    return resized.length < imgBuf.length ? resized : imgBuf;
  } catch {
    return imgBuf;
  }
}

// 4x4 matrix math
function mul4(a, b) {
  const out = new Float64Array(16);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      for (let k = 0; k < 4; k++)
        out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
}

function trsToMat(n) {
  if (n.matrix) return Float64Array.from(n.matrix);
  const [qx, qy, qz, qw] = n.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale || [1, 1, 1];
  const [tx, ty, tz] = n.translation || [0, 0, 0];
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
  const xx = qx * x2, xy = qx * y2, xz = qx * z2;
  const yy = qy * y2, yz = qy * z2, zz = qz * z2;
  const wx = qw * x2, wy = qw * y2, wz = qw * z2;
  return Float64Array.from([
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1
  ]);
}

function readAccessorFloats(json, bin, accIdx) {
  const acc = json.accessors[accIdx];
  const bv = json.bufferViews[acc.bufferView];
  const numComps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[acc.type] || 1;
  const compType = acc.componentType;
  const compSize = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[compType] || 4;
  const stride = bv.byteStride || (numComps * compSize);
  const baseOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const out = new Float32Array(acc.count * numComps);
  const norm = !!acc.normalized;
  for (let i = 0; i < acc.count; i++) {
    const off = baseOffset + i * stride;
    for (let c = 0; c < numComps; c++) {
      const coff = off + c * compSize;
      let val = 0;
      if (compType === 5126) val = bin.readFloatLE(coff);
      else if (compType === 5123) { val = bin.readUInt16LE(coff); if (norm) val /= 65535.0; }
      else if (compType === 5122) { val = bin.readInt16LE(coff); if (norm) val = Math.max(-1, val / 32767.0); }
      else if (compType === 5121) { val = bin.readUInt8(coff); if (norm) val /= 255.0; }
      else if (compType === 5120) { val = bin.readInt8(coff); if (norm) val = Math.max(-1, val / 127.0); }
      else if (compType === 5125) val = bin.readUInt32LE(coff);
      out[i * numComps + c] = val;
    }
  }
  return out;
}

function readIndices(json, bin, accIdx, vertexCount) {
  if (accIdx === undefined) {
    const out = new Uint32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) out[i] = i;
    return out;
  }
  const acc = json.accessors[accIdx];
  const bv = json.bufferViews[acc.bufferView];
  const compType = acc.componentType;
  const compSize = { 5121: 1, 5123: 2, 5125: 4 }[compType] || 2;
  const stride = bv.byteStride || compSize;
  const baseOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const out = new Uint32Array(acc.count);
  for (let i = 0; i < acc.count; i++) {
    const off = baseOffset + i * stride;
    if (compType === 5121) out[i] = bin.readUInt8(off);
    else if (compType === 5123) out[i] = bin.readUInt16LE(off);
    else out[i] = bin.readUInt32LE(off);
  }
  return out;
}

// Optimize rigged humanoid GLB (obama.glb) while preserving skinning and normalizing bone names
function optimizeRiggedGlb(buf, outPath, maxImgDim = 256) {
  const { json, bin } = parseGlb(buf);
  // Strip Sketchfab numeric suffixes on joint nodes so they match Ready Player Me bone names
  if (json.skins && json.skins[0]) {
    for (const jIdx of json.skins[0].joints) {
      const n = json.nodes[jIdx];
      if (n && n.name) {
        n.name = n.name.replace(/_\d+$/, '');
      }
    }
  }
  // Strip unused attributes (TANGENT, TEXCOORD_1..4)
  for (const m of (json.meshes || [])) {
    for (const p of (m.primitives || [])) {
      if (p.attributes) {
        delete p.attributes.TANGENT;
        delete p.attributes.TEXCOORD_1;
        delete p.attributes.TEXCOORD_2;
        delete p.attributes.TEXCOORD_3;
        delete p.attributes.TEXCOORD_4;
      }
    }
  }
  // Clean materials: keep only baseColorTexture
  const usedTextures = new Set();
  for (const mat of (json.materials || [])) {
    delete mat.extensions;
    delete mat.normalTexture;
    delete mat.occlusionTexture;
    delete mat.emissiveTexture;
    if (mat.pbrMetallicRoughness) {
      delete mat.pbrMetallicRoughness.metallicRoughnessTexture;
      if (mat.pbrMetallicRoughness.baseColorTexture) {
        usedTextures.add(mat.pbrMetallicRoughness.baseColorTexture.index);
      }
    }
  }
  delete json.extensionsUsed;
  delete json.extensionsRequired;

  // Rebuild bufferViews for used accessors & used images
  const usedAccessors = new Set();
  for (const m of (json.meshes || [])) {
    for (const p of (m.primitives || [])) {
      if (p.indices !== undefined) usedAccessors.add(p.indices);
      for (const a of Object.values(p.attributes || {})) usedAccessors.add(a);
    }
  }
  for (const s of (json.skins || [])) {
    if (s.inverseBindMatrices !== undefined) usedAccessors.add(s.inverseBindMatrices);
  }

  const oldBvToNew = new Map();
  const newBvs = [];
  const chunks = [];
  let offset = 0;
  function addChunk(data, target) {
    const bvIdx = newBvs.length;
    const bv = { buffer: 0, byteOffset: offset, byteLength: data.length };
    if (target) bv.target = target;
    newBvs.push(bv);
    chunks.push(data);
    offset += data.length;
    const pad = (4 - (offset % 4)) % 4;
    if (pad > 0) { chunks.push(Buffer.alloc(pad)); offset += pad; }
    return bvIdx;
  }

  for (const accIdx of usedAccessors) {
    const acc = json.accessors[accIdx];
    if (acc.bufferView === undefined) continue;
    if (!oldBvToNew.has(acc.bufferView)) {
      const oldBv = json.bufferViews[acc.bufferView];
      const slice = Buffer.from(bin.slice(oldBv.byteOffset || 0, (oldBv.byteOffset || 0) + oldBv.byteLength));
      const newIdx = addChunk(slice, oldBv.target);
      if (oldBv.byteStride) newBvs[newIdx].byteStride = oldBv.byteStride;
      oldBvToNew.set(acc.bufferView, newIdx);
    }
    acc.bufferView = oldBvToNew.get(acc.bufferView);
  }

  for (let i = 0; i < (json.images || []).length; i++) {
    const img = json.images[i];
    if (img.bufferView === undefined) continue;
    const oldBv = json.bufferViews[img.bufferView];
    const raw = bin.slice(oldBv.byteOffset || 0, (oldBv.byteOffset || 0) + oldBv.byteLength);
    const resized = resizeImageBuffer(raw, img.mimeType || 'image/png', maxImgDim);
    img.bufferView = addChunk(resized);
  }

  json.bufferViews = newBvs;
  json.buffers = [{ byteLength: offset }];
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, packGlb(json, Buffer.concat(chunks)));
}

// Flatten, orient, merge by material, decimate, and downscale textures for static GLBs
function optimizeStaticGlb(buf, outPath, opts = {}) {
  const {
    category = 'prop',
    targetSize = 1.0,
    maxVerts = 5000,
    maxMaterials = 12,
    maxImgDim = 256,
    rotZUpToYUp = false
  } = opts;

  const { json, bin } = parseGlb(buf);

  // 1. Normalize materials & convert KHR_materials_pbrSpecularGlossiness if present
  const srcMats = (json.materials && json.materials.length > 0) ? json.materials : [{ name: 'DefaultMat' }];
  const cleanMats = srcMats.map((m, idx) => {
    const pbr = m.pbrMetallicRoughness ? { ...m.pbrMetallicRoughness } : {};
    const sg = m.extensions && m.extensions.KHR_materials_pbrSpecularGlossiness;
    if (sg) {
      if (sg.diffuseFactor && !pbr.baseColorFactor) pbr.baseColorFactor = sg.diffuseFactor;
      if (sg.diffuseTexture && !pbr.baseColorTexture) pbr.baseColorTexture = { index: sg.diffuseTexture.index };
    }
    let uvTransform = null;
    if (pbr.baseColorTexture && pbr.baseColorTexture.extensions && pbr.baseColorTexture.extensions.KHR_texture_transform) {
      uvTransform = pbr.baseColorTexture.extensions.KHR_texture_transform;
    }
    const cleanPbr = {
      baseColorFactor: pbr.baseColorFactor || [1, 1, 1, 1],
      metallicFactor: typeof pbr.metallicFactor === 'number' ? Math.min(0.6, pbr.metallicFactor) : 0.1,
      roughnessFactor: typeof pbr.roughnessFactor === 'number' ? Math.max(0.25, pbr.roughnessFactor) : 0.65
    };
    if (pbr.baseColorTexture && typeof pbr.baseColorTexture.index === 'number') {
      cleanPbr.baseColorTexture = { index: pbr.baseColorTexture.index };
    }
    const outMat = {
      name: m.name || `Mat_${idx}`,
      pbrMetallicRoughness: cleanPbr,
      doubleSided: true
    };
    if (m.alphaMode && m.alphaMode !== 'OPAQUE') {
      outMat.alphaMode = m.alphaMode;
      if (typeof m.alphaCutoff === 'number') outMat.alphaCutoff = m.alphaCutoff;
    }
    return { mat: outMat, uvTransform };
  });

  // 2. Walk scene graph and collect transformed geometry per material index
  const matBuckets = new Map(); // matIdx -> { positions:[], normals:[], uvs:[], indices:[], vertCount:0 }

  function addPrimitive(p, worldMat) {
    if (p.mode !== undefined && p.mode !== 4) return; // triangles only
    if (!p.attributes || p.attributes.POSITION === undefined) return;
    const matIdx = (p.material !== undefined && p.material < cleanMats.length) ? p.material : 0;
    const pos = readAccessorFloats(json, bin, p.attributes.POSITION);
    const vCount = pos.length / 3;
    if (vCount === 0) return;
    const norm = p.attributes.NORMAL !== undefined ? readAccessorFloats(json, bin, p.attributes.NORMAL) : null;
    const uv = p.attributes.TEXCOORD_0 !== undefined ? readAccessorFloats(json, bin, p.attributes.TEXCOORD_0) : null;
    const idx = readIndices(json, bin, p.indices, vCount);
    const uvXform = cleanMats[matIdx]?.uvTransform;

    let bucket = matBuckets.get(matIdx);
    if (!bucket) {
      bucket = { positions: [], normals: [], uvs: [], indices: [], vertCount: 0 };
      matBuckets.set(matIdx, bucket);
    }
    const baseV = bucket.vertCount;
    for (let i = 0; i < vCount; i++) {
      const px = pos[i * 3], py = pos[i * 3 + 1], pz = pos[i * 3 + 2];
      let wx = worldMat[0] * px + worldMat[4] * py + worldMat[8] * pz + worldMat[12];
      let wy = worldMat[1] * px + worldMat[5] * py + worldMat[9] * pz + worldMat[13];
      let wz = worldMat[2] * px + worldMat[6] * py + worldMat[10] * pz + worldMat[14];
      if (rotZUpToYUp) {
        const tmpY = wy;
        wy = wz;
        wz = -tmpY;
      }
      bucket.positions.push(wx, wy, wz);

      if (norm) {
        const nx = norm[i * 3], ny = norm[i * 3 + 1], nz = norm[i * 3 + 2];
        let wnx = worldMat[0] * nx + worldMat[4] * ny + worldMat[8] * nz;
        let wny = worldMat[1] * nx + worldMat[5] * ny + worldMat[9] * nz;
        let wnz = worldMat[2] * nx + worldMat[6] * ny + worldMat[10] * nz;
        if (rotZUpToYUp) {
          const tmpNY = wny;
          wny = wnz;
          wnz = -tmpNY;
        }
        const len = Math.hypot(wnx, wny, wnz) || 1;
        bucket.normals.push(wnx / len, wny / len, wnz / len);
      } else {
        bucket.normals.push(0, 1, 0);
      }

      if (uv) {
        let u = uv[i * 2], v = uv[i * 2 + 1];
        if (uvXform) {
          const su = uvXform.scale ? uvXform.scale[0] : 1;
          const sv = uvXform.scale ? uvXform.scale[1] : 1;
          const ou = uvXform.offset ? uvXform.offset[0] : 0;
          const ov = uvXform.offset ? uvXform.offset[1] : 0;
          u = u * su + ou;
          v = v * sv + ov;
        }
        bucket.uvs.push(u, v);
      } else {
        bucket.uvs.push(0.5, 0.5);
      }
    }
    for (let i = 0; i < idx.length; i++) {
      bucket.indices.push(baseV + idx[i]);
    }
    bucket.vertCount += vCount;
  }

  function walkNode(nodeIdx, parentMat) {
    const n = json.nodes[nodeIdx];
    if (!n) return;
    // Skip motion-blur or glow helper meshes
    if (n.name && ((n.name.startsWith('Wheel_') && n.name.includes('_Motion')) || (n.name.startsWith('lights_') && n.name.includes('_glows_')))) {
      return;
    }
    const m = mul4(parentMat, trsToMat(n));
    if (n.mesh !== undefined && json.meshes[n.mesh]) {
      for (const p of (json.meshes[n.mesh].primitives || [])) {
        addPrimitive(p, m);
      }
    }
    for (const c of (n.children || [])) walkNode(c, m);
  }

  const I = Float64Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const rootNodes = (json.scenes && json.scenes[0] && json.scenes[0].nodes)
    ? json.scenes[0].nodes
    : json.nodes.map((_, i) => i);
  for (const r of rootNodes) walkNode(r, I);

  // If too many material buckets, keep top (maxMaterials - 1) by triangle count and merge the rest into the last bucket
  let bucketEntries = [...matBuckets.entries()].filter(([, b]) => b.indices.length >= 3);
  bucketEntries.sort((a, b) => b[1].indices.length - a[1].indices.length);
  if (bucketEntries.length > maxMaterials) {
    const kept = bucketEntries.slice(0, maxMaterials);
    const tail = bucketEntries.slice(maxMaterials);
    const targetBucket = kept[kept.length - 1][1];
    for (const [, tb] of tail) {
      const baseV = targetBucket.vertCount;
      for (let i = 0; i < tb.positions.length; i++) targetBucket.positions.push(tb.positions[i]);
      for (let i = 0; i < tb.normals.length; i++) targetBucket.normals.push(tb.normals[i]);
      for (let i = 0; i < tb.uvs.length; i++) targetBucket.uvs.push(tb.uvs[i]);
      for (let i = 0; i < tb.indices.length; i++) targetBucket.indices.push(baseV + tb.indices[i]);
      targetBucket.vertCount += tb.vertCount;
    }
    bucketEntries = kept;
  }

  // Compute global bounding box across all buckets
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let totalInputVerts = 0;
  for (const [, b] of bucketEntries) {
    totalInputVerts += b.vertCount;
    const p = b.positions;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i], y = p[i + 1], z = p[i + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
  }
  const szX = Math.max(1e-5, maxX - minX);
  const szY = Math.max(1e-5, maxY - minY);
  const szZ = Math.max(1e-5, maxZ - minZ);

  // Determine axis permutation & scale so orientation matches category conventions
  // perm: [axX, axY, axZ], signs: [sX, sY, sZ]
  let perm = [0, 1, 2], signs = [1, 1, 1];
  if (category === 'weapon') {
    // Weapons in hand: longest axis -> +Y (barrel/shaft), 2nd axis -> +Z (grip/magazine), shortest -> X (thickness)
    const dims = [{ axis: 0, len: szX }, { axis: 1, len: szY }, { axis: 2, len: szZ }].sort((a, b) => a.len - b.len);
    perm = [dims[0].axis, dims[2].axis, dims[1].axis];
  } else if (category === 'vehicle' || category === 'animal') {
    // Y is height; longest horizontal axis must be Z (length)
    if (szX > szZ * 1.05) {
      perm = [2, 1, 0];
      signs = [-1, 1, 1];
    }
  }

  // Apply permutation to compute rotated bounds
  let rMin = [Infinity, Infinity, Infinity], rMax = [-Infinity, -Infinity, -Infinity];
  for (const [, b] of bucketEntries) {
    const p = b.positions;
    const n = b.normals;
    for (let i = 0; i < p.length; i += 3) {
      const c = [p[i], p[i + 1], p[i + 2]];
      const nc = [n[i], n[i + 1], n[i + 2]];
      const nx = c[perm[0]] * signs[0];
      const ny = c[perm[1]] * signs[1];
      const nz = c[perm[2]] * signs[2];
      p[i] = nx; p[i + 1] = ny; p[i + 2] = nz;
      n[i] = nc[perm[0]] * signs[0];
      n[i + 1] = nc[perm[1]] * signs[1];
      n[i + 2] = nc[perm[2]] * signs[2];
      if (nx < rMin[0]) rMin[0] = nx; if (nx > rMax[0]) rMax[0] = nx;
      if (ny < rMin[1]) rMin[1] = ny; if (ny > rMax[1]) rMax[1] = ny;
      if (nz < rMin[2]) rMin[2] = nz; if (nz > rMax[2]) rMax[2] = nz;
    }
  }

  const rSz = [Math.max(1e-5, rMax[0] - rMin[0]), Math.max(1e-5, rMax[1] - rMin[1]), Math.max(1e-5, rMax[2] - rMin[2])];
  let refDim = rSz[1]; // default: height (Y)
  if (category === 'vehicle') refDim = rSz[2]; // length (Z)
  else if (category === 'weapon') refDim = rSz[1]; // barrel/shaft length (Y)
  else if (category === 'landmark' || category === 'interior') refDim = Math.max(rSz[0], rSz[2]); // footprint span

  const scale = targetSize / refDim;
  const cx = (rMin[0] + rMax[0]) * 0.5;
  const cz = (rMin[2] + rMax[2]) * 0.5;
  const baseY = category === 'weapon' ? (rMin[1] + rSz[1] * 0.18) : rMin[1];

  for (const [, b] of bucketEntries) {
    const p = b.positions;
    for (let i = 0; i < p.length; i += 3) {
      p[i] = (p[i] - cx) * scale;
      p[i + 1] = (p[i + 1] - baseY) * scale;
      p[i + 2] = (p[i + 2] - cz) * scale;
    }
  }

  const finalW = rSz[0] * scale;
  const finalH = rSz[1] * scale;
  const finalL = rSz[2] * scale;

  // 3. Decimate each bucket proportionally so total vertices <= maxVerts
  function decimateBucket(b, budget) {
    if (b.vertCount <= budget) {
      return {
        positions: Float32Array.from(b.positions),
        normals: Float32Array.from(b.normals),
        uvs: Float32Array.from(b.uvs),
        indices: Uint32Array.from(b.indices),
        vertCount: b.vertCount
      };
    }
    const p = b.positions;
    let bMinX = Infinity, bMinY = Infinity, bMinZ = Infinity;
    let bMaxX = -Infinity, bMaxY = -Infinity, bMaxZ = -Infinity;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i], y = p[i + 1], z = p[i + 2];
      if (x < bMinX) bMinX = x; if (x > bMaxX) bMaxX = x;
      if (y < bMinY) bMinY = y; if (y > bMaxY) bMaxY = y;
      if (z < bMinZ) bMinZ = z; if (z > bMaxZ) bMaxZ = z;
    }
    const maxSpan = Math.max(1e-5, bMaxX - bMinX, bMaxY - bMinY, bMaxZ - bMinZ);

    // Binary search grid resolution G so unique vertex clusters <= budget
    let lo = 6, hi = 180, bestG = 24;
    for (let iter = 0; iter < 7; iter++) {
      const mid = (lo + hi) >> 1;
      const invCell = mid / maxSpan;
      const seen = new Set();
      for (let i = 0; i < b.vertCount; i++) {
        const gx = Math.floor((p[i * 3] - bMinX) * invCell);
        const gy = Math.floor((p[i * 3 + 1] - bMinY) * invCell);
        const gz = Math.floor((p[i * 3 + 2] - bMinZ) * invCell);
        seen.add((gx * 73856093) ^ (gy * 19349663) ^ (gz * 83492791));
        if (seen.size > budget) break;
      }
      if (seen.size <= budget) { bestG = mid; lo = mid + 1; }
      else { hi = mid - 1; }
    }

    const invCell = bestG / maxSpan;
    const cellToNewVert = new Map();
    const remap = new Uint32Array(b.vertCount);
    const newPos = [], newNorm = [], newUv = [];
    let newV = 0;

    for (let i = 0; i < b.vertCount; i++) {
      const gx = Math.floor((p[i * 3] - bMinX) * invCell);
      const gy = Math.floor((p[i * 3 + 1] - bMinY) * invCell);
      const gz = Math.floor((p[i * 3 + 2] - bMinZ) * invCell);
      const key = `${gx},${gy},${gz}`;
      let nv = cellToNewVert.get(key);
      if (nv === undefined) {
        nv = newV++;
        cellToNewVert.set(key, nv);
        newPos.push(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
        newNorm.push(b.normals[i * 3], b.normals[i * 3 + 1], b.normals[i * 3 + 2]);
        newUv.push(b.uvs[i * 2], b.uvs[i * 2 + 1]);
      }
      remap[i] = nv;
    }

    const newIdx = [];
    const oldIdx = b.indices;
    for (let i = 0; i + 2 < oldIdx.length; i += 3) {
      const i0 = remap[oldIdx[i]], i1 = remap[oldIdx[i + 1]], i2 = remap[oldIdx[i + 2]];
      if (i0 !== i1 && i1 !== i2 && i2 !== i0) {
        newIdx.push(i0, i1, i2);
      }
    }

    return {
      positions: Float32Array.from(newPos),
      normals: Float32Array.from(newNorm),
      uvs: Float32Array.from(newUv),
      indices: Uint32Array.from(newIdx),
      vertCount: newV
    };
  }

  // 4. Build final glTF JSON + BIN
  const outMaterials = [];
  const outTextures = [];
  const outImages = [];
  const outSamplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }];
  const oldImgToNew = new Map();
  const outBufferViews = [];
  const outAccessors = [];
  const outPrimitives = [];
  const binChunks = [];
  let byteOffset = 0;

  function appendBuffer(bufSlice, target) {
    const bvIdx = outBufferViews.length;
    const bv = { buffer: 0, byteOffset, byteLength: bufSlice.length };
    if (target) bv.target = target;
    outBufferViews.push(bv);
    binChunks.push(bufSlice);
    byteOffset += bufSlice.length;
    const pad = (4 - (byteOffset % 4)) % 4;
    if (pad > 0) { binChunks.push(Buffer.alloc(pad)); byteOffset += pad; }
    return bvIdx;
  }

  let totalOutVerts = 0;
  for (const [oldMatIdx, rawBucket] of bucketEntries) {
    const budget = Math.max(120, Math.round(maxVerts * (rawBucket.vertCount / Math.max(1, totalInputVerts))));
    const dec = decimateBucket(rawBucket, budget);
    if (dec.indices.length < 3 || dec.vertCount === 0) continue;
    totalOutVerts += dec.vertCount;

    const matDef = JSON.parse(JSON.stringify(cleanMats[oldMatIdx].mat));
    if (matDef.pbrMetallicRoughness.baseColorTexture) {
      const oldTexIdx = matDef.pbrMetallicRoughness.baseColorTexture.index;
      const oldTex = json.textures && json.textures[oldTexIdx];
      const oldImgIdx = oldTex ? oldTex.source : undefined;
      if (oldImgIdx !== undefined && json.images && json.images[oldImgIdx]) {
        if (!oldImgToNew.has(oldImgIdx)) {
          const srcImg = json.images[oldImgIdx];
          const oldBv = json.bufferViews[srcImg.bufferView];
          const rawBytes = bin.slice(oldBv.byteOffset || 0, (oldBv.byteOffset || 0) + oldBv.byteLength);
          const resizedBytes = resizeImageBuffer(rawBytes, srcImg.mimeType || 'image/png', maxImgDim);
          const imgBvIdx = appendBuffer(resizedBytes);
          const newImgIdx = outImages.length;
          outImages.push({ bufferView: imgBvIdx, mimeType: srcImg.mimeType || 'image/png' });
          const newTexIdx = outTextures.length;
          outTextures.push({ sampler: 0, source: newImgIdx });
          oldImgToNew.set(oldImgIdx, newTexIdx);
        }
        matDef.pbrMetallicRoughness.baseColorTexture.index = oldImgToNew.get(oldImgIdx);
      } else {
        delete matDef.pbrMetallicRoughness.baseColorTexture;
      }
    }
    const newMatIdx = outMaterials.length;
    outMaterials.push(matDef);

    // Compute min/max for POSITION accessor
    let pMin = [Infinity, Infinity, Infinity], pMax = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < dec.positions.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const v = dec.positions[i + k];
        if (v < pMin[k]) pMin[k] = v;
        if (v > pMax[k]) pMax[k] = v;
      }
    }

    const posBv = appendBuffer(Buffer.from(dec.positions.buffer), 34962);
    const normBv = appendBuffer(Buffer.from(dec.normals.buffer), 34962);
    const uvBv = appendBuffer(Buffer.from(dec.uvs.buffer), 34962);

    const posAcc = outAccessors.length;
    outAccessors.push({ bufferView: posBv, componentType: 5126, count: dec.vertCount, type: 'VEC3', min: pMin, max: pMax });
    const normAcc = outAccessors.length;
    outAccessors.push({ bufferView: normBv, componentType: 5126, count: dec.vertCount, type: 'VEC3' });
    const uvAcc = outAccessors.length;
    outAccessors.push({ bufferView: uvBv, componentType: 5126, count: dec.vertCount, type: 'VEC2' });

    let idxAcc;
    if (dec.vertCount <= 65535) {
      const u16 = Uint16Array.from(dec.indices);
      const idxBv = appendBuffer(Buffer.from(u16.buffer), 34963);
      idxAcc = outAccessors.length;
      outAccessors.push({ bufferView: idxBv, componentType: 5123, count: u16.length, type: 'SCALAR' });
    } else {
      const idxBv = appendBuffer(Buffer.from(dec.indices.buffer), 34963);
      idxAcc = outAccessors.length;
      outAccessors.push({ bufferView: idxBv, componentType: 5125, count: dec.indices.length, type: 'SCALAR' });
    }

    outPrimitives.push({
      attributes: { POSITION: posAcc, NORMAL: normAcc, TEXCOORD_0: uvAcc },
      indices: idxAcc,
      material: newMatIdx,
      mode: 4
    });
  }

  const outNodes = [{ name: 'body', mesh: 0 }];
  const sceneNodeIndices = [0];
  if (category === 'vehicle') {
    const wx = finalW * 0.42, wy = 0.34, wz = finalL * 0.32;
    const wheels = [
      { name: 'wheel-front-left', translation: [-wx, wy, wz] },
      { name: 'wheel-front-right', translation: [wx, wy, wz] },
      { name: 'wheel-back-left', translation: [-wx, wy, -wz] },
      { name: 'wheel-back-right', translation: [wx, wy, -wz] },
    ];
    for (const w of wheels) {
      sceneNodeIndices.push(outNodes.length);
      outNodes.push(w);
    }
  }

  const outJson = {
    asset: { version: '2.0', generator: 'RISE-GLB-Optimizer' },
    scene: 0,
    scenes: [{ nodes: sceneNodeIndices }],
    nodes: outNodes,
    meshes: [{ name: path.basename(outPath, '.glb'), primitives: outPrimitives }],
    materials: outMaterials,
    accessors: outAccessors,
    bufferViews: outBufferViews,
    buffers: [{ byteLength: byteOffset }]
  };
  if (outTextures.length > 0) {
    outJson.textures = outTextures;
    outJson.images = outImages;
    outJson.samplers = outSamplers;
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const finalGlb = packGlb(outJson, Buffer.concat(binChunks));
  fs.writeFileSync(outPath, finalGlb);
  console.log(`${path.basename(outPath).padEnd(36)} | ${(finalGlb.length / 1024).toFixed(0).padStart(6)} KB | verts:${String(totalOutVerts).padStart(5)} | submeshes:${String(outPrimitives.length).padStart(2)} | imgs:${String(outImages.length).padStart(2)} | size:${finalW.toFixed(2)}x${finalH.toFixed(2)}x${finalL.toFixed(2)}m`);
}

// Prepare zip models
const ferrariDir = unpackZip('2026_ferrari_296_speciale_a.zip', 'ferrari296');
const ferrari296Glb = gltfFolderToGlbBuffer(ferrariDir);
const runnerDir = unpackZip('runner.zip', 'runner');
const runnerGlb = fs.readFileSync(path.join(runnerDir, 'source/model.glb'));
const tifaDir = unpackZip('tifa-lockhart-final-fantasy-realistic-3d-model.zip', 'tifa');
const tifaGlb = fs.readFileSync(path.join(tifaDir, 'source/ip-final-fantasy__tifa-lockhart__real__sexy.glb'));

// 1. Rigged Character: obama.glb
optimizeRiggedGlb(fs.readFileSync('obama.glb'), 'unity/Assets/Rise/Resources/Models/Characters/obama.glb', 256);
const obamaSize = fs.statSync('unity/Assets/Rise/Resources/Models/Characters/obama.glb').size;
console.log(`obama.glb (rigged)                   | ${(obamaSize / 1024).padStart ? (obamaSize / 1024).toFixed(0).padStart(6) : ''} KB`);

// 2. All 50 Static / Baked Models
const JOBS = [
  // Vehicles
  { src: '1997_nissan_200sx_s14.glb', dst: 'Vehicles/1997_nissan_200sx_s14.glb', category: 'vehicle', targetSize: 4.52, maxVerts: 5500, maxImgDim: 256 },
  { src: '2015_dodge_charger_srt_hellcat.glb', dst: 'Vehicles/2015_dodge_charger_srt_hellcat.glb', category: 'vehicle', targetSize: 5.05, maxVerts: 5500, maxImgDim: 256 },
  { src: '2015_mercedes-benz_s65_amg_coupe.glb', dst: 'Vehicles/2015_mercedes-benz_s65_amg_coupe.glb', category: 'vehicle', targetSize: 5.02, maxVerts: 5500, maxImgDim: 256 },
  { src: '2018_audi_e-tron_gt_concept.glb', dst: 'Vehicles/2018_audi_e-tron_gt_concept.glb', category: 'vehicle', targetSize: 4.98, maxVerts: 5500, maxImgDim: 256 },
  { buf: ferrari296Glb, dst: 'Vehicles/2026_ferrari_296_speciale_a.glb', category: 'vehicle', targetSize: 4.65, maxVerts: 5500, maxImgDim: 256, rotZUpToYUp: true },
  { src: 'ferrari_f40_modified.glb', dst: 'Vehicles/ferrari_f40_modified.glb', category: 'vehicle', targetSize: 4.46, maxVerts: 5500, maxImgDim: 256 },
  { src: 'dodge_ram_1500_rebel.glb', dst: 'Vehicles/dodge_ram_1500_rebel.glb', category: 'vehicle', targetSize: 5.80, maxVerts: 5000, maxImgDim: 256 },
  { src: 'fuel_truck.glb', dst: 'Vehicles/fuel_truck.glb', category: 'vehicle', targetSize: 10.50, maxVerts: 5000, maxImgDim: 256 },
  { src: 'isuzu_cargo_base_truck.glb', dst: 'Vehicles/isuzu_cargo_base_truck.glb', category: 'vehicle', targetSize: 6.80, maxVerts: 5000, maxImgDim: 256 },
  { src: 'tata_signa_cargo_truck__low_poly_game_ready_pbr.glb', dst: 'Vehicles/tata_signa_cargo_truck.glb', category: 'vehicle', targetSize: 9.20, maxVerts: 3500, maxImgDim: 256 },
  { src: 'uaz_469_un.glb', dst: 'Vehicles/uaz_469_un.glb', category: 'vehicle', targetSize: 4.35, maxVerts: 5000, maxImgDim: 256 },

  // Weapons
  { src: 'bereta_silver.glb', dst: 'Weapons/bereta_silver.glb', category: 'weapon', targetSize: 0.24, maxVerts: 1200, maxImgDim: 128 },
  { src: 'semi-automatic_pistol_glock_fan_art.glb', dst: 'Weapons/glock_pistol.glb', category: 'weapon', targetSize: 0.26, maxVerts: 1800, maxImgDim: 128 },
  { src: 'hk416.glb', dst: 'Weapons/hk416.glb', category: 'weapon', targetSize: 0.80, maxVerts: 2400, maxImgDim: 256 },
  { src: 'gewehr_41_w_low-poly.glb', dst: 'Weapons/gewehr_41.glb', category: 'weapon', targetSize: 0.96, maxVerts: 2200, maxImgDim: 128 },
  { src: 'lead_pipe__old_rusty_and_bloody.glb', dst: 'Weapons/lead_pipe.glb', category: 'weapon', targetSize: 0.65, maxVerts: 1200, maxImgDim: 128 },
  { src: 'crowbar.glb', dst: 'Weapons/crowbar.glb', category: 'weapon', targetSize: 0.68, maxVerts: 1400, maxImgDim: 128 },
  { src: 'claw_hammer.glb', dst: 'Weapons/claw_hammer.glb', category: 'weapon', targetSize: 0.40, maxVerts: 1000, maxImgDim: 128 },

  // Animals
  { src: 'brown_cow_3d_model.glb', dst: 'Animals/cow.glb', category: 'animal', targetSize: 1.22, maxVerts: 3200, maxImgDim: 256 },

  // Characters
  { src: 'all_in_one_hecu_gmodgarrys_mod.glb', dst: 'Characters/hecu_soldier.glb', category: 'character', targetSize: 1.80, maxVerts: 4000, maxImgDim: 256, rotZUpToYUp: true },
  { src: 'ins_s_bill_gmodgarrys_mod.glb', dst: 'Characters/commando_bill.glb', category: 'character', targetSize: 1.80, maxVerts: 4000, maxImgDim: 256, rotZUpToYUp: true },
  { src: 'executive_in_a_navy_suit.glb', dst: 'Characters/executive_suit.glb', category: 'character', targetSize: 1.80, maxVerts: 3200, maxImgDim: 256 },
  { src: 'casual_confidence.glb', dst: 'Characters/casual_confidence.glb', category: 'character', targetSize: 1.80, maxVerts: 3200, maxImgDim: 256 },
  { src: 'criss-cross_pink_marble_mini_dress.glb', dst: 'Characters/pink_mini_dress.glb', category: 'character', targetSize: 1.76, maxVerts: 3200, maxImgDim: 256 },
  { src: 'bluevinyl.glb', dst: 'Characters/bluevinyl.glb', category: 'character', targetSize: 1.78, maxVerts: 3200, maxImgDim: 256 },
  { src: 'ho3fat.glb', dst: 'Characters/chambray_street.glb', category: 'character', targetSize: 1.78, maxVerts: 3500, maxImgDim: 256 },
  { buf: runnerGlb, dst: 'Characters/runner.glb', category: 'character', targetSize: 1.80, maxVerts: 3200, maxImgDim: 256 },
  { buf: tifaGlb, dst: 'Characters/tifa_vip.glb', category: 'character', targetSize: 1.76, maxVerts: 3200, maxImgDim: 256 },
  { src: 'low_poly_primitive_caveman_3d_model_free.glb', dst: 'Characters/caveman_statue.glb', category: 'character', targetSize: 1.85, maxVerts: 2800, maxImgDim: 256 },

  // Landmarks & Buildings
  { src: 'old_factory_free.glb', dst: 'Landmarks/old_factory.glb', category: 'landmark', targetSize: 22.0, maxVerts: 4500, maxImgDim: 128 },
  { src: 'lost_judgement_-_court.glb', dst: 'Landmarks/court_hall.glb', category: 'landmark', targetSize: 24.0, maxVerts: 5000, maxImgDim: 128 },
  { src: 'wooden_watchtower.glb', dst: 'Landmarks/wooden_watchtower.glb', category: 'landmark', targetSize: 6.5, maxVerts: 2800, maxImgDim: 128 },
  { src: '64_settlement_road_-_hills_estate.glb', dst: 'Landmarks/hills_estate.glb', category: 'landmark', targetSize: 24.0, maxVerts: 5000, maxImgDim: 128 },
  { src: 'modular_house_l_garage_l_shed_l_pool_l_kit.glb', dst: 'Landmarks/modular_house.glb', category: 'landmark', targetSize: 18.0, maxVerts: 4500, maxImgDim: 128 },
  { src: 'jasons_house_gta_6_no_ai_wip.glb', dst: 'Landmarks/jasons_house.glb', category: 'landmark', targetSize: 16.0, maxVerts: 3500, maxImgDim: 128 },
  { src: 'simple_house_placeholderbackgroundwip.glb', dst: 'Landmarks/simple_house.glb', category: 'landmark', targetSize: 12.0, maxVerts: 1600, maxImgDim: 128 },
  { src: 'medieval_house_pack_pixel_art.glb', dst: 'Landmarks/heritage_house.glb', category: 'landmark', targetSize: 14.0, maxVerts: 3500, maxImgDim: 128 },
  { src: 'street_city_7_for_games_free.glb', dst: 'Landmarks/street_city_block.glb', category: 'landmark', targetSize: 26.0, maxVerts: 4500, maxImgDim: 128 },
  { src: 'street.glb', dst: 'Landmarks/urban_street_scene.glb', category: 'landmark', targetSize: 26.0, maxVerts: 4500, maxImgDim: 128 },

  // Interiors
  { src: 'modular_vintage_living_room_-_game_ready_pbr.glb', dst: 'Interiors/living_room.glb', category: 'interior', targetSize: 14.0, maxVerts: 5000, maxImgDim: 128 },
  { src: 'free_loft_18_mini_office_v.optimization.glb', dst: 'Interiors/mini_office.glb', category: 'interior', targetSize: 16.0, maxVerts: 5000, maxImgDim: 128 },
  { src: 'free_loft_17_interior_floors_view_of_the_city..glb', dst: 'Interiors/city_loft.glb', category: 'interior', targetSize: 18.0, maxVerts: 5000, maxImgDim: 128 },
  { src: 'interior_15__minimalist_panoramic_viem.glb', dst: 'Interiors/panoramic_penthouse.glb', category: 'interior', targetSize: 18.0, maxVerts: 4500, maxImgDim: 128 },
  { src: 'the_interior_14_is_spacious..glb', dst: 'Interiors/spacious_hall.glb', category: 'interior', targetSize: 18.0, maxVerts: 5000, maxImgDim: 128 },

  // Props
  { src: 'wood_furniture_pack.glb', dst: 'Props/wood_furniture.glb', category: 'prop', targetSize: 1.4, maxVerts: 4000, maxImgDim: 128 },
  { src: 'animated_doors_and_a_window_demo.glb', dst: 'Props/doors_window.glb', category: 'prop', targetSize: 2.2, maxVerts: 2800, maxImgDim: 128 },
  { src: 'air_conditioner.glb', dst: 'Props/air_conditioner.glb', category: 'prop', targetSize: 0.65, maxVerts: 1500, maxImgDim: 128 },
  { src: 'cc0_newspaper_stack_-_ready_to_unity_hdrp.glb', dst: 'Props/newspaper_stack.glb', category: 'prop', targetSize: 0.42, maxVerts: 1200, maxImgDim: 128 },

  // Vegetation
  { src: 'game_ready_grass.glb', dst: 'Vegetation/game_ready_grass.glb', category: 'vegetation', targetSize: 0.85, maxVerts: 800, maxImgDim: 128 },
  { src: 'mud_grassland.glb', dst: 'Vegetation/mud_grassland.glb', category: 'vegetation', targetSize: 1.40, maxVerts: 2400, maxImgDim: 128 },
];

for (const job of JOBS) {
  const inputBuf = job.buf || fs.readFileSync(job.src);
  const outPath = path.join('unity/Assets/Rise/Resources/Models', job.dst);
  optimizeStaticGlb(inputBuf, outPath, job);
}
