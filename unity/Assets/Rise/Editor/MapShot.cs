#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Rise.EditorTools
{
    // Renders a top-down view of part of the map with every contact's standing spot marked (yellow posts), to check where
    // places and people land without playing. Area in data coordinates from RISE_MAP_AREA="minX,maxX,minZ,maxZ"
    // (default: Surulere West · Ikate). Output: Builds/map-shot.png, or RISE_MAP_OUT.
    //   Unity -batchmode -quit -projectPath unity -executeMethod Rise.EditorTools.MapShot.Render -logFile -
    public static class MapShot
    {
        [MenuItem("RISE/Render Map Shot")]
        public static void Render()
        {
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            ShaderSetup.Prepare();
            var data = Data.WorldData.LoadFromResources();
            var host = new GameObject("MapShot");
            host.AddComponent<World.WorldBuilder>().Build(data);
            var sun = new GameObject("Sun").AddComponent<Light>(); sun.type = LightType.Directional; sun.intensity = 1.1f; sun.transform.rotation = Quaternion.Euler(60f, -30f, 0f);
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat; RenderSettings.ambientLight = new Color(0.6f, 0.6f, 0.62f);
            RenderSettings.fog = false;

            var marker = new Material(ShaderLib.Unlit) { color = new Color(1f, 0.85f, 0.1f) };
            var streetMarker = new Material(ShaderLib.Unlit) { color = new Color(0.1f, 0.45f, 1f) };
            foreach (var l in data.landmarks)
                if (l.kind == "street")
                {
                    var sq = GameObject.CreatePrimitive(PrimitiveType.Cube); sq.transform.SetParent(host.transform, false);
                    sq.transform.position = l.World(12f); sq.transform.localScale = new Vector3(2.4f, 0.5f, 2.4f);
                    sq.GetComponent<MeshRenderer>().sharedMaterial = streetMarker;
                }
            foreach (var c in data.contacts)
                if (data.ContactSpot(c, out var w))
                {
                    var post = GameObject.CreatePrimitive(PrimitiveType.Cylinder); post.transform.SetParent(host.transform, false);
                    post.transform.position = w + Vector3.up * 6f; post.transform.localScale = new Vector3(1.6f, 6f, 1.6f);
                    post.GetComponent<MeshRenderer>().sharedMaterial = marker;
                }

            float minX = -205, maxX = -55, minZ = -125, maxZ = 25;
            var area = System.Environment.GetEnvironmentVariable("RISE_MAP_AREA");
            if (!string.IsNullOrEmpty(area)) { var p = area.Split(','); minX = float.Parse(p[0]); maxX = float.Parse(p[1]); minZ = float.Parse(p[2]); maxZ = float.Parse(p[3]); }
            int px = 1600, pz = Mathf.RoundToInt(px * (maxZ - minZ) / (maxX - minX));
            var rt = new RenderTexture(px, pz, 24) { antiAliasing = 4 };
            var cam = new GameObject("MapCam").AddComponent<Camera>();
            cam.orthographic = true; cam.orthographicSize = (maxZ - minZ) * 0.5f; cam.aspect = (float)px / pz; cam.targetTexture = rt;
            cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = Color.black; cam.nearClipPlane = 1f; cam.farClipPlane = 400f;
            cam.transform.position = Data.WorldData.W((minX + maxX) * 0.5f, 200f, (minZ + maxZ) * 0.5f);
            cam.transform.rotation = Quaternion.Euler(90f, 0f, 0f);   // north (data -z, world +z) up
            cam.Render();
            var tex = new Texture2D(px, pz, TextureFormat.RGB24, false);
            RenderTexture.active = rt; tex.ReadPixels(new Rect(0, 0, px, pz), 0, 0); tex.Apply(); RenderTexture.active = null;
            string outPath = System.Environment.GetEnvironmentVariable("RISE_MAP_OUT");
            if (string.IsNullOrEmpty(outPath)) outPath = Path.GetFullPath("Builds/map-shot.png");
            Directory.CreateDirectory(Path.GetDirectoryName(outPath));
            File.WriteAllBytes(outPath, tex.EncodeToPNG());
            Debug.Log($"RISE map shot ({minX},{maxX})x({minZ},{maxZ}) written to {outPath}");
            Object.DestroyImmediate(cam.gameObject); Object.DestroyImmediate(host); Object.DestroyImmediate(sun.gameObject);
            rt.Release();
        }
    }
}
#endif
