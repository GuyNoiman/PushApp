#!/usr/bin/env python3
"""
optimize_buddy.py — turn a ChatGPT "runtime package" (hopper_v2-style) into a
small, RN-friendly package that renders correctly in expo-gl.

Strategy (why): the base-color / metallic-roughness textures are FLAT solid
colors (a 4.7 MB PNG for one purple). Embedded glTF textures also don't decode
on React Native. So we:
  1. Bake every FLAT baseColor texture into material.baseColorFactor (linear).
  2. Bake every FLAT metal/rough texture into metallic/roughnessFactor.
  3. Keep only genuinely-detailed textures (the FACE) as small EXTERNAL PNGs,
     loaded in-app by material name (not embedded).
  4. Strip all embedded images from the GLB and reindex bufferViews, so the GLB
     is geometry-only (~2.4 MB instead of ~22 MB).

Result: colors render natively from factors (no fragile texture load), the model
is tiny, and only the face needs the (small, reliable) external-texture path.
"""
import json, struct, os, sys
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else \
    "/Users/guynoiman/Documents/PushApp/app/assets/buddies/hopper_v2"
DST = sys.argv[2] if len(sys.argv) > 2 else \
    "/Users/guynoiman/Documents/PushApp/app/assets/buddies/hopper_v3"

GLB_IN = None
for root, _, files in os.walk(os.path.join(SRC, "model")):
    for fn in files:
        if fn.endswith(".glb"):
            GLB_IN = os.path.join(root, fn)
TEX_DIR = os.path.join(SRC, "textures")
MATERIALS_JSON = os.path.join(SRC, "materials.json")

FLAT_FAR_FRAC = 0.02       # if <2% of pixels deviate from the mean, treat as a flat solid
FLAT_EPS = 24              # per-channel deviation (0..255) that counts as "different"
FACE_MAX_PX = 512          # downscale kept (detailed) textures to this

os.makedirs(os.path.join(DST, "model"), exist_ok=True)
os.makedirs(os.path.join(DST, "textures"), exist_ok=True)


def srgb_to_linear(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def analyze(path):
    """Return (is_flat, avg_rgba_0_255, far_fraction).

    'flat' means SPATIALLY flat (a solid color), judged by how many pixels stray
    from the mean — NOT by unique-color count. The face is dark with small bright
    eyes: few colors but very much NOT flat, so it must stay a real texture.
    """
    im = Image.open(path).convert("RGBA")
    # area-weighted mean over the full image
    colors = im.getcolors(maxcolors=10_000_000) or []
    tot = [0, 0, 0, 0]; cnt = 0
    for count, px in colors:
        for i in range(4):
            tot[i] += px[i] * count
        cnt += count
    avg = [t / cnt for t in tot]
    # spatial deviation, sampled on a 64x64 downscale for speed
    small = im.resize((64, 64), Image.BILINEAR)
    px = list(small.getdata())
    far = sum(1 for p in px if max(abs(p[i] - avg[i]) for i in range(3)) > FLAT_EPS) / len(px)
    return (far < FLAT_FAR_FRAC), avg, far


# ---- load material->texture map + analyze every texture ----------------------
# Accept both the legacy Hopper shape ({mat_x: {...}}) and the SDK shape
# ({"materials": {mat_x: {...}}}). Texture paths may be bare ("body.png") or
# SDK-prefixed ("textures/body.png") — normalize every value to a basename so
# the rest of the pipeline is layout-agnostic.
raw_mats = json.load(open(MATERIALS_JSON))
mats = raw_mats.get("materials", raw_mats)
tex_info = {}   # filename -> (is_flat, avg, far_fraction)
for m in mats.values():
    for key in ("baseColorTexture", "metallicRoughnessTexture", "emissiveTexture"):
        fn = m.get(key)
        if fn:
            fn = os.path.basename(fn)       # strip any "textures/" prefix
            m[key] = fn
            if fn not in tex_info:
                tex_info[fn] = analyze(os.path.join(TEX_DIR, fn))

print("== texture analysis ==")
for fn, (flat, avg, far) in tex_info.items():
    print(f"  {fn:28s} flat={flat!s:5s} far={far:6.3f} avg={[round(x) for x in avg]}")

# ---- parse GLB ---------------------------------------------------------------
raw = open(GLB_IN, "rb").read()
_, _, _ = struct.unpack("<III", raw[:12])
off = 12
clen, _ = struct.unpack("<II", raw[off:off + 8])
gltf = json.loads(raw[off + 8:off + 8 + clen])
bin_off = off + 8 + clen
blen, _ = struct.unpack("<II", raw[bin_off:bin_off + 8])
BIN = raw[bin_off + 8:bin_off + 8 + blen]

bvs = gltf["bufferViews"]
img_bv = set(im["bufferView"] for im in gltf["images"])

# GLB texture index -> filename (order of textures == order materials.json lists them,
# but safer: map via images? images have no name here). We rely on materials.json which
# names each texture per material, matched to the GLB material of the same name.
name_to_files = mats  # e.g. {"mat_body": {"baseColorTexture": "body_basecolor.png", ...}}

# ---- rewrite materials: bake flats to factors, keep detailed as external -----
kept_external = {}   # material_name -> {"map": fn, "emissiveMap": fn, ...}
for mat in gltf["materials"]:
    mname = mat["name"]
    files = name_to_files.get(mname, {})
    pbr = mat.setdefault("pbrMetallicRoughness", {})

    base_fn = files.get("baseColorTexture")
    mr_fn = files.get("metallicRoughnessTexture")
    emis_fn = files.get("emissiveTexture")

    ext = {}

    # base color
    if base_fn:
        flat, avg, _ = tex_info[base_fn]
        if flat:
            pbr["baseColorFactor"] = [srgb_to_linear(avg[0]), srgb_to_linear(avg[1]),
                                      srgb_to_linear(avg[2]), 1.0]
        else:
            ext["map"] = base_fn          # keep detailed (face) as external sRGB
            pbr["baseColorFactor"] = [1, 1, 1, 1]
    pbr.pop("baseColorTexture", None)

    # metallic / roughness  (linear data: G=rough, B=metal)
    if mr_fn:
        _, avg, _ = tex_info[mr_fn]       # metal/rough always treated as flat factor
        pbr["roughnessFactor"] = round(avg[1] / 255.0, 4)
        pbr["metallicFactor"] = round(avg[2] / 255.0, 4)
    pbr.pop("metallicRoughnessTexture", None)

    # emissive — ALWAYS preserve the artist's emissiveFactor (the glow tint, e.g. cyan
    # for the face screen). Only decide whether the spatial glow pattern stays external.
    if emis_fn:
        flat, avg, _ = tex_info[emis_fn]
        mat.setdefault("emissiveFactor", [1, 1, 1])
        if not flat:
            ext["emissiveMap"] = emis_fn  # detailed glow (face) -> external sRGB map
    mat.pop("emissiveTexture", None)

    if ext:
        kept_external[mname] = ext

# ---- strip images/textures/samplers, reindex bufferViews (geometry only) -----
keep = [i for i in range(len(bvs)) if i not in img_bv]
remap = {old: new for new, old in enumerate(keep)}
new_bin = bytearray()
new_bvs = []
for old in keep:
    bv = dict(bvs[old])
    src = bv.get("byteOffset", 0)
    ln = bv["byteLength"]
    data = BIN[src:src + ln]
    while len(new_bin) % 4 != 0:
        new_bin.append(0)
    bv["byteOffset"] = len(new_bin)
    new_bvs.append(bv)
    new_bin += data
for a in gltf["accessors"]:
    if "bufferView" in a:
        a["bufferView"] = remap[a["bufferView"]]
    sp = a.get("sparse")
    if sp:  # (none here, but be safe)
        sp["indices"]["bufferView"] = remap[sp["indices"]["bufferView"]]
        sp["values"]["bufferView"] = remap[sp["values"]["bufferView"]]

gltf.pop("images", None)
gltf.pop("textures", None)
gltf.pop("samplers", None)
gltf["bufferViews"] = new_bvs
gltf["buffers"][0]["byteLength"] = len(new_bin)
gltf["buffers"][0].pop("uri", None)

# ---- write GLB ---------------------------------------------------------------
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
GLB_OUT = os.path.join(DST, "model", "hopper_v3_runtime.glb")
open(GLB_OUT, "wb").write(out)

# ---- copy + downscale the kept (detailed) external textures ------------------
mat_tex_out = {}
copied = set()
for mname, ext in kept_external.items():
    slot_map = {}
    for slot, fn in ext.items():
        if fn not in copied:
            im = Image.open(os.path.join(TEX_DIR, fn)).convert("RGBA")
            if max(im.size) > FACE_MAX_PX:
                s = FACE_MAX_PX / max(im.size)
                im = im.resize((round(im.size[0] * s), round(im.size[1] * s)), Image.LANCZOS)
            im.save(os.path.join(DST, "textures", fn), optimize=True)
            copied.add(fn)
        slot_map[slot] = fn
    mat_tex_out[mname] = slot_map

# runtime contract: which external textures each material needs (by slot)
json.dump({"externalTextures": mat_tex_out}, open(os.path.join(DST, "materials.json"), "w"), indent=2)

# ---- report ------------------------------------------------------------------
def mb(b): return f"{b/1e6:.2f} MB"
print("\n== output ==")
print("GLB:", GLB_OUT, mb(os.path.getsize(GLB_OUT)))
tex_total = sum(os.path.getsize(os.path.join(DST, "textures", f)) for f in os.listdir(os.path.join(DST, "textures")))
print("external textures:", list(mat_tex_out.items()), mb(tex_total))
print("baked factors per material:")
for mat in gltf["materials"]:
    p = mat["pbrMetallicRoughness"]
    print(f"  {mat['name']:16s} base={[round(x,3) for x in p.get('baseColorFactor',[1,1,1,1])]} "
          f"rough={p.get('roughnessFactor')} metal={p.get('metallicFactor')} "
          f"emis={[round(x,3) for x in mat.get('emissiveFactor',[0,0,0])]}")
print("\nPACKAGE TOTAL:", mb(os.path.getsize(GLB_OUT) + tex_total))
