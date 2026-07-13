#!/usr/bin/env python3
"""
ingest_creature.py — normalize ANY ChatGPT creature package into a small, RN-ready,
MODULAR per-species runtime package, and regenerate the species registry.

It reads the material -> texture bindings **straight from the GLB** (materials + embedded
images), so it is agnostic to how `materials.json` happens to be shaped across ChatGPT
generations (map, wrapped map, or a bare list — all seen in the wild). It does not need the
external `textures/` folder or `materials.json` at all.

Why: ChatGPT ships each creature with EMBEDDED textures (which don't decode on React Native)
that are usually FLAT solid colours. This tool bakes flat colours into the GLB as
baseColorFactor + metallic/roughnessFactor (three applies them natively — no texture load),
strips embedded images (GLB shrinks ~10x), and keeps only genuinely-detailed textures (the
face) as small external PNGs. Metalness is clamped because expo-gl has no environment map
(a fully-metallic material with no env map renders black).

Per-species output  ->  app/assets/buddies/<id>/
  model/<id>.glb        geometry + baked factors (no embedded textures)
  textures/*.png        only the detailed (face) textures, downscaled
  species.json          SDK-conformant species definition
  materials.json        { externalTextures } — what the renderer loads at runtime
  anchors.json mastery.json runtime_spec.json   (carried / normalized when present)
  meta.json             provenance: source, before/after sizes, baked colours

Registry (generated) -> app/src/core/buddies/registry.generated.ts   (static require()s)

Usage:
  python3 tools/ingest_creature.py <src_package_dir> <id> [displayName]
  python3 tools/ingest_creature.py --batch <manifest.json>   # [{"src","id","name"}, ...]
"""
import json, struct, os, sys
from io import BytesIO
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
BUDDIES_DIR = os.path.join(APP, "assets", "buddies")
SDK_CONFIG = os.path.join(BUDDIES_DIR, "_sdk", "shared", "sdk_config.json")
REGISTRY_TS = os.path.join(APP, "src", "core", "buddies", "registry.generated.ts")

FLAT_FAR_FRAC = 0.02     # <2% of pixels stray from the mean => flat solid colour
FLAT_EPS = 24            # per-channel deviation (0..255) that counts as "different"
FACE_MAX_PX = 512        # downscale kept (detailed) textures to this
METAL_CLAMP = 0.20       # cap metalness: expo-gl has no env map, full metal => black


def srgb_to_linear(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin_to_srgb255(x):
    return round(255 * (x * 12.92 if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055))


def analyze_image(im):
    """(is_spatially_flat, avg_rgba_0_255, far_fraction). Few colours != flat: the face is
    dark with tiny bright eyes — spatially detailed — so it must stay a real texture."""
    im = im.convert("RGBA")
    colors = im.getcolors(maxcolors=10_000_000) or []
    tot = [0, 0, 0, 0]; cnt = 0
    for count, px in colors:
        for i in range(4):
            tot[i] += px[i] * count
        cnt += count
    avg = [t / cnt for t in tot]
    small = im.resize((64, 64), Image.BILINEAR)
    px = list(small.getdata())
    far = sum(1 for p in px if max(abs(p[i] - avg[i]) for i in range(3)) > FLAT_EPS) / len(px)
    return (far < FLAT_FAR_FRAC), avg, far


def parse_glb(path):
    raw = open(path, "rb").read()
    off = 12
    clen, _ = struct.unpack("<II", raw[off:off + 8])
    gltf = json.loads(raw[off + 8:off + 8 + clen])
    bin_off = off + 8 + clen
    blen, _ = struct.unpack("<II", raw[bin_off:bin_off + 8])
    BIN = raw[bin_off + 8:bin_off + 8 + blen]
    return gltf, BIN


def write_glb(gltf, new_bin, out_path):
    json_bytes = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    while len(json_bytes) % 4 != 0:
        json_bytes += b" "
    while len(new_bin) % 4 != 0:
        new_bin.append(0)
    total = 12 + 8 + len(json_bytes) + 8 + len(new_bin)
    out = bytearray()
    out += struct.pack("<III", 0x46546C67, 2, total)
    out += struct.pack("<II", len(json_bytes), 0x4E4F534A) + json_bytes
    out += struct.pack("<II", len(new_bin), 0x004E4942) + bytes(new_bin)
    open(out_path, "wb").write(out)


def find_glb(src):
    for dp, _, fs in os.walk(os.path.join(src, "model")):
        for f in fs:
            if f.endswith(".glb"):
                return os.path.join(dp, f)
    raise FileNotFoundError(f"no .glb under {src}/model")


def optimize(src, species_id, display_name):
    """Produce app/assets/buddies/<id>/ from a package's GLB and return a registry-ready dict."""
    dst = os.path.join(BUDDIES_DIR, species_id)
    os.makedirs(os.path.join(dst, "model"), exist_ok=True)
    os.makedirs(os.path.join(dst, "textures"), exist_ok=True)

    glb_in = find_glb(src)
    src_glb_size = os.path.getsize(glb_in)
    gltf, BIN = parse_glb(glb_in)
    bvs = gltf["bufferViews"]
    images = gltf.get("images", [])
    textures = gltf.get("textures", [])
    img_bv = set(im["bufferView"] for im in images if "bufferView" in im)

    def image_index_of(tex_index):
        return textures[tex_index].get("source") if 0 <= tex_index < len(textures) else None

    def image_png(ii):
        bv = bvs[images[ii]["bufferView"]]
        o = bv.get("byteOffset", 0)
        return BIN[o:o + bv["byteLength"]]

    analyzed = {}  # image_index -> (flat, avg, far)

    def analyze_ii(ii):
        if ii not in analyzed:
            analyzed[ii] = analyze_image(Image.open(BytesIO(image_png(ii))))
        return analyzed[ii]

    def tex_index(node):
        return node["index"] if isinstance(node, dict) and "index" in node else None

    kept_external = {}   # matName -> {slot: image_index}
    baked = {}
    for mat in gltf.get("materials", []):
        mname = mat.get("name", f"mat_{len(baked)}")
        pbr = mat.setdefault("pbrMetallicRoughness", {})
        ext = {}

        bt = tex_index(pbr.get("baseColorTexture"))
        if bt is not None and image_index_of(bt) is not None:
            ii = image_index_of(bt)
            flat, avg, _ = analyze_ii(ii)
            if flat:
                pbr["baseColorFactor"] = [srgb_to_linear(avg[0]), srgb_to_linear(avg[1]),
                                          srgb_to_linear(avg[2]), 1.0]
            else:
                ext["map"] = ii
                pbr.setdefault("baseColorFactor", [1, 1, 1, 1])
        pbr.pop("baseColorTexture", None)

        mt = tex_index(pbr.get("metallicRoughnessTexture"))
        if mt is not None and image_index_of(mt) is not None:
            _, avg, _ = analyze_ii(image_index_of(mt))     # glTF: G=rough, B=metal
            pbr["roughnessFactor"] = round(avg[1] / 255.0, 4)
            pbr["metallicFactor"] = round(min(avg[2] / 255.0, METAL_CLAMP), 4)
        pbr.pop("metallicRoughnessTexture", None)

        et = tex_index(mat.get("emissiveTexture"))
        if et is not None and image_index_of(et) is not None:
            flat, _, _ = analyze_ii(image_index_of(et))
            mat.setdefault("emissiveFactor", [1, 1, 1])
            if not flat:
                ext["emissiveMap"] = image_index_of(et)
        mat.pop("emissiveTexture", None)

        if ext:
            kept_external[mname] = ext
        bcf = pbr.get("baseColorFactor", [1, 1, 1, 1])
        baked[mname] = {
            "baseColor_sRGB": [lin_to_srgb255(bcf[0]), lin_to_srgb255(bcf[1]), lin_to_srgb255(bcf[2])],
            "roughness": pbr.get("roughnessFactor"), "metalness": pbr.get("metallicFactor"),
            "external": list(ext.keys()),
        }

    # write kept (detailed) images to external PNGs BEFORE stripping the buffer (dedup by image)
    mat_tex_out = {}
    written = {}  # image_index -> filename
    for mname, ext in kept_external.items():
        slot_map = {}
        for slot, ii in ext.items():
            if ii not in written:
                fn = f"tex_{ii}.png"
                im = Image.open(BytesIO(image_png(ii))).convert("RGBA")
                if max(im.size) > FACE_MAX_PX:
                    s = FACE_MAX_PX / max(im.size)
                    im = im.resize((round(im.size[0] * s), round(im.size[1] * s)), Image.LANCZOS)
                im.save(os.path.join(dst, "textures", fn), optimize=True)
                written[ii] = fn
            slot_map[slot] = written[ii]
        mat_tex_out[mname] = slot_map

    # strip embedded images, reindex geometry bufferViews
    keep = [i for i in range(len(bvs)) if i not in img_bv]
    remap = {old: new for new, old in enumerate(keep)}
    new_bin = bytearray()
    new_bvs = []
    for old in keep:
        bv = dict(bvs[old])
        data = BIN[bv.get("byteOffset", 0): bv.get("byteOffset", 0) + bv["byteLength"]]
        while len(new_bin) % 4 != 0:
            new_bin.append(0)
        bv["byteOffset"] = len(new_bin)
        new_bvs.append(bv)
        new_bin += data
    for a in gltf["accessors"]:
        if "bufferView" in a:
            a["bufferView"] = remap[a["bufferView"]]
        sp = a.get("sparse")
        if sp:
            sp["indices"]["bufferView"] = remap[sp["indices"]["bufferView"]]
            sp["values"]["bufferView"] = remap[sp["values"]["bufferView"]]
    gltf.pop("images", None); gltf.pop("textures", None); gltf.pop("samplers", None)
    gltf["bufferViews"] = new_bvs
    gltf["buffers"][0]["byteLength"] = len(new_bin)
    gltf["buffers"][0].pop("uri", None)

    glb_out = os.path.join(dst, "model", f"{species_id}.glb")
    write_glb(gltf, new_bin, glb_out)

    # mesh names -> core vs extra (per SDK)
    mesh_names = [m.get("name", "") for m in gltf.get("meshes", [])]
    sdk = json.load(open(SDK_CONFIG))
    required_core = sdk["requiredCoreMeshes"]
    core = [m for m in required_core if m in mesh_names]
    extra = [m for m in mesh_names if m not in required_core]
    missing_core = [m for m in required_core if m not in mesh_names]

    # carry contract files when present; normalize runtime_spec
    for fn in ("anchors.json", "mastery.json"):
        p = os.path.join(src, fn)
        if os.path.exists(p):
            json.dump(json.load(open(p)), open(os.path.join(dst, fn), "w"), indent=2)
    rs_path = os.path.join(src, "runtime_spec.json")
    rs = json.load(open(rs_path)) if os.path.exists(rs_path) else {}
    rs["texturesEmbedded"] = False
    rs["optimizedBy"] = "tools/ingest_creature.py"
    json.dump(rs, open(os.path.join(dst, "runtime_spec.json"), "w"), indent=2)

    species = {
        "speciesId": species_id, "displayName": display_name, "sdkVersion": "1.0.0",
        "modelAsset": f"model/{species_id}.glb",
        "sharedFace": "shared/face/push_face_outline.svg",
        "coreMeshes": core, "extraMeshes": extra,
        "anchors": "anchors.json", "materials": "materials.json", "mastery": "mastery.json",
    }
    json.dump(species, open(os.path.join(dst, "species.json"), "w"), indent=2)
    json.dump({"externalTextures": mat_tex_out}, open(os.path.join(dst, "materials.json"), "w"), indent=2)

    out_glb_size = os.path.getsize(glb_out)
    tex_total = sum(os.path.getsize(os.path.join(dst, "textures", f))
                    for f in os.listdir(os.path.join(dst, "textures")))
    meta = {
        "speciesId": species_id, "displayName": display_name,
        "sourcePackage": os.path.basename(src.rstrip("/")),
        "meshCount": len(mesh_names), "materialCount": len(gltf.get("materials", [])),
        "missingCoreMeshes": missing_core,
        "sizeBytes": {"srcGlb": src_glb_size, "outGlb": out_glb_size, "outTextures": tex_total,
                      "outTotal": out_glb_size + tex_total},
        "bakedMaterials": baked, "externalTextures": mat_tex_out,
    }
    json.dump(meta, open(os.path.join(dst, "meta.json"), "w"), indent=2)

    return {"id": species_id, "displayName": display_name, "externalTextures": mat_tex_out,
            "meta": meta, "missingCore": missing_core}


def generate_registry(entries):
    """Write a Metro-friendly TS registry with static require()s for every species."""
    os.makedirs(os.path.dirname(REGISTRY_TS), exist_ok=True)
    lines = [
        "// AUTO-GENERATED by tools/ingest_creature.py — do not edit by hand.",
        "// One entry per creature species. `glb` and every external-texture module are static",
        "// require()s (Metro resolves them at build time). Colours are baked into each GLB as",
        "// material factors, so only detailed face textures appear here.",
        "",
        "export type ExternalSlot = 'map' | 'emissiveMap';",
        "export interface SpeciesEntry {",
        "  id: string;",
        "  displayName: string;",
        "  glb: number;",
        "  externalTextures: Record<string, Partial<Record<ExternalSlot, number>>>;",
        "}",
        "",
        "export const SPECIES_REGISTRY = {",
    ]
    for e in entries:
        sid = e["id"]
        lines.append(f"  {sid}: {{")
        lines.append(f"    id: '{sid}',")
        lines.append(f"    displayName: '{e['displayName']}',")
        lines.append(f"    glb: require('@/assets/buddies/{sid}/model/{sid}.glb'),")
        if e["externalTextures"]:
            lines.append("    externalTextures: {")
            for mname, slots in e["externalTextures"].items():
                parts = ", ".join(
                    f"{slot}: require('@/assets/buddies/{sid}/textures/{fn}')"
                    for slot, fn in slots.items()
                )
                lines.append(f"      {mname}: {{ {parts} }},")
            lines.append("    },")
        else:
            lines.append("    externalTextures: {},")
        lines.append("  },")
    lines += [
        "} satisfies Record<string, SpeciesEntry>;",
        "",
        "export type SpeciesId = keyof typeof SPECIES_REGISTRY;",
        "export const SPECIES_IDS = Object.keys(SPECIES_REGISTRY) as SpeciesId[];",
        "",
    ]
    open(REGISTRY_TS, "w").write("\n".join(lines))


def main():
    if len(sys.argv) >= 3 and sys.argv[1] == "--batch":
        manifest = json.load(open(sys.argv[2]))
        entries = []
        for item in manifest:
            print(f"\n=== ingest {item['id']} ===")
            try:
                info = optimize(item["src"], item["id"], item.get("name", item["id"].title()))
            except Exception as e:
                print(f"  !! FAILED: {e}")
                continue
            m = info["meta"]
            print(f"  meshes={m['meshCount']} materials={m['materialCount']} "
                  f"out={m['sizeBytes']['outTotal']/1e6:.2f}MB (glb {m['sizeBytes']['srcGlb']/1e6:.1f}->"
                  f"{m['sizeBytes']['outGlb']/1e6:.2f}MB) external={list(info['externalTextures'])}")
            if info["missingCore"]:
                print(f"  ⚠ MISSING core meshes: {info['missingCore']}")
            entries.append(info)
        generate_registry(entries)
        print(f"\nregistry -> {os.path.relpath(REGISTRY_TS, APP)}  ({len(entries)} species)")
    elif len(sys.argv) >= 3:
        src, sid = sys.argv[1], sys.argv[2]
        name = sys.argv[3] if len(sys.argv) > 3 else sid.title()
        info = optimize(src, sid, name)
        print(json.dumps(info["meta"], indent=2))
        print("NOTE: single-species run did not regenerate the registry; use --batch for that.")
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
