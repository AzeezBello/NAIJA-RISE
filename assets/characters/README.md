# Character assets

Drop the production rig here as `player.glb` and it is picked up automatically (rig 0 in `CHARACTER.rigs`,
`src/data/config.js`). Until then the game streams the Ready Player Me sample avatar bundled with three.js (hoodie,
jeans, sneakers) animated with Ready Player Me's locomotion clips; pedestrians also use Mixamo's Michelle and the
Khronos CesiumMan, all real humans. If `player.glb` has no Idle/Walk/Run clips of its own, the RPM clips are used —
Ready Player Me's licence only allows those clips on RPM avatars, so bake your own clips into a non-RPM rig.

Requirements for `player.glb`:

- One skinned mesh (or several) on a **Mixamo-compatible skeleton** (`Hips … Head`, with or without the `mixamorig`
  prefix). Accessories attach to the rig's `headBone` (`Head` for RPM naming); change it in config if yours differs.
- Animation clips named **Idle**, **Walk** and **Run** (in place, no root motion). Extra clips are ignored for now.
- Materials named like Ready Player Me's so the customiser can dress it: `Wolf3D_Outfit_Top` (wears the fabric print or
  its colour), `Wolf3D_Outfit_Bottom`, `Wolf3D_Outfit_Footwear`, `Wolf3D_Body` / `Wolf3D_Skin`, `Wolf3D_Beard`,
  `Wolf3D_Headwear` — or edit the rig's `slots` regexes in config.
- Faces -Z (the Mixamo / Blender default). Any height is fine: the loader rescales to `CHARACTER.height`.
- Keep it under ~3 MB (Draco or Meshopt compression is fine once a decoder is wired into `character.js`).

Recommended pipelines:

1. **Ready Player Me** avatar (`?quality=low&meshLod=1`) + Mixamo animations retargeted in Blender → export GLB.
2. **Custom Blender rig** for proper Nigerian faces, hair (afro, braids, fade) and outfits (ankara, agbada,
   buba and sokoto) — rig with Mixamo auto-rigger or Rigify, bake Idle/Walk/Run, export GLB.
