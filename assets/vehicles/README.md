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

The Unity project in `../../unity` loads the Kenney kit from `unity/Assets/NaijaRise/Resources/Models/Vehicles` (a copy
of `kenney/`, including the licence) through glTFast with the Meshopt decoder, so the compressed files import as they
are. `VehicleBodies.cs` maps classes to models (sedan, SUV, hatchback and taxi for cars; police, garbage truck, fire
truck, ambulance, van, delivery, truck), scales each to its class length and spins the `wheel-*` nodes; the Lagos
vehicles (danfo, keke, korope, okada, BRT, tanker) stay procedural there. The other folders here are not used by Unity
yet; they import the same way.
