# Character assets

Drop the production rig here as `player.glb` and it is picked up automatically (see `CHARACTER.urls` in
`src/data/config.js`). Until then the game streams the three.js `Soldier.glb` as a development placeholder.

Requirements for `player.glb`:

- One skinned mesh (or several) on a **Mixamo-compatible skeleton** (`mixamorigHips … mixamorigHead`).
  Accessories attach to `mixamorigHead`; change `CHARACTER.headBone` if your rig names it differently.
- Animation clips named **Idle**, **Walk** and **Run** (in place, no root motion). Extra clips are ignored for now.
- Materials named so the customiser can tint them: `skin`/`body`, `hair`, `top`/`shirt`, `pants`/`bottom`, `shoes`.
- Faces -Z (the Mixamo / Blender default). Any height is fine: the loader rescales to `CHARACTER.height`.
- Keep it under ~3 MB (Draco or Meshopt compression is fine once a decoder is wired into `character.js`).

Recommended pipelines:

1. **Ready Player Me** avatar (`?quality=low&meshLod=1`) + Mixamo animations retargeted in Blender → export GLB.
2. **Custom Blender rig** for proper Nigerian faces, hair (afro, braids, fade) and outfits (ankara, agbada,
   buba and sokoto) — rig with Mixamo auto-rigger or Rigify, bake Idle/Walk/Run, export GLB.
