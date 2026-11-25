"""Variant B (sanácia + prístavba) – Blender scene in hall-aligned frame H. Usage: blender -b -P scene_b.py -- <view> <out.png> [samples] [resx resy]"""
import bpy, bmesh, json, math, sys, os, random
from mathutils import Vector
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
VIEW = argv[0] if argv else "aerial_sw"; OUT = argv[1] if len(argv) > 1 else f"out/{VIEW}.png"; SAMPLES = int(argv[2]) if len(argv) > 2 else 64
RESX, RESY = (int(argv[3]), int(argv[4])) if len(argv) > 4 else (1920, 1080)
HERE = os.path.dirname(os.path.abspath(__file__)); TEX = os.path.join(HERE, "tex")
S = json.load(open(os.path.join(HERE, "layout.json"))); OJ = json.load(open(os.path.join(HERE, "ortho_H.json")))
random.seed(11)
# ---------------- reset ----------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene; scene.unit_settings.system = 'METRIC'
# ---------------- materials ----------------
MATS = {}
def pbr(name, color, rough=0.6, metal=0.0, spec=0.5, alpha=1.0, emit=None, emit_str=0.0, coat=0.0, trans=0.0, ior=1.45):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; p = nt.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*color, 1); p.inputs["Roughness"].default_value = rough; p.inputs["Metallic"].default_value = metal
    p.inputs["Specular IOR Level"].default_value = spec; p.inputs["Alpha"].default_value = alpha; p.inputs["Coat Weight"].default_value = coat
    p.inputs["Transmission Weight"].default_value = trans; p.inputs["IOR"].default_value = ior
    if emit: p.inputs["Emission Color"].default_value = (*emit, 1); p.inputs["Emission Strength"].default_value = emit_str
    if alpha < 1 or trans > 0: m.blend_method = 'BLEND'
    MATS[name] = m; return m
def srgb(hexv): 
    r, g, b = [int(hexv[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((c / 12.92) if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4) for c in (r, g, b))
def noise_mat(name, c1, c2, scale=8.0, detail=4.0, rough=0.9, bump=0.15, metal=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; p = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord"); n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = detail; n.inputs["Roughness"].default_value = 0.6
    nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (*c1, 1); ramp.color_ramp.elements[1].color = (*c2, 1)
    nt.links.new(n.outputs["Fac"], ramp.inputs["Fac"]); nt.links.new(ramp.outputs["Color"], p.inputs["Base Color"])
    bm = nt.nodes.new("ShaderNodeBump"); bm.inputs["Strength"].default_value = bump; nt.links.new(n.outputs["Fac"], bm.inputs["Height"]); nt.links.new(bm.outputs["Normal"], p.inputs["Normal"])
    p.inputs["Roughness"].default_value = rough; p.inputs["Metallic"].default_value = metal; MATS[name] = m; return m
def panel_mat(name, color, height, rough=0.4, metal=0.35):
    """PIR sandwich panels: horizontal joints every 1 m along Z, fine ribs, slight metallic."""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; p = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs["Vector"])
    # joints: sawtooth of z -> thin dark lines
    mz = nt.nodes.new("ShaderNodeMath"); mz.operation = 'WRAP'; mz.inputs[1].default_value = 0.0; mz.inputs[2].default_value = 1.0; nt.links.new(sep.outputs["Z"], mz.inputs[0])
    lt = nt.nodes.new("ShaderNodeMath"); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = 0.035; nt.links.new(mz.outputs[0], lt.inputs[0])
    # ribs: sine on z high frequency
    rib = nt.nodes.new("ShaderNodeMath"); rib.operation = 'MULTIPLY'; rib.inputs[1].default_value = 12 * math.pi; nt.links.new(sep.outputs["Z"], rib.inputs[0])
    sn = nt.nodes.new("ShaderNodeMath"); sn.operation = 'SINE'; nt.links.new(rib.outputs[0], sn.inputs[0])
    ribs = nt.nodes.new("ShaderNodeMath"); ribs.operation = 'MULTIPLY'; ribs.inputs[1].default_value = 0.08; nt.links.new(sn.outputs[0], ribs.inputs[0])
    joint = nt.nodes.new("ShaderNodeMath"); joint.operation = 'MULTIPLY'; joint.inputs[1].default_value = -0.5; nt.links.new(lt.outputs[0], joint.inputs[0])
    hsum = nt.nodes.new("ShaderNodeMath"); hsum.operation = 'ADD'; nt.links.new(ribs.outputs[0], hsum.inputs[0]); nt.links.new(joint.outputs[0], hsum.inputs[1])
    bm = nt.nodes.new("ShaderNodeBump"); bm.inputs["Strength"].default_value = 0.6; nt.links.new(hsum.outputs[0], bm.inputs["Height"]); nt.links.new(bm.outputs["Normal"], p.inputs["Normal"])
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = 'RGBA'; mix.inputs["A"].default_value = (*color, 1); mix.inputs["B"].default_value = (color[0] * 0.35, color[1] * 0.35, color[2] * 0.35, 1); nt.links.new(lt.outputs[0], mix.inputs["Factor"]); nt.links.new(mix.outputs["Result"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = rough; p.inputs["Metallic"].default_value = metal; MATS[name] = m; return m
def img_mat(name, path, emit=0.0, alpha=True):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; p = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(path); nt.links.new(t.outputs["Color"], p.inputs["Base Color"])
    if alpha: nt.links.new(t.outputs["Alpha"], p.inputs["Alpha"]); m.blend_method = 'BLEND'
    if emit: nt.links.new(t.outputs["Color"], p.inputs["Emission Color"]); p.inputs["Emission Strength"].default_value = emit
    p.inputs["Roughness"].default_value = 0.5
    out = nt.nodes["Material Output"]; geo = nt.nodes.new("ShaderNodeNewGeometry"); tr = nt.nodes.new("ShaderNodeBsdfTransparent"); mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(geo.outputs["Backfacing"], mx.inputs["Fac"]); nt.links.new(p.outputs["BSDF"], mx.inputs[1]); nt.links.new(tr.outputs["BSDF"], mx.inputs[2]); nt.links.new(mx.outputs["Shader"], out.inputs["Surface"]); m.blend_method = 'BLEND'
    MATS[name] = m; return m
ORANGE = srgb("e64a19"); GREYP = srgb("8f949a")
M_GRASS = noise_mat("grass", srgb("3d6b26"), srgb("6a9a44"), 3.0, 6.0, 0.95, 0.25)
M_GRASS2 = noise_mat("grass2", srgb("47792e"), srgb("78a852"), 4.0, 6.0, 0.95, 0.25)
M_ASPH = noise_mat("asphalt", srgb("3c3d3f"), srgb("5a5c5e"), 40.0, 8.0, 0.85, 0.08)
M_ROAD = noise_mat("road", srgb("3a3b3d"), srgb("55575a"), 40.0, 8.0, 0.85, 0.08)
M_LANE = noise_mat("lane", srgb("9b978f"), srgb("bdb9b1"), 30.0, 6.0, 0.9, 0.1)
M_GRAVEL = noise_mat("gravel", srgb("a89c80"), srgb("cdbf9e"), 60.0, 8.0, 0.95, 0.3)
M_WATER = pbr("water", srgb("2c6fa8"), 0.05, 0.0, 0.6, trans=0.3, ior=1.33)
M_LINE = pbr("line", srgb("f2f2f2"), 0.6); M_BLUE = pbr("blue", srgb("2f6fd0"), 0.6)
M_FACADE = panel_mat("facade", ORANGE, 8.6); M_WH = panel_mat("wh", GREYP, 9.5)
M_WHITE = pbr("white", srgb("ededed"), 0.5, 0.0); M_ROOF = noise_mat("roof", srgb("c9cacc"), srgb("dadbdd"), 20.0, 4.0, 0.8, 0.05)
M_GLASS = pbr("glass", srgb("1f3a52"), 0.05, 0.0, 0.8, alpha=0.75, coat=1.0, trans=0.2, ior=1.5)
M_STEEL = pbr("steel", srgb("b9bcc0"), 0.4, 0.8); M_DARK = pbr("dark", srgb("242424"), 0.6); M_NAVY = pbr("navy", srgb("101c3a"), 0.5)
M_GREY = pbr("grey", srgb("7d8287"), 0.7); M_PLINTH = noise_mat("plinth", srgb("7a7d80"), srgb("9a9da0"), 15.0, 4.0, 0.9, 0.2)
M_RACK = pbr("rack", srgb("f07f1f"), 0.5, 0.3); M_YELLOW = pbr("yellow", srgb("ffd21f"), 0.4); M_BROWN = noise_mat("bark", srgb("4a3320"), srgb("6b4b2a"), 20.0, 5.0, 0.95, 0.4)
M_FLOOR = noise_mat("floor", srgb("b8b8b8"), srgb("cfcfcf"), 10.0, 3.0, 0.35, 0.02)
M_SKIN = pbr("skin", srgb("e8c3a0"), 0.6)
LEAF = [noise_mat(f"leaf{i}", c, c2, 6.0, 4.0, 0.95, 0.5) for i, (c, c2) in enumerate([(srgb("2f6a22"), srgb("4f8f38")), (srgb("3f7a2e"), srgb("6ea84a")), (srgb("4a8a32"), srgb("7cb85a"))])]
# ---------------- geometry helpers ----------------
COLL_B = bpy.data.collections.new("building"); scene.collection.children.link(COLL_B)
COLL_E = bpy.data.collections.new("env"); scene.collection.children.link(COLL_E)
def mesh_obj(name, verts, faces, mat, coll=None, smooth=False):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    if smooth:
        for pg in me.polygons: pg.use_smooth = True
    ob = bpy.data.objects.new(name, me); (coll or COLL_E).objects.link(ob)
    if mat: ob.data.materials.append(mat)
    return ob
def box(name, x, y, z, w, d, h, mat, coll=None, bevel=0.0):
    v = [(x, y, z), (x + w, y, z), (x + w, y + d, z), (x, y + d, z), (x, y, z + h), (x + w, y, z + h), (x + w, y + d, z + h), (x, y + d, z + h)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    ob = mesh_obj(name, v, f, mat, coll)
    if bevel > 0:
        md = ob.modifiers.new("bev", 'BEVEL'); md.width = bevel; md.segments = 3
    return ob
def flat(name, pts, mat, z=0.02, thick=0.0, coll=None):
    v = [(p[0], p[1], z) for p in pts]; ob = mesh_obj(name, v, [tuple(range(len(v)))], mat, coll)
    if thick > 0:
        md = ob.modifiers.new("sol", 'SOLIDIFY'); md.thickness = -thick; md.offset = 1
    return ob
def cyl(name, r1, r2, h, mat, x, y, z, seg=12, coll=None):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=h)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for pg in me.polygons: pg.use_smooth = True
    ob = bpy.data.objects.new(name, me); (coll or COLL_E).objects.link(ob); ob.location = (x, y, z + h / 2)
    if mat: ob.data.materials.append(mat)
    return ob
def sphere(name, r, mat, x, y, z, sub=2, coll=None, lumpy=0.0):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r); me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for pg in me.polygons: pg.use_smooth = True
    ob = bpy.data.objects.new(name, me); (coll or COLL_E).objects.link(ob); ob.location = (x, y, z); ob.data.materials.append(mat)
    if lumpy > 0:
        tex = bpy.data.textures.get("clouds") or bpy.data.textures.new("clouds", 'CLOUDS'); tex.noise_scale = 0.9
        md = ob.modifiers.new("disp", 'DISPLACE'); md.texture = tex; md.strength = lumpy; md.texture_coords = 'GLOBAL'
    return ob
def plane_sign(name, mat, w, h, x, y, z, rot_z=0.0, coll=None, double=True):
    """vertical plane centred at (x,y,z) facing -Y rotated by rot_z around Z (0 = facing south / -y)."""
    v = [(-w / 2, 0, -h / 2), (w / 2, 0, -h / 2), (w / 2, 0, h / 2), (-w / 2, 0, h / 2)]
    ob = mesh_obj(name, v, [(0, 1, 2, 3)], mat, coll); ob.location = (x, y, z); ob.rotation_euler = (0, 0, rot_z)
    # uv
    me = ob.data; me.uv_layers.new(); uv = me.uv_layers.active.data
    for i, co in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]): uv[i].uv = co
    mat.use_backface_culling = True
    return ob
def rect(name, r, mat, z=0.04, thick=0.0, coll=None): return flat(name, [(r[0], r[1]), (r[0] + r[2], r[1]), (r[0] + r[2], r[1] + r[3]), (r[0], r[1] + r[3])], mat, z, thick, coll)
def fence(x0, y0, x1, y1, h=2.2):
    L = math.hypot(x1 - x0, y1 - y0); n = max(1, round(L / 2.5))
    for i in range(n + 1): cyl(f"fp{x0}{y0}{x1}{i}", 0.04, 0.04, h, M_GREY, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 0, 6)
    m = pbr("mesh", srgb("4a4f55"), 0.7, 0.5, alpha=0.35); mesh_obj(f"fw{x0}{y0}{x1}", [(x0, y0, 0.1), (x1, y1, 0.1), (x1, y1, h), (x0, y0, h)], [(0, 1, 2, 3)], m)
# ---------------- ground ----------------
mo = bpy.data.materials.new("ortho"); mo.use_nodes = True; nt = mo.node_tree; p = nt.nodes["Principled BSDF"]; t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(os.path.join(HERE, "ortho_H.jpg")); nt.links.new(t.outputs["Color"], p.inputs["Base Color"]); p.inputs["Roughness"].default_value = 0.9; p.inputs["Specular IOR Level"].default_value = 0.15
og = mesh_obj("ortho", [(OJ["X0"], OJ["Y0"], -0.02), (OJ["X1"], OJ["Y0"], -0.02), (OJ["X1"], OJ["Y1"], -0.02), (OJ["X0"], OJ["Y1"], -0.02)], [(0, 1, 2, 3)], mo); og.data.uv_layers.new(); uv = og.data.uv_layers.active.data
for i, co in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]): uv[i].uv = co
flat("ground", [(-900, -900), (900, -900), (900, 900), (-900, 900)], M_GRASS, -0.05)
flat("parcel", S["PARCEL"], M_GRASS2, 0.0)
M_PAVER = noise_mat("paver", srgb("8d8f92"), srgb("a9abae"), 55.0, 6.0, 0.85, 0.12); M_SIDE = noise_mat("sidewalk", srgb("b9b2a3"), srgb("d2ccbf"), 50.0, 5.0, 0.9, 0.1); M_KERB = pbr("kerb", srgb("c9c9c6"), 0.8)
flat("southroad", S["SOUTH_ROAD"], M_ASPH, 0.03, 0.08)
for k in ("AISLE", "SOUTH_LEG", "NORTH_LEG", "NB_APRON", "P1_AISLE"): rect(k, S[k], M_ASPH, 0.04, 0.08)
flat("ringarc", S["RING_ARC"], M_ASPH, 0.04, 0.08)
for i, s in enumerate(S["STALLS"]): rect(f"st{i}", s[:4], M_BLUE if s[4] == "dis" else M_PAVER, 0.045, 0.08)
for i, s in enumerate(S["SIDEWALKS"]): rect(f"sw{i}", s, M_SIDE, 0.10, 0.12)
rect("crossing", S["CROSSING"], M_ASPH, 0.045, 0.08)
for i in range(5): rect(f"zeb{i}", (S["CROSSING"][0] + 0.3 + i, S["CROSSING"][1], 0.5, 5), M_LINE, 0.13)
flat("islandkerb", S["ISLAND"], M_KERB, 0.04, 0.12); 
flat("island", S["ISLAND_IN"], M_GRASS2, 0.2)
# stall lines
for i, s in enumerate(S["STALLS"]):
    x, y, w, h, k = s
    if w > h: flat(f"l{i}", [(x, y - 0.05), (x + w, y - 0.05), (x + w, y + 0.05), (x, y + 0.05)], M_LINE, 0.13); flat(f"l{i}b", [(x, y + h - 0.05), (x + w, y + h - 0.05), (x + w, y + h + 0.05), (x, y + h + 0.05)], M_LINE, 0.13)
    else: flat(f"l{i}", [(x - 0.05, y), (x + 0.05, y), (x + 0.05, y + h), (x - 0.05, y + h)], M_LINE, 0.13); flat(f"l{i}b", [(x + w - 0.05, y), (x + w + 0.05, y), (x + w + 0.05, y + h), (x + w - 0.05, y + h)], M_LINE, 0.13)
# lay-bys
rect("pickup", S["PICKUP"], noise_mat("pick", srgb("b59a3a"), srgb("d6bb5a"), 40, 5, 0.85, 0.08), 0.125)
for i in range(4): rect(f"pk{i}", (S["PICKUP"][0] + 1 + i * 7.6, S["PICKUP"][1], 0.12, 3.5), M_LINE, 0.135)
lk = S["LKW_CANOPY"]; rect("lkwbay", lk, noise_mat("lkwb", srgb("5a4a48"), srgb("75605c"), 40, 5, 0.85, 0.08), 0.125)
for (a, b) in [((lk[0], lk[1] + lk[3]), (lk[0] + lk[2], lk[1] + lk[3]))]: flat("lkwl", [(a[0], a[1] - 0.06), (b[0], b[1] - 0.06), (b[0], b[1] + 0.06), (a[0], a[1] + 0.06)], M_YELLOW, 0.135)
# direction arrows on the ring
def arrow(x, y, rot):
    pts = [(-0.25, -1.6), (0.25, -1.6), (0.25, 0.4), (0.75, 0.4), (0, 1.6), (-0.75, 0.4), (-0.25, 0.4)]; c, s_ = math.cos(rot), math.sin(rot)
    flat(f"arr{x}{y}", [(x + px * c - py * s_, y + px * s_ + py * c) for px, py in pts], M_LINE, 0.13)
for x in (33, 45): arrow(x, 103.2, math.pi / 2); arrow(x, 89.3, -math.pi / 2)
for y in (-2, 30, 60): arrow(57.3, y, 0); arrow(53.7, y + 6, math.pi)
# ---------------- buildings ----------------
B = COLL_B; T = 0.25
SILVER = srgb("a9adab"); M_SILVER = panel_mat("silver", SILVER, 7.6, 0.35, 0.55); M_SILVER2 = panel_mat("silver2", srgb("b7bab8"), 14.5, 0.4, 0.45); M_BLACK = pbr("black9004", srgb("202022"), 0.45, 0.2); M_ADM = noise_mat("admplaster", srgb("d9d4c8"), srgb("e6e2d8"), 12, 3, 0.9, 0.05); M_GATE = pbr("gate", srgb("3a3a3a"), 0.6, 0.3)
HO, HN = 6.4, 7.6           # old hall / extension heights
def bldg(pfx, x, y, w, d, h, mat, roofmat=None):
    box(pfx + "N", x, y + d - T, 0, w, T, h, mat, B); box(pfx + "S", x, y, 0, w, T, h, mat, B); box(pfx + "W", x, y, 0, T, d, h, mat, B); box(pfx + "E", x + w - T, y, 0, T, d, h, mat, B)
    box(pfx + "roof", x, y, h - 0.35, w, d, 0.3, roofmat or M_ROOF, B)
    box(pfx + "p1", x - 0.08, y - 0.08, h - 0.05, w + 0.16, 0.3, 0.25, M_DARK, B); box(pfx + "p2", x - 0.08, y + d - 0.22, h - 0.05, w + 0.16, 0.3, 0.25, M_DARK, B); box(pfx + "p3", x - 0.08, y - 0.08, h - 0.05, 0.3, d + 0.16, 0.25, M_DARK, B); box(pfx + "p4", x + w - 0.22, y - 0.08, h - 0.05, 0.3, d + 0.16, 0.25, M_DARK, B)
    box(pfx + "pl", x - 0.06, y - 0.06, 0, w + 0.12, d + 0.12, 0.5, M_PLINTH, B)
bldg("oldW", 0, 0, 16.5, 64, HO, M_SILVER); bldg("oldE", 16.5, 17, 13, 47, HO, M_SILVER)
bldg("extE", 29.5, 0, 15.5, 64, HN, M_SILVER); bldg("extS", 16.5, 0, 13.2, 17, HN, M_SILVER)
# skylights + rooftop units + PV
for i in range(6): box(f"sky{i}", 3, 6 + i * 10, HO, 10.5, 1.8, 0.3, pbr("skylight", srgb("dfe8f0"), 0.2, alpha=0.8, trans=0.4), B)
for i in range(5): box(f"skyn{i}", 32, 8 + i * 11.5, HN, 10.5, 1.8, 0.3, pbr("skylight", srgb("dfe8f0"), 0.2, alpha=0.8, trans=0.4), B)
for i in range(4): box(f"rtu{i}", 19 + (i % 2) * 6, 24 + (i // 2) * 22, HO, 2.6, 2.0, 1.5, pbr("rtu", srgb("a9adb2"), 0.5, 0.6), B)
# black entrance portal on the south facade (Olkusz style) + glazing + canopy
ex, ey, ew, eh = S["ENTR"]
box("portal", 25.5, -0.45, 0, 19.5, 0.5, HN + 1.2, M_BLACK, B); box("portalret", 44.55, -0.45, 0, 0.5, 9.0, HN + 1.2, M_BLACK, B)
box("glz", ex, -0.52, 0.15, ew, 0.12, 3.9, M_GLASS, B)
for i in range(7): box(f"mul{i}", ex + i * ew / 6 - 0.05, -0.56, 0.15, 0.1, 0.16, 3.9, M_STEEL, B)
box("tran", ex, -0.56, 2.55, ew, 0.16, 0.1, M_STEEL, B)
box("canopy", ex - 0.5, ey, 4.15, ew + 1.0, eh - 0.45, 0.3, M_BLACK, B)
for i in range(2): cyl(f"cp{i}", 0.1, 0.1, 4.15, M_STEEL, ex - 0.2 + i * (ew + 0.4), ey + 0.3, 0, 12, B)
M_LOGO = img_mat("logo", os.path.join(TEX, "logo.png")); M_LOGOR = img_mat("logor", os.path.join(TEX, "logo_red.png"), emit=0.6); M_LOGOW = img_mat("logow", os.path.join(TEX, "logo_white.png"), emit=0.4)
plane_sign("logoS", M_LOGOR, 16.5, 2.75, 35.2, -0.5, 6.6, 0, B)
plane_sign("vstup", img_mat("vstup", os.path.join(TEX, "vstup.png"), alpha=False), 2.6, 1.0, ex + ew / 2, ey - 0.03, 4.3, 0, B)
# east facade (to the car park): black field + logo, billboards
box("eband", 45.02, 4, 4.4, 0.1, 22, 3.0, M_BLACK, B); plane_sign("logoE", M_LOGOR, 16, 2.67, 45.16, 15, 5.9, math.pi / 2, B)
for i, b in enumerate(["kuchyne", "kupelne", "podlahy", "dvere", "nabytok"]): plane_sign(f"bbe{b}", img_mat(f"bb{b}", os.path.join(TEX, f"bb_{b}.png"), alpha=False), 5.5, 2.25, 45.06, 31 + i * 6.6, 3.0, math.pi / 2, B)
# west facade (to Levočská)
box("wband", -0.1, 30, 2.9, 0.1, 24, 3.2, M_BLACK, B); plane_sign("logoW", M_LOGOR, 17, 2.83, -0.24, 42, 4.5, -math.pi / 2, B)
for i, b in enumerate(["stavebniny", "podlahy", "kupelne"]): plane_sign(f"bbw{b}", img_mat(f"bb{b}", os.path.join(TEX, f"bb_{b}.png"), alpha=False), 6.0, 2.45, -0.06, 6 + i * 7.5, 3.4, -math.pi / 2, B)
# emergency doors
for (x, y, r) in [(-0.02, 20, 0), (-0.02, 48, 0), (45.0, 50, 0)]: box(f"exit{x}{y}", x - 0.03, y, 0.1, 0.08, 1.8, 2.2, M_GATE, B)
# north block (existing 4 storeys) – refurbished facade, logo tower
nx, ny, nw, nd = S["NB"]; NH = 14.5
bldg("nb", nx, ny, nw, nd, NH, M_SILVER2)
for fl in range(1, 4):
    z = 3.6 * fl + 1.0
    box(f"nbwN{fl}", nx + 1.5, ny + nd - 0.02, z, nw - 3, 0.06, 1.5, M_GLASS, B); box(f"nbwW{fl}", nx - 0.04, ny + 1.5, z, 0.06, nd - 3, 1.5, M_GLASS, B); box(f"nbwE{fl}", nx + nw - 0.02, ny + 1.5, z, 0.06, nd - 3, 1.5, M_GLASS, B)
    if z > HO + 0.3: box(f"nbwS{fl}", nx + 1.5, ny - 0.04, z, nw - 3, 0.06, 1.5, M_GLASS, B)
box("nbtopS", nx - 0.06, ny - 0.1, NH - 3.2, nw + 0.12, 0.1, 3.2, M_BLACK, B); box("nbtopW", nx - 0.1, ny - 0.06, NH - 3.2, 0.1, nd + 0.12, 3.2, M_BLACK, B); box("nbtopN", nx - 0.06, ny + nd, NH - 3.2, nw + 0.12, 0.1, 3.2, M_BLACK, B); box("nbtopE", nx + nw, ny - 0.06, NH - 3.2, 0.1, nd + 0.12, 3.2, M_BLACK, B)
plane_sign("logoNBs", M_LOGOR, 15, 2.5, nx + nw / 2, ny - 0.22, NH - 1.6, 0, B); plane_sign("logoNBw", M_LOGOR, 11.5, 1.92, nx - 0.22, ny + nd / 2, NH - 1.6, -math.pi / 2, B); plane_sign("logoNBn", M_LOGOR, 15, 2.5, nx + nw / 2, ny + nd + 0.22, NH - 1.6, math.pi, B)
for i, gx in enumerate((8, 18)): box(f"nbgate{i}", gx, ny + nd - 0.02, 0.1, 4, 0.1, 4.0, M_GATE, B)
box("rcvcanopy", 6, ny + nd, 4.4, 18, 3.5, 0.25, M_BLACK, B); plane_sign("prijem", img_mat("prijem", os.path.join(TEX, "prijem.png"), alpha=False), 9, 0.9, 15, ny + nd + 3.53, 4.9, math.pi, B)
# admin building (existing, kept – outside the Merkury scope)
ax_, ay_, aw_, ad_ = S["ADM"]; AH = 10.6
bldg("adm", ax_, ay_, aw_, ad_, AH, M_ADM, noise_mat("admroof", srgb("6e6f72"), srgb("85868a"), 20, 4, 0.9, 0.05))
for fl in range(3):
    z = 1.0 + fl * 3.3
    for i in range(8): box(f"admwS{fl}{i}", ax_ + 1.2 + i * 2.9, ay_ - 0.03, z, 1.8, 0.06, 1.6, M_GLASS, B); box(f"admwN{fl}{i}", ax_ + 1.2 + i * 2.9, ay_ + ad_ - 0.03, z, 1.8, 0.06, 1.6, M_GLASS, B)
    for i in range(4): box(f"admwW{fl}{i}", ax_ - 0.03, ay_ + 1.3 + i * 3.1, z, 0.06, 1.8, 1.6, M_GLASS, B); box(f"admwE{fl}{i}", ax_ + aw_ - 0.03, ay_ + 1.3 + i * 3.1, z, 0.06, 1.8, 1.6, M_GLASS, B)
# ---------------- outdoor seasonal zone (garden) ----------------
gx, gy, gw, gh = S["GARDEN"]; rect("gardenfloor", S["GARDEN"], M_PAVER, 0.06, 0.1)
cx, cy, cw, ch = S["GARDEN_CANOPY"]; box("gcanopy", cx, cy, 4.6, cw, ch, 0.25, pbr("polycarb", srgb("e8eef2"), 0.3, alpha=0.75, trans=0.3), B); box("gcanopyfr", cx, cy + ch - 0.2, 4.4, cw, 0.2, 0.45, M_BLACK, B)
for i in range(5): cyl(f"gc{i}", 0.09, 0.09, 4.6, M_STEEL, cx + 0.4 + i * (cw - 0.8) / 4, cy + ch - 0.3, 0, 10, B)
fence(gx, gy + gh, gx + gw, gy + gh, 2.4); fence(gx + gw, gy, gx + gw, gy + gh, 2.4); fence(gx, gy + ch, gx, gy + gh, 2.4)
plane_sign("zahrada", img_mat("zahrada", os.path.join(TEX, "zahrada.png"), alpha=False), 9, 1.4, gx + gw + 0.06, gy + 9, 3.3, math.pi / 2, B)
PLANT = [noise_mat("plantA", srgb("2f7a2a"), srgb("58a84a"), 30, 5, 0.9, 0.5), noise_mat("plantB", srgb("b03a5a"), srgb("e0708a"), 30, 5, 0.9, 0.5), noise_mat("plantC", srgb("d8a020"), srgb("f0d060"), 30, 5, 0.9, 0.5)]; M_WOOD = pbr("wood", srgb("c98c4a"), 0.8); M_SACK = pbr("sack", srgb("d8cfc0"), 0.9); M_BRICK = noise_mat("brick", srgb("9a4a32"), srgb("b8644a"), 30, 4, 0.9, 0.3)
for r in range(4):
    for c in range(5):
        px, py = gx + 2 + c * 4.3, gy + 9.5 + r * 2.3
        box(f"gt{r}{c}", px, py, 0.1, 3.4, 1.2, 0.75, M_GREY); box(f"gp{r}{c}", px + 0.1, py + 0.1, 0.85, 3.2, 1.0, 0.45, PLANT[(r + c) % 3])
for c in range(4): box(f"grack{c}", gx + 2 + c * 5.4, gy + 1.5, 0.1, 4.2, 1.2, 3.2, M_RACK); box(f"gsack{c}", gx + 2.2 + c * 5.4, gy + 3.6, 0.1, 3.6, 1.2, 1.3, [M_SACK, M_WOOD, M_BRICK, M_SACK][c])
# ---------------- building-materials yard ----------------
yx, yy, yw, yh = S["YARD"]; rect("yardfloor", S["YARD"], M_GRAVEL, 0.05)
fence(yx, yy, yx + 13, yy); fence(yx + 19, yy, yx + yw, yy); fence(yx + yw, yy, yx + yw, yy + yh); fence(yx, yy + yh, yx + yw, yy + yh); fence(yx, yy, yx, yy + yh)
plane_sign("stav", img_mat("stavebniny_s", os.path.join(TEX, "stavebniny.png"), alpha=False), 10, 1.55, yx + 28, yy - 0.05, 3.2, 0, B); box("stavpost1", yx + 23.2, yy - 0.02, 0, 0.12, 0.12, 4.0, M_STEEL); box("stavpost2", yx + 32.7, yy - 0.02, 0, 0.12, 0.12, 4.0, M_STEEL)
for i in range(14): box(f"ys{i}", yx + 1.5 + (i % 7) * 5.6, yy + 2.6 + (i // 7) * 5.2, 0.05, 4.2, 2.4, 1.2 + (i % 3) * 0.6, [M_BRICK, M_SACK, M_WOOD, M_GREY][i % 4])
box("forklift", yx + 15, yy + 0.8, 0.05, 1.2, 2.4, 1.5, M_YELLOW); box("forkmast", yx + 15.2, yy + 0.7, 0.05, 0.8, 0.15, 2.4, M_DARK)
# ---------------- pylon (existing textured prism) ----------------
PX, PY = S["PYLON"]
legs = [(0, 0), (1.3, 0), (0.65, 1.1)]
for i, (a, b) in enumerate(legs): cyl(f"leg{i}", 0.12, 0.14, 12, M_STEEL, PX + a - 0.65, PY + b - 0.4, 0, 10)
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=3, radius1=2.5, radius2=2.5, depth=4.2); me = bpy.data.meshes.new("prism"); bm.to_mesh(me); bm.free()
ob = bpy.data.objects.new("prism", me); COLL_E.objects.link(ob); ob.location = (PX, PY, 14.2); ob.rotation_euler = (0, 0, math.pi / 6)
ob.data.materials.append(img_mat("pylon", os.path.join(TEX, "pylon.png"), alpha=False)); ob.data.materials.append(M_DARK); me.uv_layers.new(); uv = me.uv_layers.active.data; k = 0
for pg in me.polygons:
    if len(pg.vertices) == 4:
        nrm = pg.normal; right = Vector((-nrm.y, nrm.x, 0.0)); right.normalize(); cos_ = [me.vertices[vi].co for vi in pg.vertices]; proj = [v_.dot(right) for v_ in cos_]; pmin, pmax = min(proj), max(proj); zmin = min(v_.z for v_ in cos_); zmax = max(v_.z for v_ in cos_)
        for li, vi in zip(pg.loop_indices, pg.vertices):
            v_ = me.vertices[vi].co; uv[li].uv = (k / 3 + (v_.dot(right) - pmin) / (pmax - pmin + 1e-9) / 3, (v_.z - zmin) / (zmax - zmin + 1e-9))
        k += 1
    else: pg.material_index = 1
# flags by the entrance
for i, fn in enumerate(["flag_o", "flag_y", "flag_w", "flag_o", "flag_y"]):
    fx, fy = 20.5 + i * 1.9, -2.2; cyl(f"fpole{i}", 0.06, 0.08, 8, M_STEEL, fx, fy, 0, 8); plane_sign(f"flag{i}", img_mat(fn, os.path.join(TEX, f"{fn}.png"), alpha=False), 1.5, 2.3, fx + 0.75, fy, 6.8, 0.0).data.materials[0].use_backface_culling = False
# trolley shelters
for i, r in enumerate(S["TROLLEY"]): box(f"trol{i}", r[0], r[1], 2.2, r[2], r[3], 0.1, pbr("polycarb", srgb("e8eef2"), 0.3, alpha=0.75, trans=0.3)); [cyl(f"trp{i}{j}", 0.04, 0.04, 2.2, M_STEEL, r[0] + (j % 2) * r[2], r[1] + (j // 2) * r[3], 0, 6) for j in range(4)]
# ---------------- cars / truck / trees / lamps / people ----------------
car_cols = ["dedede", "2b2b2b", "8a8f94", "b5262a", "2c4e9a", "f2f2f2", "5c5f63", "1f1f1f", "9bb0c7", "c9c9c9", "7a1f1f", "3b5d3b"]
def car(x, y, rot, col, trailer=False):
    m = pbr(f"paint{col}", srgb(col), 0.25, 0.6, coat=1.0); grp = [box("cb", -0.9, -2.2, 0.3, 1.8, 4.4, 0.65, m, bevel=0.12), box("cc", -0.78, -1.1, 0.95, 1.56, 2.2, 0.62, M_GLASS, bevel=0.12), box("cr", -0.72, -0.85, 1.52, 1.44, 1.7, 0.06, m)]
    for (wx_, wz) in [(-0.82, 1.45), (0.82, 1.45), (-0.82, -1.45), (0.82, -1.45)]:
        w = cyl("cw", 0.33, 0.33, 0.24, M_DARK, 0, 0, 0, 16); w.location = (wx_, wz, 0.33); w.rotation_euler = (0, math.pi / 2, 0); grp.append(w)
    for (lx_, ly_, c, e) in [(-0.6, 2.2, "fff6d5", 2.0), (0.6, 2.2, "fff6d5", 2.0), (-0.6, -2.2, "c62828", 1.0), (0.6, -2.2, "c62828", 1.0)]: grp.append(box("lamp", lx_ - 0.2, ly_ - 0.04, 0.72, 0.4, 0.08, 0.16, pbr(f"lamp{c}", srgb(c), 0.3, emit=srgb(c), emit_str=e)))
    if trailer:
        grp += [box("trl", -0.85, -5.6, 0.45, 1.7, 2.9, 0.45, M_GREY), box("trlload", -0.7, -5.4, 0.9, 1.4, 2.5, 0.6, M_WOOD), box("trlbar", -0.04, -2.8, 0.5, 0.08, 0.7, 0.08, M_DARK)]
        for sx in (-0.9, 0.9): w = cyl("tw", 0.3, 0.3, 0.2, M_DARK, 0, 0, 0, 12); w.location = (sx, -4.2, 0.3); w.rotation_euler = (0, math.pi / 2, 0); grp.append(w)
    e = bpy.data.objects.new("car", None); COLL_E.objects.link(e); e.location = (x, y, 0.06); e.rotation_euler = (0, 0, rot)
    for o in grp: o.parent = e
for s in S["STALLS"]:
    x, y, w, h, k = s
    if random.random() < (0.5 if k != "staff" else 0.6): car(x + w / 2, y + h / 2, (math.pi / 2 if w > h else 0) + (math.pi if random.random() < 0.5 else 0) + (random.random() - 0.5) * 0.04, random.choice(car_cols))
car(55.6, 12, 0, "b5262a"); car(53.9, 44, math.pi, "dedede"); car(36, -11, math.pi / 2, "2c4e9a"); car(14, -28.6, -math.pi / 2, "8a8f94")
car(41, 107, math.pi / 2, "2b2b2b", trailer=True); car(31.5, 107, math.pi / 2, "f2f2f2")
def truck(x, y, rot):
    grp = [box("tcab", -1.25, -2.05, 0.8, 2.5, 2.3, 3.2, pbr("cabred", srgb("c62828"), 0.3, 0.5, coat=1.0), bevel=0.1), box("tcabg", -1.1, -2.1, 2.2, 2.2, 0.1, 1.2, M_GLASS), box("trail", -1.27, -0.5, 1.0, 2.55, 13.6, 2.8, M_WHITE, bevel=0.05)]
    grp.append(plane_sign("tlogo1", M_LOGO, 10, 1.67, 1.29, 6.3, 2.4, math.pi / 2)); grp.append(plane_sign("tlogo2", M_LOGO, 10, 1.67, -1.29, 6.3, 2.4, -math.pi / 2))
    for i in range(6):
        w = cyl("tw", 0.5, 0.5, 0.35, M_DARK, 0, 0, 0, 14); w.location = ((1.1 if i % 2 else -1.1), [-0.8, -0.8, 9.5, 9.5, 11.2, 11.2][i], 0.5); w.rotation_euler = (0, math.pi / 2, 0); grp.append(w)
    e = bpy.data.objects.new("truck", None); COLL_E.objects.link(e); e.location = (x, y, 0.05); e.rotation_euler = (0, 0, rot)
    for o in grp: o.parent = e
truck(44.5, 85.5, math.pi / 2)
box("pal1", 24, 80, 0.05, 1.2, 1.0, 1.1, M_SACK); box("pal2", 21.5, 80.5, 0.05, 1.2, 1.0, 0.9, M_WOOD); box("fork2", 26, 81.5, 0.05, 1.2, 2.4, 1.5, M_YELLOW)
def tree(x, y, s=1.0):
    cyl(f"trunk{x}_{y}", 0.14 * s, 0.3 * s, 3.2 * s, M_BROWN, x, y, 0, 10)
    for k in range(5):
        r = (1.4 + random.random() * 0.9) * s; ang = random.random() * 6.28; rr = random.random() * 1.3 * s
        sp = sphere(f"can{x}_{y}_{k}", r, random.choice(LEAF), x + math.cos(ang) * rr, y + math.sin(ang) * rr, (3.4 + random.random() * 2.4) * s, 2, lumpy=0.45 * s); sp.scale = (1, 1, 0.85)
for (x, y) in [(-2.5, 24), (0.5, 80), (4, 92), (8, 104), (12, 116), (33, 96.2), (41, 96.2), (48, 96.2), (67, 20), (67.5, 36), (67, 52), (66.5, 68), (66, 84), (65.5, 100), (64, 114), (24, -22.5), (33, -22), (10, -35), (-3, -33), (62, -13), (48.5, 1)]: tree(x, y, 0.75 + random.random() * 0.35)
def lamp(x, y):
    cyl(f"lp{x}_{y}", 0.08, 0.12, 9, M_GREY, x, y, 0, 10); box(f"lh{x}_{y}", x - 0.6, y - 0.2, 9, 1.2, 0.4, 0.2, M_DARK)
for (x, y) in [(51.5, 0), (51.5, 30), (51.5, 60), (64.5, 15), (64.5, 45), (64.5, 75), (64.5, 104), (20, -11), (25, 96.2), (15, 86)]: lamp(x, y)
def person(x, y, col, rot):
    grp = [cyl("pb", 0.22, 0.22, 0.75, pbr(f"cl{col}", srgb(col), 0.8), 0, 0, 0.6, 12), sphere("ph", 0.14, M_SKIN, 0, 0, 1.62, 2), cyl("pl1", 0.09, 0.09, 0.8, M_DARK, -0.11, 0, 0, 8), cyl("pl2", 0.09, 0.09, 0.8, M_DARK, 0.11, 0, 0, 8)]
    e = bpy.data.objects.new("person", None); COLL_E.objects.link(e); e.location = (x, y, 0.1); e.rotation_euler = (0, 0, rot)
    for o in grp: o.parent = e
for (x, y, c) in [(33, -2, "d84a3a"), (35.5, -1.2, "2c5aa0"), (33.5, -6, "f2f2f2"), (46, 8, "3d7a3d"), (46, 28, "e6b800"), (40, -1.8, "444444"), (37, 104.5, "d84a3a"), (51.5, 70, "2c5aa0"), (45, 72, "f2f2f2"), (36, 76, "3d7a3d")]: person(x, y, c, random.random() * 6.28)
# ---------------- world / light ----------------
world = bpy.data.worlds.new("World"); scene.world = world; world.use_nodes = True; wn = world.node_tree
SUN_AZ = 215 + 8.84 if VIEW not in ("rear", "aerial_ne") else 150
sky = wn.nodes.new("ShaderNodeTexSky"); sky.sky_type = 'NISHITA'; sky.sun_elevation = math.radians(44); sky.sun_rotation = math.radians(SUN_AZ); sky.sun_intensity = 0.45; sky.altitude = 550; sky.air_density = 1.0; sky.dust_density = 1.2; sky.ozone_density = 1.0
bg = wn.nodes["Background"]; wn.links.new(sky.outputs["Color"], bg.inputs["Color"]); bg.inputs["Strength"].default_value = 0.55
sun = bpy.data.lights.new("sun", 'SUN'); sun.energy = 3.6; sun.angle = math.radians(1.0); sun.color = (1.0, 0.95, 0.88)
so = bpy.data.objects.new("sun", sun); scene.collection.objects.link(so); so.rotation_euler = (math.radians(90 - 44), 0, math.radians(SUN_AZ + 180))
# ---------------- camera ----------------
views = {"aerial_sw": ((-54, -68, 80), (28, 38, 0), 44), "aerial_se": ((108, -66, 76), (30, 36, 0), 42), "aerial_ne": ((100, 160, 82), (30, 66, 0), 42), "top": ((30, 44, 250), (30, 44.01, 0), 42),
         "entrance": ((49.5, -21.5, 2.7), (32.5, 2, 4.6), 60), "rear": ((63.5, 117.5, 9.5), (30, 90, 1.5), 62), "road": ((-29, -4, 6.0), (3, 44, 5.5), 58), "east": ((72, 44, 6), (40, 30, 3), 62)}
pos, look, fov = views.get(VIEW, views["aerial_sw"])
cam = bpy.data.cameras.new("cam"); cam.sensor_fit = 'VERTICAL'; cam.sensor_height = 24; cam.lens = 12 / math.tan(math.radians(fov) / 2); cam.clip_end = 2000
co = bpy.data.objects.new("cam", cam); scene.collection.objects.link(co); co.location = pos
d = Vector(look) - Vector(pos); co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); scene.camera = co
scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = SAMPLES; scene.cycles.use_adaptive_sampling = True; scene.cycles.adaptive_threshold = 0.02
scene.cycles.use_denoising = True; scene.cycles.denoiser = 'OPENIMAGEDENOISE'; scene.cycles.max_bounces = 6; scene.cycles.diffuse_bounces = 3; scene.cycles.glossy_bounces = 3; scene.cycles.transparent_max_bounces = 8
scene.render.resolution_x = RESX; scene.render.resolution_y = RESY; scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'AgX'; scene.view_settings.look = 'AgX - Punchy'; scene.view_settings.exposure = -0.35
scene.render.image_settings.file_format = 'PNG'; scene.render.filepath = os.path.join(HERE, OUT)
print("objects:", len(bpy.data.objects)); bpy.ops.render.render(write_still=True); print("RENDER DONE", scene.render.filepath)
