import bpy, bmesh, json, math, sys, os, random
from mathutils import Vector
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
VIEW = argv[0] if argv else "entrance"; OUT = argv[1] if len(argv) > 1 else f"out/{VIEW}.png"; SAMPLES = int(argv[2]) if len(argv) > 2 else 64
RESX, RESY = (int(argv[3]), int(argv[4])) if len(argv) > 4 else (1920, 1080)
FLAGS = argv[5].split(',') if len(argv) > 5 else []
ORTHO = 'ortho' in FLAGS; PHOTO = 'photo' in FLAGS
HERE = os.path.dirname(os.path.abspath(__file__)); TEX = os.path.join(HERE, "tex")
S = json.load(open(os.path.join(HERE, "..", "mm_study", "layout.json")))
PANO = json.load(open(os.path.join(HERE, '..', 'gmaps', 'pano_local.json'))) if os.path.exists(os.path.join(HERE, '..', 'gmaps', 'pano_local.json')) else {}
random.seed(7)
# ---------------- reset ----------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene; scene.unit_settings.system = 'METRIC'
SECTION = {"section_aa": ("x", 35, "keep_ge"), "section_bb": ("y", 75, "keep_ge"), "section_cc": ("y", 88.6, "keep_ge")}.get(VIEW)
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
# ---------------- ground, roads ----------------
if ORTHO:
    OJ = json.load(open(os.path.join(HERE, '..', 'gmaps', 'ortho_local.json')))
    mo = bpy.data.materials.new("ortho"); mo.use_nodes = True; nt = mo.node_tree; p = nt.nodes["Principled BSDF"]; t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(os.path.join(HERE, '..', 'gmaps', 'ortho_local.jpg')); nt.links.new(t.outputs["Color"], p.inputs["Base Color"]); p.inputs["Roughness"].default_value = 0.9; p.inputs["Specular IOR Level"].default_value = 0.15
    v = [(OJ["X0"], OJ["Y0"], -0.02), (OJ["X1"], OJ["Y0"], -0.02), (OJ["X1"], OJ["Y1"], -0.02), (OJ["X0"], OJ["Y1"], -0.02)]
    og = mesh_obj("ortho", v, [(0, 1, 2, 3)], mo); og.data.uv_layers.new(); uv = og.data.uv_layers.active.data
    for i, co in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]): uv[i].uv = co
    gr_ = flat("ground", [(-900, -900), (900, -900), (900, 900), (-900, 900)], M_GRASS, -0.05)
    pr_ = flat("parcel", S["parcel"], M_GRASS2, 0.0)
    if PHOTO:
        for o_ in (og, gr_): o_.is_shadow_catcher = True
else:
    flat("ground", [(-400, -400), (500, -400), (500, 600), (-400, 600)], M_GRASS, -0.03)
    flat("parcel", S["parcel"], M_GRASS2, 0.0)
    flat("road", S["ROAD"], M_ROAD, 0.03, 0.08); flat("elane", S["ELANE"], M_LANE, 0.03, 0.06)
    flat("river", S["RIVER"], M_WATER, -0.3)
    flat("riverbed", S["RIVER"], noise_mat("bed", srgb("6b6a5e"), srgb("8c8a7a"), 10, 4, 0.9, 0.3), -0.9)
flat("paved", S["PAVED"], M_ASPH, 0.04, 0.1); flat("apron", S["APRON"], M_ASPH, 0.04, 0.1)
lx, ly, lw, lh = S["LANE"]; flat("lane", [(lx, ly), (lx + lw, ly), (lx + lw, ly + lh), (lx, ly + lh)], M_ASPH, 0.04, 0.1)
ex, ey, ew, eh = S["ENTRY_ROAD"]; flat("entry", [(ex - (0 if ORTHO else 8), ey), (ex + ew, ey), (ex + ew, ey + eh), (ex - (0 if ORTHO else 8), ey + eh)], M_ASPH, 0.045, 0.1)
# road centre line dashes
cl = S["ROAD_CL"] if not ORTHO else []
for i in range(len(cl) - 1):
    a, b = cl[i], cl[i + 1]; L = math.hypot(b[0] - a[0], b[1] - a[1]); n = int(L / 6)
    for k in range(n):
        t0 = (k + 0.1) / n; t1 = (k + 0.6) / n; p0 = (a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0); p1 = (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1)
        dx, dy = p1[0] - p0[0], p1[1] - p0[1]; l = math.hypot(dx, dy); nx, ny = -dy / l * 0.08, dx / l * 0.08
        flat(f"dash{i}_{k}", [(p0[0] + nx, p0[1] + ny), (p1[0] + nx, p1[1] + ny), (p1[0] - nx, p1[1] - ny), (p0[0] - nx, p0[1] - ny)], M_LINE, 0.115)
bays = []
for (x0, y0, n) in S["ROWS"]:
    for i in range(n + 1): flat(f"pl{x0}_{y0}_{i}", [(x0 + i * 2.5 - 0.06, y0), (x0 + i * 2.5 + 0.06, y0), (x0 + i * 2.5 + 0.06, y0 + 5), (x0 + i * 2.5 - 0.06, y0 + 5)], M_LINE, 0.145)
    for i in range(n): bays.append((x0 + i * 2.5 + 1.25, y0 + 2.5))
for i in range(4): flat(f"dis{i}", [(S["DIS"][0] + i * 3.5 + 0.1, S["DIS"][1] + 0.1), (S["DIS"][0] + i * 3.5 + 3.4, S["DIS"][1] + 0.1), (S["DIS"][0] + i * 3.5 + 3.4, S["DIS"][1] + 4.9), (S["DIS"][0] + i * 3.5 + 0.1, S["DIS"][1] + 4.9)], M_BLUE, 0.142)
for i in range(9): flat(f"zebra{i}", [(14.5 + i * 0.9, 59.3), (14.95 + i * 0.9, 59.3), (14.95 + i * 0.9, 64.7), (14.5 + i * 0.9, 64.7)], M_LINE, 0.146)
yx, yy, yw, yh = S["YARD"]; flat("yard", [(yx, yy), (yx + yw, yy), (yx + yw, yy + yh), (yx, yy + yh)], M_GRAVEL, 0.05)
gx, gy, gw, gh = S["GARDEN"]; flat("garden", [(gx, gy), (gx + gw, gy), (gx + gw, gy + gh), (gx, gy + gh)], noise_mat("gardenbed", srgb("6a9a44"), srgb("9ccf72"), 6, 5, 0.95, 0.3), 0.05)
def fence(x0, y0, x1, y1, h=2.0):
    L = math.hypot(x1 - x0, y1 - y0); n = max(1, round(L / 2.5))
    for i in range(n + 1): cyl(f"fp{x0}{y0}{i}", 0.04, 0.04, h, M_GREY, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 0, 6)
    m = pbr("mesh", srgb("3d5a30"), 0.8, 0.3, alpha=0.3); v = [(x0, y0, 0.1), (x1, y1, 0.1), (x1, y1, h), (x0, y0, h)]; mesh_obj(f"fw{x0}{y0}", v, [(0, 1, 2, 3)], m)
fence(yx, yy, yx + yw, yy); fence(yx + yw, yy, yx + yw, yy + yh); fence(yx, yy + yh, yx + yw, yy + yh)
fence(gx, gy, gx + gw, gy); fence(gx + gw, gy, gx + gw, gy + gh); fence(gx, gy + gh, gx + gw, gy + gh)
for i in range(6): box(f"stack{i}", yx + 2 + (i % 3) * 4.5, yy + 3 + (i // 3) * 10, 0.05, 2.4, 1.2, 1.2 + (i % 3) * 0.5, [M_WHITE, M_GREY, pbr("wood", srgb("c98c4a"), 0.8)][i % 3])
for i in range(4): box(f"pal{i}", yx + 10, yy + 2 + i * 6.5, 0.05, 1.2, 6, 2.2, pbr("sack", srgb("d8cfc0"), 0.9))
# ---------------- building ----------------
hx, hy, hw, hd = S["HALL"]; wx, wy, ww, wd = S["WH"]; enx, eny, enw, end_ = S["ENTR"]; px, py, pw, pd = S["PICK"]
HALL_H, WH_H, ENT_H = 8.6, 9.5, 9.2; T = 0.25; B = COLL_B
box("hfloor", hx, hy, -0.05, hw, hd, 0.25, M_FLOOR, B); box("wfloor", wx, wy, -0.05, ww, wd, 0.25, M_FLOOR, B)
def walls(pfx, x, y, w, d, h, mat):
    box(pfx + "N", x, y + d - T, 0, w, T, h, mat, B); box(pfx + "S", x, y, 0, w, T, h, mat, B); box(pfx + "W", x, y, 0, T, d, h, mat, B); box(pfx + "E", x + w - T, y, 0, T, d, h, mat, B)
walls("hall", hx, hy, hw, hd, HALL_H, M_FACADE); walls("wh", wx, wy, ww, wd, WH_H, M_WH)
box("hroof", hx, hy, HALL_H - 0.3, hw, hd, 0.3, M_ROOF, B); box("wroof", wx, wy, WH_H - 0.3, ww, wd, 0.3, M_ROOF, B)
def parapet(p, x, y, w, d, h):
    box(p + "1", x - 0.1, y - 0.1, h - 0.1, w + 0.2, 0.35, 0.5, M_DARK, B); box(p + "2", x - 0.1, y + d - 0.25, h - 0.1, w + 0.2, 0.35, 0.5, M_DARK, B); box(p + "3", x - 0.1, y - 0.1, h - 0.1, 0.35, d + 0.2, 0.5, M_DARK, B); box(p + "4", x + w - 0.25, y - 0.1, h - 0.1, 0.35, d + 0.2, 0.5, M_DARK, B)
parapet("hp", hx, hy, hw, hd, HALL_H); parapet("wp", wx, wy, ww, wd, WH_H)
box("whband1", wx - 0.05, wy - 0.1, WH_H - 2.2, ww + 0.1, 0.12, 1.4, M_FACADE, B); box("whband2", wx - 0.1, wy - 0.05, WH_H - 2.2, 0.12, wd + 0.1, 1.4, M_FACADE, B); box("whband3", wx + ww - 0.02, wy - 0.05, WH_H - 2.2, 0.12, wd + 0.1, 1.4, M_FACADE, B)
# plinth + downpipes
box("plS", hx - 0.08, hy - 0.1, 0, hw + 0.16, 0.1, 0.6, M_PLINTH, B); box("plW", hx - 0.1, hy - 0.08, 0, 0.1, hd + 0.16, 0.6, M_PLINTH, B); box("plE", hx + hw, hy - 0.08, 0, 0.1, hd + 0.16, 0.6, M_PLINTH, B); box("plN", hx - 0.08, hy + hd, 0, hw + 0.16, 0.1, 0.6, M_PLINTH, B)
box("wplS", wx - 0.08, wy - 0.1, 0, ww + 0.16, 0.1, 0.6, M_PLINTH, B); box("wplE", wx + ww, wy, 0, 0.1, wd, 0.6, M_PLINTH, B); box("wplW", wx - 0.1, wy, 0, 0.1, wd, 0.6, M_PLINTH, B)
for i, (dx, dy) in enumerate([(hx - 0.2, hy + 10), (hx - 0.2, hy + 34), (hx - 0.2, hy + 58), (hx + hw + 0.1, hy + 20), (hx + hw + 0.1, hy + 50), (wx - 0.2, wy + 8), (wx + ww + 0.1, wy + 8), (wx + ww + 0.1, wy + 26)]): cyl(f"dp{i}", 0.08, 0.08, HALL_H - 0.4, M_GREY, dx, dy, 0, 8, B)
# entrance block
box("entblock", enx, hy - 0.3, 0, 16, 14.3, ENT_H, M_WHITE, B); box("entroof", enx - 0.2, hy - 0.4, ENT_H, 16.4, 14.6, 0.3, M_ROOF, B)
box("cwS", enx + 0.5, hy - 0.45, 0.8, 15.0, 0.3, 7.2, M_GLASS, B); box("cwW", enx - 0.05, hy + 0.8, 0.8, 0.3, 12.0, 7.2, M_GLASS, B)
for i in range(7): box(f"mul{i}", enx + 1.5 + i * 2.1, hy - 0.5, 0.8, 0.12, 0.4, 7.2, M_STEEL, B)
for i in range(3): box(f"tran{i}", enx + 0.5, hy - 0.5, 2.5 + i * 2.3, 15.0, 0.4, 0.1, M_STEEL, B)
box("canopy", enx, eny, 3.6, 16, 6, 0.35, M_NAVY, B)
for i in range(3): cyl(f"cp{i}", 0.15, 0.15, 3.6, M_STEEL, enx + 1 + i * 7, eny + 0.8, 0, 12, B)
box("doors", enx + 5.5, hy - 0.55, 0.05, 5, 2.6, 0.2, M_GLASS, B)
# strip windows W/E with dark frames
for y in [hy + 16 + k * 3.2 for k in range(int((hd - 19) / 3.2))]:
    box(f"wfW{y}", hx - 0.1, y - 0.1, 5.5, 0.14, 2.6, 1.5, M_DARK, B); box(f"wgW{y}", hx - 0.12, y, 5.6, 0.1, 2.4, 1.3, M_GLASS, B)
    box(f"wfE{y}", hx + hw - 0.04, y - 0.1, 5.5, 0.14, 2.6, 1.5, M_DARK, B); box(f"wgE{y}", hx + hw, y, 5.6, 0.1, 2.4, 1.3, M_GLASS, B)
# docks
for i, dx in enumerate(S["DOCKS"]):
    box(f"dd{i}", dx - 1.5, wy - 0.12, 1.2, 3.0, 0.15, 3.4, M_DARK, B); box(f"ds{i}", dx - 1.8, wy - 0.9, 1.0, 3.6, 0.8, 3.9, pbr("shelter", srgb("1a1a1a"), 0.7), B)
box("dockplat", S["DOCKS"][0] - 2.2, wy - 1.2, 0, S["DOCKS"][1] - S["DOCKS"][0] + 5.0, 1.2, 1.2, M_PLINTH, B)
box("levelgate", S["LEVEL"][0], wy - 0.12, 0, 3.0, 0.15, 4.0, M_DARK, B)
# pick-up canopy
box("pickroof", px, py, 4.3, pw, pd, 0.25, M_ROOF, B)
for i in range(4): cyl(f"pp{i}", 0.12, 0.12, 4.3, M_STEEL, px + 0.4 + i * (pw - 0.8) / 3, py + 0.4, 0, 12, B)
for i in range(3): box(f"pg{i}", px + 0.9 + i * 4.5, py + pd - 0.1, 0, 3.2, 0.1, 3.6, pbr("gate", srgb("3a3a3a"), 0.6), B)
plane_sign("vydaj", img_mat("vydaj", os.path.join(TEX, "vydaj.png"), alpha=False), pw, 1.0, px + pw / 2, py - 0.05, 4.9, 0, B)
# rooftop units + skylights
for i in range(6): box(f"rtu{i}", hx + 6 + (i % 3) * 14, hy + 20 + (i // 3) * 36, HALL_H, 3, 2.2, 1.6, pbr("rtu", srgb("a9adb2"), 0.5, 0.6), B)
for i in range(2): box(f"wrtu{i}", wx + 6 + i * 16, wy + 10, WH_H, 2.5, 2, 1.4, pbr("rtu", srgb("a9adb2"), 0.5, 0.6), B)
for i in range(5): box(f"sky{i}", hx + 5, hy + 8 + i * 12, HALL_H, hw - 10, 2.0, 0.35, pbr("skylight", srgb("dfe8f0"), 0.2, 0.0, alpha=0.8, trans=0.4), B)
# signs / logos
M_LOGO = img_mat("logo", os.path.join(TEX, "logo.png"))
plane_sign("logoS", M_LOGO, 16, 2.67, enx + 8, hy - 0.42, ENT_H + 1.5, 0, B)
plane_sign("logoWH", M_LOGO, 20, 3.33, wx + ww / 2, wy - 0.42, WH_H + 1.8, 0, B)
plane_sign("logoW", M_LOGO, 20, 3.33, hx - 0.42, hy + hd - 14, HALL_H + 1.8, -math.pi / 2, B)
plane_sign("logoE", M_LOGO, 20, 3.33, hx + hw + 0.42, hy + 30, HALL_H + 1.8, math.pi / 2, B)
bbs = ["kuchyne", "kupelne", "podlahy", "nabytok", "dvere", "stavebniny"]
for i, b in enumerate(bbs[:2]): plane_sign(f"bb{b}", img_mat(f"bb{b}", os.path.join(TEX, f"bb_{b}.png"), alpha=False), 6.0, 2.5, 47.5 + i * 6.5, wy - 0.22, 6.2, 0, B)
for i, b in enumerate(["podlahy", "stavebniny"]): plane_sign(f"bbw{b}", img_mat(f"bb{b}", os.path.join(TEX, f"bb_{b}.png"), alpha=False), 8, 3.3, wx - 0.22, wy + 4 + i * 10, 4.5, -math.pi / 2, B)
for i, b in enumerate(["nabytok", "dvere"]): plane_sign(f"bbh{b}", img_mat(f"bb{b}", os.path.join(TEX, f"bb_{b}.png"), alpha=False), 8, 3.3, hx - 0.22, hy + 20 + i * 10, 2.3, -math.pi / 2, B)
plane_sign("vstup", img_mat("vstup", os.path.join(TEX, "vstup.png"), alpha=False), 3.2, 1.25, enx + 8, eny - 0.06, 4.6, 0, B)
# interior
for cx in [hx + 0.5, 23, 35, 47, hx + hw - 0.5]:
    for cy in [hy + 0.5 + k * 12 for k in range(6)]: box(f"col{cx}_{cy}", cx - 0.2, min(cy, hy + hd - 0.9), 0, 0.4, 0.4, HALL_H - 0.4, M_STEEL, B)
for cy in [hy + 0.5 + k * 12 for k in range(6)]: box(f"truss{cy}", hx + 0.5, min(cy, hy + hd - 0.9), HALL_H - 1.5, hw - 1, 0.35, 1.1, pbr("truss", srgb("a8adb3"), 0.5, 0.5), B)
for cx in [wx + 0.5, 42, wx + ww - 0.5]:
    for cy in [wy + 0.5 + k * 11 for k in range(4)]: box(f"wcol{cx}_{cy}", cx - 0.2, min(cy, wy + wd - 0.9), 0, 0.4, 0.4, WH_H - 0.4, M_STEEL, B)
box("mezz", hx + 0.25, hy + 0.25, 4.0, hw - 0.5, 14, 0.35, pbr("mezz", srgb("dcdcdc"), 0.6), B); box("rail", hx + 0.25, hy + 14, 4.35, hw - 0.5, 0.08, 1.1, M_GLASS, B)
for i in range(5): box(f"part{i}", hx + 3 + i * 9, hy + 1, 4.35, 0.12, 12, 3.0, M_WHITE, B)
box("stair", hx + 1, hy + 3, 0, 2.0, 5.0, 4.0, pbr("stair", srgb("d0d0d0"), 0.6), B)
for i in range(6): box(f"co{i}", 13 + i * 1.7, hy + 1.5, 0, 0.9, 3.2, 0.95, M_WHITE, B); box(f"cot{i}", 13.15 + i * 1.7, hy + 3.2, 0.95, 0.6, 0.6, 0.5, M_DARK, B)
deps = [(31, 88, 16, 14, "b0bec5"), (11, 102, 23, 18, "e0a98a"), (34, 102, 23, 18, "9ec5e8"), (11, 120, 23, 18, "c9b28d"), (34, 120, 23, 18, "f0d78a"), (11, 138, 15, 18, "b8aea0"), (26, 138, 19, 18, "c7a8d0"), (45, 138, 12, 18, "a8d4a8")]
for j, (dx, dy, dw, dd, col) in enumerate(deps):
    m = pbr(f"dep{j}", srgb(col), 0.7)
    for r in range(int((dw - 2) / 3.2)): box(f"sh{j}_{r}", dx + 1.5 + r * 3.2, dy + 2, 0, 1.2, dd - 4, 2.2, m, B)
    if SECTION: flat(f"depf{j}", [(dx, dy), (dx + dw, dy), (dx + dw, dy + dd), (dx, dy + dd)], m, 0.21, coll=B)
for r in range(4):
    rx = 30 + r * 7
    for sy in (57, 76):
        box(f"rack{r}_{sy}", rx, sy, 0, 2.6, 9, 7.2, M_RACK, B)
        for lvl in range(1, 4): box(f"rb{r}_{sy}_{lvl}", rx - 0.1, sy - 0.1, lvl * 1.8, 2.8, 9.2, 0.15, M_GREY, B)
# ---------------- environment objects ----------------
if not SECTION:
    PX, PY = 4.9, 61
    legs = [(0, 0), (1.3, 0), (0.65, 1.1)]
    for i, (a, b) in enumerate(legs): cyl(f"leg{i}", 0.12, 0.14, 14, M_STEEL, PX + a - 0.65, PY + b - 0.4, 0, 10)
    z = 1.0
    while z < 14:
        for i, (a, b) in enumerate(legs):
            c, d = legs[(i + 1) % 3]; L = math.hypot(c - a, d - b); ob = cyl(f"br{z}_{i}", 0.04, 0.04, L, M_STEEL, 0, 0, 0, 6)
            ob.location = (PX + (a + c) / 2 - 0.65, PY + (b + d) / 2 - 0.4, z); ob.rotation_euler = (math.pi / 2, 0, math.atan2(d - b, c - a) + math.pi / 2)
        z += 1.6
    # prism sign
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=3, radius1=2.66, radius2=2.66, depth=4.6); me = bpy.data.meshes.new("prism"); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new("prism", me); COLL_E.objects.link(ob); ob.location = (PX, PY, 16.6); ob.rotation_euler = (0, 0, math.pi / 6)
    mp = img_mat("pylon", os.path.join(TEX, "pylon.png"), alpha=False); ob.data.materials.append(mp); ob.data.materials.append(M_DARK)
    me.uv_layers.new(); uv = me.uv_layers.active.data
    k = 0
    for pg in me.polygons:
        if len(pg.vertices) == 4:
            nrm = pg.normal; right = Vector((-nrm.y, nrm.x, 0.0)); right.normalize()  # (-n) x z
            cos_ = [me.vertices[vi].co for vi in pg.vertices]; proj = [v_.dot(right) for v_ in cos_]; pmin, pmax = min(proj), max(proj); zmin = min(v_.z for v_ in cos_); zmax = max(v_.z for v_ in cos_)
            for li, vi in zip(pg.loop_indices, pg.vertices):
                v_ = me.vertices[vi].co; uv[li].uv = (k / 3 + (v_.dot(right) - pmin) / (pmax - pmin + 1e-9) / 3, (v_.z - zmin) / (zmax - zmin + 1e-9))
            k += 1
        else:
            pg.material_index = 1
    for zc in (14.2, 19.0): cyl(f"cap{zc}", 2.9, 2.9, 0.25, M_DARK, PX, PY, zc - 0.125, 3).rotation_euler = (0, 0, math.pi / 6)
    # flags
    for i, fn in enumerate(["flag_o", "flag_y", "flag_w", "flag_o", "flag_y", "flag_w"]):
        fx, fy = 12.5 + i * 2.6, 76; cyl(f"fpole{i}", 0.06, 0.08, 8, M_STEEL, fx, fy, 0, 8)
        f = plane_sign(f"flag{i}", img_mat(fn, os.path.join(TEX, f"{fn}.png"), alpha=False), 1.6, 2.4, fx + 0.1, fy - 0.8, 6.7, -1.2)
    # cars
    car_cols = ["dedede", "2b2b2b", "8a8f94", "b5262a", "2c4e9a", "f2f2f2", "5c5f63", "1f1f1f", "9bb0c7", "c9c9c9", "7a1f1f", "3b5d3b"]
    def car(x, y, rot, col):
        m = pbr(f"paint{col}", srgb(col), 0.25, 0.6, coat=1.0); grp = []
        b = box("cb", -0.9, -2.2, 0.3, 1.8, 4.4, 0.65, m, bevel=0.12); grp.append(b)
        cab = box("cc", -0.78, -1.1, 0.95, 1.56, 2.2, 0.62, M_GLASS, bevel=0.12); grp.append(cab)
        roof = box("cr", -0.72, -0.85, 1.52, 1.44, 1.7, 0.06, m); grp.append(roof)
        for (wx_, wz) in [(-0.82, 1.45), (0.82, 1.45), (-0.82, -1.45), (0.82, -1.45)]:
            w = cyl("cw", 0.33, 0.33, 0.24, M_DARK, 0, 0, 0, 16); w.location = (wx_, wz, 0.33); w.rotation_euler = (0, math.pi / 2, 0); grp.append(w)
            r = cyl("rim", 0.2, 0.2, 0.26, M_STEEL, 0, 0, 0, 10); r.location = (wx_, wz, 0.33); r.rotation_euler = (0, math.pi / 2, 0); grp.append(r)
        for (lx_, ly_, c, e) in [(-0.6, 2.2, "fff6d5", 2.0), (0.6, 2.2, "fff6d5", 2.0), (-0.6, -2.2, "c62828", 1.0), (0.6, -2.2, "c62828", 1.0)]: grp.append(box("lamp", lx_ - 0.2, ly_ - 0.04, 0.72, 0.4, 0.08, 0.16, pbr(f"lamp{c}", srgb(c), 0.3, emit=srgb(c), emit_str=e)))
        e = bpy.data.objects.new("car", None); COLL_E.objects.link(e); e.location = (x, y, 0.05); e.rotation_euler = (0, 0, rot)
        for o in grp: o.parent = e
    for (bx, by) in bays:
        if random.random() < 0.42: car(bx, by, (0 if random.random() < 0.5 else math.pi) + (random.random() - 0.5) * 0.04, random.choice(car_cols))
    car(16, 14, -math.pi / 2, "b5262a"); car(30, 46, math.pi / 2, "dedede"); car(13, 62, -math.pi / 2, "2c4e9a")
    def truck(x, y, rot):
        grp = [box("tcab", -1.25, -2.05, 0.8, 2.5, 2.3, 3.2, pbr("cabred", srgb("c62828"), 0.3, 0.5, coat=1.0), bevel=0.1), box("tcabg", -1.1, -2.1, 2.2, 2.2, 0.1, 1.2, M_GLASS), box("trail", -1.27, -0.5, 1.0, 2.55, 13.6, 2.8, M_WHITE, bevel=0.05)]
        grp.append(plane_sign("tlogo1", M_LOGO, 10, 1.67, 1.29, 6.3, 2.4, math.pi / 2)); grp.append(plane_sign("tlogo2", M_LOGO, 10, 1.67, -1.29, 6.3, 2.4, -math.pi / 2))
        for i in range(6):
            w = cyl("tw", 0.5, 0.5, 0.35, M_DARK, 0, 0, 0, 14); w.location = ((1.1 if i % 2 else -1.1), [-0.8, -0.8, 9.5, 9.5, 11.2, 11.2][i], 0.5); w.rotation_euler = (0, math.pi / 2, 0); grp.append(w)
        e = bpy.data.objects.new("truck", None); COLL_E.objects.link(e); e.location = (x, y, 0.05); e.rotation_euler = (0, 0, rot)
        for o in grp: o.parent = e
    truck(S["DOCKS"][0], 54 - 1.9, math.pi); truck(S["DOCKS"][1], 54 - 1.9, math.pi); truck(62, 36, math.pi * 0.75)
    box("forklift", yx + 7, yy + 20, 0.05, 1.2, 2.4, 1.4, M_YELLOW)
    for i in range(3): box(f"ppal{i}", px + 1.6 + i * 4.5, py + 1.5, 0.05, 1.2, 1.0, 0.9, pbr("wood", srgb("c98c4a"), 0.8))
    def tree(x, y, s=1.0):
        cyl(f"trunk{x}_{y}", 0.14 * s, 0.3 * s, 3.2 * s, M_BROWN, x, y, 0, 10)
        for k in range(5):
            r = (1.4 + random.random() * 0.9) * s; ang = random.random() * 6.28; rr = random.random() * 1.3 * s
            sp = sphere(f"can{x}_{y}_{k}", r, random.choice(LEAF), x + math.cos(ang) * rr, y + math.sin(ang) * rr, (3.4 + random.random() * 2.4) * s, 2, lumpy=0.45 * s); sp.scale = (1, 1, 0.85)
    trees = [(3, 95), (4, 108), (5, 122), (6.5, 136), (8, 150), (10, 163), (30, 165), (45, 167), (66, 110), (68, 128), (64, 148), (60, 162), (74, 100), (78, 80), (80, 60), (82, 46), (76, 30), (40, 1), (27, 0), (5, 40), (6, 28), (2, 80)]
    for (x, y) in trees: tree(x, y, 0.9 + random.random() * 0.4)
    for t in range(14): tree(92 + random.random() * 6 - t * 1.5, 10 + t * 12, 1.1 + random.random() * 0.5)
    if not PHOTO:
        for t in range(10): tree(-18 - random.random() * 8 + t * 0.5, 30 + t * 16, 1.0 + random.random() * 0.5)
        for t in range(12): tree(-40 - random.random() * 30, -20 + t * 20, 1.2 + random.random() * 0.6)
        for t in range(10): tree(110 + random.random() * 30, -10 + t * 22, 1.2 + random.random() * 0.6)
    def lamp(x, y):
        cyl(f"lp{x}_{y}", 0.08, 0.12, 9, M_GREY, x, y, 0, 10); box(f"lh{x}_{y}", x - 0.2, y - 0.2, 9, 1.2, 0.4, 0.25, M_DARK)
    for (x, y) in [(13, 30), (42, 30), (13, 46), (42, 46), (8, 62), (45, 12), (60, 30), (59.5, 100), (59.5, 140)]: lamp(x, y)
    box("waste", 58, 150, 0, 4, 4, 2.2, pbr("waste", srgb("6d6d6d"), 0.7)); box("cartshelter", 19, 76.5, 0, 4, 2.2, 2.3, M_STEEL)
    def person(x, y, col, rot):
        grp = [cyl("pb", 0.22, 0.22, 0.75, pbr(f"cl{col}", srgb(col), 0.8), 0, 0, 0.6, 12), sphere("ph", 0.14, M_SKIN, 0, 0, 1.62, 2), cyl("pl1", 0.09, 0.09, 0.8, M_DARK, -0.11, 0, 0, 8), cyl("pl2", 0.09, 0.09, 0.8, M_DARK, 0.11, 0, 0, 8)]
        e = bpy.data.objects.new("person", None); COLL_E.objects.link(e); e.location = (x, y, 0.05); e.rotation_euler = (0, 0, rot)
        for o in grp: o.parent = e
    for (x, y, c) in [(17, 79, "d84a3a"), (19.5, 80.5, "2c5aa0"), (23, 78, "f2f2f2"), (15, 72, "3d7a3d"), (21, 84, "e6b800"), (33, 46, "444444"), (38, 47.5, "d84a3a"), (9, 63, "2c5aa0"), (26, 62, "f2f2f2")]: person(x, y, c, random.random() * 6.28)
# ---------------- section cut ----------------
if SECTION:
    axis, val, _ = SECTION
    cutter = box("cutter", -500, -500, -10, 1000, 1000, 100, None)
    if axis == "x": cutter.location = (val - 1000 + 500 - 500 + 0, 0, 0); cutter.scale = (1, 1, 1); cutter.location = (val - 500 - 500 + 500, 0, 0)
    # simpler: build cutter explicitly
    bpy.data.objects.remove(cutter)
    if axis == "x": cutter = box("cutter", val - 1000, -500, -10, 1000, 1000, 100, None)
    else: cutter = box("cutter", -500, val - 1000, -10, 1000, 1000, 100, None)
    cutter.hide_render = True; cutter.display_type = 'WIRE'
    for ob in list(COLL_B.objects):
        if ob.type != 'MESH': continue
        md = ob.modifiers.new("cut", 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = cutter; md.solver = 'FAST'
# ---------------- world / light ----------------
world = bpy.data.worlds.new("World"); scene.world = world; world.use_nodes = True; wn = world.node_tree
sky = wn.nodes.new("ShaderNodeTexSky"); sky.sky_type = 'NISHITA'; sky.sun_elevation = math.radians(42); sky.sun_rotation = math.radians(215); sky.sun_intensity = 0.45; sky.altitude = 550; sky.air_density = 1.0; sky.dust_density = 1.2; sky.ozone_density = 1.0
bg = wn.nodes["Background"]; wn.links.new(sky.outputs["Color"], bg.inputs["Color"]); bg.inputs["Strength"].default_value = 0.55
sun = bpy.data.lights.new("sun", 'SUN'); sun.energy = 3.6; sun.angle = math.radians(1.0); sun.color = (1.0, 0.95, 0.88)
so = bpy.data.objects.new("sun", sun); scene.collection.objects.link(so); so.rotation_euler = (math.radians(90 - 42), 0, math.radians(215 + 180))
# ---------------- camera ----------------
views = {
    "aerial": ((-60, -70, 90), (42, 90, 0), 38), "aerial_n": ((130, 230, 110), (38, 80, 0), 40),
    "entrance": ((10, 48, 2.6), (21, 90, 5), 55), "road": ((8, -2, 2.0), (30, 95, 6), 58), "dock": ((70, 10, 3.5), (48, 58, 4), 50),
    "plaza": ((2, 60, 1.7), (24, 92, 6), 55), "section_aa": ((-22, 92, 26), (46, 110, 3), 46), "section_bb": ((14, 24, 34), (40, 94, 3), 44), "section_cc": ((8, 56, 22), (34, 120, 3), 46),
}
SV = {}
if PANO:
    SV = {"sv_south": ((PANO["south"][0], PANO["south"][1], 2.6), (30, 75, 4.5), 62), "sv_mid": ((PANO["mid"][0], PANO["mid"][1], 2.6), (24, 86, 5), 70), "sv_far_south": ((PANO["far_south"][0], PANO["far_south"][1], 2.6), (26, 40, 4), 55)}
views.update(SV)
pos, look, fov = views.get(VIEW, views["entrance"])
cam = bpy.data.cameras.new("cam")
if VIEW in SV: cam.sensor_fit = 'HORIZONTAL'; cam.sensor_width = 36; cam.lens = 18 / math.tan(math.radians(fov) / 2)
else: cam.sensor_fit = 'VERTICAL'; cam.sensor_height = 24; cam.lens = 12 / math.tan(math.radians(fov) / 2)
co = bpy.data.objects.new("cam", cam); scene.collection.objects.link(co); co.location = pos
d = Vector(look) - Vector(pos); co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); scene.camera = co
# ---------------- render settings ----------------
scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = SAMPLES; scene.cycles.use_adaptive_sampling = True; scene.cycles.adaptive_threshold = 0.02
scene.cycles.use_denoising = True; scene.cycles.denoiser = 'OPENIMAGEDENOISE'; scene.cycles.max_bounces = 6; scene.cycles.diffuse_bounces = 3; scene.cycles.glossy_bounces = 3; scene.cycles.transparent_max_bounces = 8
scene.render.resolution_x = RESX; scene.render.resolution_y = RESY; scene.render.resolution_percentage = 100; scene.render.film_transparent = PHOTO
if PHOTO: scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'AgX'; scene.view_settings.look = 'AgX - Punchy'; scene.view_settings.exposure = -0.35
scene.render.image_settings.file_format = 'PNG'; scene.render.filepath = os.path.join(HERE, OUT)
print("objects:", len(bpy.data.objects))
bpy.ops.render.render(write_still=True)
print("RENDER DONE", scene.render.filepath)
