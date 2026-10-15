using UnityEngine;
using Rise.Data;
using Rise.Entities;
using Rise.Vehicles;

namespace Rise.World
{
    // ?diag=showroom: one of every vehicle class in two rows in front of the player, fronts turned towards the camera, each
    // labelled with its class and the model asset fitted. For checking imported GLBs (scale, facing, paint) on sight.
    public static class Showroom
    {
        public static int Build(WorldData data, Transform player, Transform parent)
        {
            var root = new GameObject("Showroom").transform; root.SetParent(parent, false);
            var fwd = Vector3.ProjectOnPlane(player.forward, Vector3.up).normalized; if (fwd.sqrMagnitude < 0.01f) fwd = Vector3.forward;
            var right = Vector3.Cross(Vector3.up, fwd);
            int n = data.vehicleClasses.Length, perRow = Mathf.CeilToInt(n / 2f), count = 0;
            for (int i = 0; i < n; i++)
            {
                var cls = data.vehicleClasses[i];
                var body = VehicleBodies.Build(cls, root, new System.Random(7 + i), out _);
                int row = i / perRow, col = i % perRow;
                var pos = player.position + fwd * (14f + row * 12f) + right * ((col - (perRow - 1) * 0.5f) * 8f);
                pos.y = data.DeckHeightAt(pos) + 0.12f;
                body.transform.position = pos;
                body.transform.rotation = Quaternion.LookRotation(-fwd, Vector3.up);   // front towards the player
                foreach (var c in body.GetComponentsInChildren<Collider>()) Object.Destroy(c);
                var info = body.GetComponent<VehicleModelInfo>();
                Mannequin.Label(body.transform, cls.id + (info != null ? "\n" + info.Model : "\n(procedural)"), Color.white, (info != null ? info.Height : 2f) + 0.8f, 0.45f);
                count++;
            }
            return count;
        }
    }
}
