# Vehicle GLBs

Vehicle assets are grouped by source or vehicle class:

- `danfo/`, `keke/`, `korope/`, and `okada/` contain Lagos-specific transport.
- `buses/`, `heavy/`, `motorcycles/`, `pickups/`, and `vans/` contain the
  individually sourced fleet models.
- `kenney/` keeps the Kenney vehicle kit together as a licensed asset pack.

`src/data/vehicles.js` registers every model family for traffic spawning, and
`src/entities/vehicleModels.js` maps model names to their GLB paths. When adding
or moving a model, update both the model registry and path mapping.
