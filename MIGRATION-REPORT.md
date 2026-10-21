# RISE — Verification, Migration & Release Report

Updated **21 October 2026** on `feat/unity-slice-urp` (following PR #12 / `f3b5758`), macOS 15.8.1, Unity `6000.6.5f1`, Node `22+`.

This report records the reproducible build, test, and verification commands, their actual outputs, the fixes applied for the October 21 repository review, and the remaining hardware/live-service gates.

---

## 1. Reproducible Verification Matrix (21 October 2026)

| Check | Command | Result | What It Proves | Remaining Scope / Hardware Needed |
|---|---|---|---|---|
| **Data & District / State Integrity** | `npm run check` | **PASS** — `307 places, 34 jobs, 108 contact runs, 0 errors, 3 warnings` | Every module in `src/data/districts/` (16 modules) and `src/data/states/` (6 multi-state modules) parses; all jobs, contacts, and runs resolve to valid places with zero duplicate IDs or road overlaps | Does not test runtime rendering |
| **Unity World Export Sync** | `node scripts/export-world.mjs && git diff --exit-code unity/Assets/Rise/Resources/world/lagos.json` | **PASS** — `119 roads, 144 segments, 4 bridges, 245 junctions, 230 landmarks, 78 bus stops, 15 properties, 85 regions, 102 cells, 106 contacts, 34 jobs, 18 vehicle classes` | Committed `lagos.json` matches a clean export from `src/data/` | — |
| **Next.js Companion & Admin Build** | `npm run web:build` | **PASS** — Static & dynamic routes (`/`, `/play`, `/account`, `/admin`, `/api/economy`) compile cleanly | TypeScript types, `/play` embed shell, `/account`, and admin-authenticated `/api/economy` compile with 0 errors | Live Render env vars must include `ADMIN_ACCESS_TOKEN` |
| **Unity C# Script Compilation (Runtime + Editor)** | Roslyn `csc.dll` compile of `Assembly-CSharp.dll` & `Assembly-CSharp-Editor.dll` | **PASS** — `0 errors` | All runtime systems (`Session*.cs`, `WorldBuilder.cs`, `Hud.cs`, `CloudEconomy.cs`, `CharacterRig.cs`, `SoundSystem.cs`) and editor tests (`PlayTest.cs`, `SceneSetup.cs`) compile cleanly | — |
| **Unity Edit-Mode Smoke Test** | `Unity -batchmode -quit -nographics -projectPath unity -executeMethod Rise.EditorTools.SceneSetup.SmokeTest` | **PASS** — `104 roads, 171 landmarks, >7,000 objects`, 7 character animation clips (`idle`, `walk`, `run`, `jump`, `turn`, `enter_vehicle`, `exit_vehicle`), URP shaders present, 18 vehicle classes fitted | City geometry, bridges, character rigs, fabrics, and vehicle GLBs build cleanly in Edit Mode | Null graphics device does not measure real GPU frame time |
| **Unity Play-Mode Automated Suite** | `Unity -batchmode -nographics -projectPath unity -executeMethod Rise.EditorTools.PlayTest.Run` | **PASS** — `150+ checks` across prologue, jobs, housing, 3D interiors, indoor missions, clubbing, historic timeline, politicians, fraudsters, JTF spec-ops, co-op race/getaway/convoy, live economy overrides, and UI/UX/graphics audit | End-to-end game state machine, menus, collisions, navigation, and loopback co-op work without exceptions | Headless run; physical device profiling required for iPhone / Console frame rates |

---

## 2. Fixes Applied for the 21 October 2026 Audit

### 2.1 Blank WebGL / Standalone Scene Safeguards (`GameBootstrap.cs` & `SceneSetup.cs`)
- **Root Cause Identified**:
  1. If a build boots an empty scene or if `Lagos.unity` is not the active scene in `EditorBuildSettings`, Unity renders only an empty skybox camera.
  2. If a browser's `IndexedDB` (`PlayerPrefs`) holds a stale or partial save from an earlier schema where `px/py/pz` or `day` is `NaN` or out of vertical range, `GameBootstrap.Awake()` could place the player underground or abort before `Hud` and `ThirdPersonCamera` attach.
  3. `SceneSetup.SmokeTest()` previously checked `anim.GetClipCount() == 3`, which needed updating to `>= 7 && HasExtendedClips(anim)` after adding `jump`, `turn`, `enter_vehicle`, and `exit_vehicle`.
- **Fixes**:
  - Added `[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]` (`GameBootstrap.EnsureBootstrapped()`) so if any scene loads without `GameBootstrap`, it automatically spawns `Game` + `GameBootstrap` and builds Lagos.
  - Added `try/catch` save-load recovery and coordinate bounds sanitization (`spawn.y` clamped/re-sampled via `Data.DeckHeightAt(spawn) + 0.6f` if out of `[-10, 250]` or `NaN`) in `GameBootstrap.Awake()`.
  - Updated `SceneSetup.SmokeTest()` to verify all 7 character animation clips.

### 2.2 Online Economy Security, Live Session Propagation & Server-Side Validation
- **Administrator Authentication (`web/app/api/economy/route.ts` & `web/app/admin/EconomyEditor.tsx`)**:
  - `POST /api/economy` now verifies administrator permissions via `verifyAdminRequest()`: it checks `x-admin-token` / `Authorization: Bearer <token>` against `ADMIN_ACCESS_TOKEN` / `SUPABASE_SERVICE_ROLE_KEY`, or validates a Supabase Auth JWT whose user has `app_metadata.role === 'admin'` or an email in `ADMIN_EMAILS`. Unauthorized requests return `401 Unauthorized`.
  - `supabase/schema.sql` explicitly revokes `INSERT, UPDATE, DELETE` on `public.economy_config` from `public, anon, authenticated`.
- **Live Propagation to Running Game Sessions (`unity/Assets/Rise/Scripts/Net/CloudEconomy.cs`)**:
  - Upgraded `CloudEconomy` from a one-shot boot fetch to a live polling coroutine (`LivePollLoop`, default every `45s`, plus `RefreshNow()`) with `Cache-Control: no-cache` and `LastUpdatedAt` change detection. When `/admin` updates payouts or constants, running Unity sessions hot-apply the new values in memory and surface a live HUD toast (`OnLiveUpdate`).
- **Server-Side Balance & Reward Validation (`supabase/schema.sql`)**:
  - Added `public.validate_save_state()` (`BEFORE INSERT OR UPDATE` trigger on `public.saves`) to reject negative `cash` or `bank` balances, enforce `level` between `1` and `100`, and reject single-save balance jumps exceeding `₦50,000,000`.
  - Added `public.claim_verified_reward(p_kind, p_reward_id, p_slot)` (`SECURITY DEFINER` RPC granted only to `authenticated`) to look up authoritative payouts in `public.economy_config` on the server and credit `public.saves` directly.

### 2.3 GitHub Actions CI Trigger (`web.yml`)
- Updated `.github/workflows/web.yml` to declare explicit branch triggers (`branches: ['**']`) on `push` and `pull_request` plus `workflow_dispatch:` so merges to `main` and feature branches always report workflow runs.

---

## 3. Platform & Deployment Status Assessment

| Platform / Area | Current Verified State | Remaining Hardware / Live Verification |
|---|---|---|
| **Unity Core (macOS)** | Compiles cleanly; Edit-mode SmokeTest and Play-mode PlayTest pass; universal binary (`Builds/Rise-Lagos.app`) builds | Profile 60 fps frame-time percentiles on Apple Silicon & Intel GPU across rainy night traffic |
| **WebGL (`/play`)** | `Builds/WebGL` + `WebGL.zip` packaged with Gzip + decompression fallback; `EnsureBootstrapped()` prevents blank scenes | Verify cold-cache load time and IndexedDB save persistence on hosted `NEXT_PUBLIC_WEBGL_URL` in Chrome, Safari, and Firefox |
| **iPhone / Android** | `TouchControls` virtual joystick/buttons, `GameBootstrap.Mobile` crowd/house budgets (`TrafficCount=54, PedestrianCount=32, MaxHouses=2200, 30 fps`), and `BuildiOS` / `BuildAndroid` configured | Deploy Xcode archive to a physical iPhone to measure thermal throttling, memory footprint, and touch ergonomics |
| **PlayStation, Xbox & Switch** | `Rise.inputactions` (6 control schemes) and `SceneSetup.PlatformTargets` configured | Requires licensed console SDK modules and physical devkits |
| **Supabase Online Services** | `supabase/schema.sql` defines RLS on `players`, `saves`, `crews`, `crew_members`, `economy_config`, `validate_save_state` trigger, and `claim_verified_reward` RPC | Run `supabase/schema.sql` in the live Supabase SQL Editor and set `ADMIN_ACCESS_TOKEN` + `SUPABASE_SERVICE_ROLE_KEY` in Render |
