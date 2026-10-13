# Vehicle GLBs

Vehicle assets are grouped by source or vehicle class:

- `danfo/`, `keke/`, `korope/`, and `okada/` contain Lagos-specific transport.
- `buses/`, `heavy/`, `motorcycles/`, `pickups/`, and `vans/` contain the
  individually sourced fleet models.
- `kenney/` keeps the Kenney vehicle kit together as a licensed asset pack.

`src/data/vehicles.js` registers every model family for traffic spawning, and
`src/entities/vehicleModels.js` maps model names to their GLB paths. When adding
or moving a model, update both the model registry and path mapping.


## Unity edition

The Unity project in `../../unity` builds vehicles procedurally (`Assets/NaijaRise/Scripts/Vehicles/VehicleBodies.cs`)
and does not load these GLBs yet. To use them there: add `com.unity.cloud.gltfast` to `unity/Packages/manifest.json`,
decompress the Meshopt-compressed files first (Unity's glTF importer does not decode Meshopt), and import them under
`unity/Assets/NaijaRise/Models/`. The Kenney kit's CC0 licence applies unchanged; see `LICENSES.md`.
