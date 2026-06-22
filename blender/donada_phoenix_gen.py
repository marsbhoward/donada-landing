"""
DONADA Phoenix — Generative NFT Script
Concept: A phoenix stands before a mirror. The reflection shows an alternate
         form with different colors and traits — equivalent exchange made visual.

HOW TO USE:
  1. Open Blender, go to the Scripting tab
  2. Paste or load this file
  3. Run generate() for a single preview
  4. Run generate_batch() for the full collection

REPLACING THE PLACEHOLDER:
  The create_phoenix() function uses primitive geometry as a stand-in.
  To use your actual model:
    1. Import your .fbx or .blend phoenix model into the scene manually
    2. Name the material slots: 'Body', 'Accent', 'Beak', 'Eye'
    3. Call apply_traits_to_model(obj, body_color, accent_color) instead
"""

import bpy
import random
import math
import json
import os
from mathutils import Vector, Euler

# ── Trait Definitions ─────────────────────────────────────────────────────────

BODY_COLORS = {
    'Crimson':     (0.80, 0.07, 0.04, 1.0),
    'Sapphire':    (0.04, 0.14, 0.82, 1.0),
    'Void':        (0.04, 0.02, 0.08, 1.0),
    'Ember':       (0.94, 0.38, 0.02, 1.0),
    'Specter':     (0.82, 0.82, 0.90, 1.0),
    'Obsidian':    (0.06, 0.06, 0.08, 1.0),
    'Jade':        (0.08, 0.52, 0.28, 1.0),
    'Amethyst':    (0.38, 0.08, 0.62, 1.0),
}

ACCENT_COLORS = {
    'Gold':        (1.00, 0.76, 0.08, 1.0),
    'Silver':      (0.78, 0.78, 0.84, 1.0),
    'Amber':       (1.00, 0.54, 0.04, 1.0),
    'Teal':        (0.08, 0.74, 0.64, 1.0),
    'Rose':        (0.90, 0.28, 0.45, 1.0),
    'Platinum':    (0.90, 0.92, 0.96, 1.0),
}

BACKGROUNDS = {
    'Deep Red':    (0.42, 0.02, 0.02, 1.0),   # reference image bg
    'Void':        (0.02, 0.02, 0.04, 1.0),
    'Midnight':    (0.02, 0.04, 0.16, 1.0),
    'Ash':         (0.10, 0.09, 0.09, 1.0),
    'Cobalt':      (0.02, 0.05, 0.28, 1.0),
    'Forest':      (0.03, 0.10, 0.04, 1.0),
}

MIRROR_AURAS = {
    'None':        None,
    'Flame':       (1.00, 0.35, 0.04, 1.0),
    'Electric':    (0.28, 0.58, 1.00, 1.0),
    'Dark Matter': (0.40, 0.00, 0.62, 1.0),
    'Celestial':   (0.80, 0.90, 1.00, 1.0),
    'Infernal':    (0.90, 0.04, 0.04, 1.0),
}

# Rarity weights: higher = more common
AURA_WEIGHTS = {
    'None': 40, 'Flame': 20, 'Electric': 15,
    'Dark Matter': 10, 'Celestial': 10, 'Infernal': 5,
}

# ── Utilities ─────────────────────────────────────────────────────────────────

def weighted_choice(weight_dict):
    keys = list(weight_dict.keys())
    weights = [weight_dict[k] for k in keys]
    return random.choices(keys, weights=weights, k=1)[0]

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in [bpy.data.materials, bpy.data.meshes, bpy.data.lights, bpy.data.cameras]:
        for item in block:
            block.remove(item)

def new_material(name, base_color, roughness=0.5, metallic=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = base_color
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    out.location = (300, 0)
    bsdf.location = (0, 0)
    return mat

def new_emission(name, color, strength=6.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    em = nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = color
    em.inputs['Strength'].default_value = strength
    links.new(em.outputs['Emission'], out.inputs['Surface'])
    return mat

def new_mirror_mat(name):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.88, 0.90, 1.0, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.0
    bsdf.inputs['Metallic'].default_value = 1.0
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

# ── Render & Camera ───────────────────────────────────────────────────────────

def setup_render(res=2048, samples=128):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.resolution_x = res
    sc.render.resolution_y = res
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    # GPU — change 'CUDA' to 'METAL' on Apple Silicon, 'OPENCL' for older AMD
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'CUDA'
        sc.cycles.device = 'GPU'
    except Exception:
        sc.cycles.device = 'CPU'

def setup_camera():
    cam_data = bpy.data.cameras.new('Camera')
    cam = bpy.data.objects.new('Camera', cam_data)
    bpy.context.collection.objects.link(cam)
    # Straight-on portrait framing
    cam.location = (0, -5.5, 0.6)
    cam.rotation_euler = Euler((math.radians(88), 0, 0))
    cam_data.lens = 90          # tighter = more portrait
    cam_data.clip_end = 100
    bpy.context.scene.camera = cam

def setup_world(bg_color):
    world = bpy.context.scene.world or bpy.data.worlds.new('World')
    bpy.context.scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    nodes.clear()
    out = nodes.new('ShaderNodeOutputWorld')
    bg = nodes.new('ShaderNodeBackground')
    bg.inputs['Color'].default_value = bg_color
    bg.inputs['Strength'].default_value = 0.4
    world.node_tree.links.new(bg.outputs['Background'], out.inputs['Surface'])

# ── Mirror Frame ──────────────────────────────────────────────────────────────

def create_mirror(accent_color, aura_name):
    """
    Arched rectangular mirror frame — the central dividing element.
    Frame is gold/accent metallic. A glassy mirror plane sits behind it.
    """
    frame_mat = new_material('FrameMat', accent_color, roughness=0.05, metallic=1.0)
    mirror_mat = new_mirror_mat('MirrorMat')

    frame_parts = []

    # Left vertical bar
    bpy.ops.mesh.primitive_cylinder_add(radius=0.07, depth=3.2, location=(-1.2, 0.0, 0.4))
    l = bpy.context.object; l.name = 'Frame_Left'
    l.data.materials.append(frame_mat)
    frame_parts.append(l)

    # Right vertical bar
    bpy.ops.mesh.primitive_cylinder_add(radius=0.07, depth=3.2, location=(1.2, 0.0, 0.4))
    r = bpy.context.object; r.name = 'Frame_Right'
    r.data.materials.append(frame_mat)
    frame_parts.append(r)

    # Bottom bar
    bpy.ops.mesh.primitive_cylinder_add(radius=0.07, depth=2.4, location=(0, 0.0, -1.2))
    b = bpy.context.object; b.name = 'Frame_Bottom'
    b.rotation_euler = Euler((0, math.radians(90), 0))
    b.data.materials.append(frame_mat)
    frame_parts.append(b)

    # Arch (top) — half torus
    bpy.ops.mesh.primitive_torus_add(
        major_radius=1.2, minor_radius=0.07,
        major_segments=32, minor_segments=12,
        location=(0, 0.0, 2.0)
    )
    arch = bpy.context.object; arch.name = 'Frame_Arch'
    # Keep only top half by scaling Z
    arch.scale.z = 0.7
    arch.data.materials.append(frame_mat)
    frame_parts.append(arch)

    # Mirror surface (glass plane behind frame)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0.05, 0.4))
    mp = bpy.context.object; mp.name = 'MirrorSurface'
    mp.scale = (1.15, 1.55, 1.0)
    mp.rotation_euler = Euler((math.radians(90), 0, 0))
    mp.data.materials.append(mirror_mat)

    # Aura glow ring around frame
    aura_color = MIRROR_AURAS.get(aura_name)
    if aura_color:
        bpy.ops.mesh.primitive_torus_add(
            major_radius=1.28, minor_radius=0.025,
            major_segments=64, minor_segments=8,
            location=(-1.28, 0.0, 0.4)
        )
        # Left glow bar
        for loc, rot, sc in [
            ((-1.28, 0.0, 0.4), (0, 0, 0),            (1, 1, 23)),
            ((1.28,  0.0, 0.4), (0, 0, 0),            (1, 1, 23)),
            ((0,     0.0,-1.2), (math.radians(90),0,0),(1, 1, 17)),
        ]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.025, depth=1, location=loc)
            glow = bpy.context.object
            glow.rotation_euler = Euler(rot)
            glow.scale = sc
            glow.data.materials.append(new_emission(f'Aura_{aura_name}', aura_color, strength=10.0))

# ── Phoenix (Placeholder) ─────────────────────────────────────────────────────

def create_phoenix(side, body_color, accent_color):
    """
    Simplified phoenix silhouette using primitives.

    ── TO USE YOUR ACTUAL MODEL ──────────────────────────────────────────────
    Replace this function body with:

        bpy.ops.import_scene.fbx(filepath='/path/to/phoenix.fbx')
        obj = bpy.context.selected_objects[0]
        obj.location = (x_pos, 0, -0.8)
        obj.name = f'{side}_Phoenix'
        apply_traits_to_model(obj, body_color, accent_color)
        return obj

    Make sure your model's material slots are named:
        'Body', 'Accent', 'Beak', 'Eye_White'
    ─────────────────────────────────────────────────────────────────────────
    """

    x_pos = -1.7 if side == 'Real' else 1.7

    body_mat   = new_material(f'{side}_Body',   body_color,   roughness=0.65)
    accent_mat = new_material(f'{side}_Accent', accent_color, roughness=0.45)
    beak_mat   = new_material(f'{side}_Beak',   (0.88, 0.52, 0.04, 1.0), roughness=0.3)
    eye_mat    = new_material(f'{side}_Eye',    (1.0, 1.0, 1.0, 1.0),    roughness=0.05)
    pupil_mat  = new_material(f'{side}_Pupil',  (0.02, 0.02, 0.02, 1.0), roughness=0.02)

    parts = []

    def add(name, prim_fn, mat, loc=(0,0,0), rot=(0,0,0), scale=(1,1,1)):
        prim_fn()
        obj = bpy.context.object
        obj.name = f'{side}_{name}'
        obj.location = (x_pos + loc[0], loc[1], loc[2])
        obj.rotation_euler = Euler((math.radians(rot[0]), math.radians(rot[1]), math.radians(rot[2])))
        obj.scale = scale
        obj.data.materials.clear()
        obj.data.materials.append(mat)
        parts.append(obj)
        return obj

    # Torso
    add('Torso', lambda: bpy.ops.mesh.primitive_uv_sphere_add(radius=0.5),
        body_mat, loc=(0, 0, -0.55), scale=(0.9, 0.85, 1.0))

    # Neck
    add('Neck', lambda: bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=0.35),
        body_mat, loc=(0, 0, 0.08))

    # Head
    add('Head', lambda: bpy.ops.mesh.primitive_uv_sphere_add(radius=0.40),
        body_mat, loc=(0, 0, 0.55))

    # Beak
    add('Beak', lambda: bpy.ops.mesh.primitive_cone_add(radius1=0.07, radius2=0.01, depth=0.26),
        beak_mat, loc=(0, -0.42, 0.48), rot=(90, 0, 0))

    # Eyes
    for ex, name in [(-0.16, 'EyeL'), (0.16, 'EyeR')]:
        add(f'{name}_White', lambda: bpy.ops.mesh.primitive_uv_sphere_add(radius=0.10),
            eye_mat, loc=(ex, -0.34, 0.62))
        add(f'{name}_Pupil', lambda: bpy.ops.mesh.primitive_uv_sphere_add(radius=0.065),
            pupil_mat, loc=(ex, -0.42, 0.62))

    # Flame crest spikes
    spike_data = [(0, 0, 0.52), (-0.13, 0, 0.40), (0.13, 0, 0.40),
                  (-0.24, 0, 0.28), (0.24, 0, 0.28)]
    for i, (sx, sy, sz) in enumerate(spike_data):
        h = 0.55 - i * 0.06
        mat = accent_mat if i % 2 == 0 else body_mat
        add(f'Spike{i}', lambda h=h: bpy.ops.mesh.primitive_cone_add(radius1=0.06, depth=h),
            mat, loc=(sx, sy, 0.55 + sz))

    # Wings (swept back)
    for wx, name, ry in [(-0.7, 'WingL', 25), (0.7, 'WingR', -25)]:
        add(name, lambda: bpy.ops.mesh.primitive_cone_add(radius1=0.28, depth=0.75),
            accent_mat, loc=(wx, 0.15, -0.3), rot=(10, 0, ry), scale=(1, 0.5, 1))

    # Feathered chest (small overlapping cones)
    for fx, fz in [(-0.12, 0.08), (0, 0.0), (0.12, 0.08), (-0.06, -0.18), (0.06, -0.18)]:
        add(f'Chest_{fx}', lambda: bpy.ops.mesh.primitive_cone_add(radius1=0.09, depth=0.22),
            accent_mat, loc=(fx, -0.38, fz), rot=(80, 0, 0))

    return parts

def apply_traits_to_model(obj, body_color, accent_color):
    """
    If using a real imported model, call this to swap material colors.
    Expects material slots named 'Body', 'Accent'.
    """
    for mat_slot in obj.material_slots:
        if mat_slot.name == 'Body' and mat_slot.material:
            mat_slot.material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = body_color
        elif mat_slot.name == 'Accent' and mat_slot.material:
            mat_slot.material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = accent_color

# ── Lighting ──────────────────────────────────────────────────────────────────

def setup_lighting(real_color, mirror_color):
    def add_light(name, ltype, loc, energy, color=(1,1,1), size=2, angle=40, rot=(45,-20,0)):
        bpy.ops.object.light_add(type=ltype, location=loc)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.color = color
        if ltype == 'AREA':
            light.data.size = size
        if ltype == 'SPOT':
            light.data.spot_size = math.radians(angle)
        light.rotation_euler = Euler((math.radians(rot[0]), math.radians(rot[1]), math.radians(rot[2])))
        return light

    # Key
    add_light('Key', 'AREA', (-2.5, -3.5, 3.5), 600, size=2.5, rot=(48, -22, 0))
    # Fill
    add_light('Fill', 'AREA', (3, -2, 1.5), 120, size=3.5, rot=(35, 28, 0))
    # Top rim
    add_light('Rim_Top', 'AREA', (0, 2.5, 4), 200, size=4, rot=(-40, 0, 0))

    # Coloured rim per side (real phoenix color left, mirror color right)
    add_light('Rim_Real', 'SPOT', (-3, 2, 2),
              energy=900, color=real_color[:3], angle=35, rot=(62, 0, 42))
    add_light('Rim_Mirror', 'SPOT', (3, 2, 2),
              energy=900, color=mirror_color[:3], angle=35, rot=(62, 0, -42))

    # Mirror edge glow (cool white crack of light between the two)
    add_light('Mirror_Edge', 'SPOT', (0, 1, 0.5),
              energy=250, color=(0.88, 0.92, 1.0), angle=15, rot=(80, 0, 0))

# ── Ground ────────────────────────────────────────────────────────────────────

def create_ground(bg_color):
    bpy.ops.mesh.primitive_plane_add(size=24, location=(0, 0, -1.4))
    ground = bpy.context.object
    ground.name = 'Ground'
    g = tuple(min(c * 1.15, 1.0) for c in bg_color[:3]) + (1.0,)
    ground.data.materials.append(new_material('GroundMat', g, roughness=0.98))

# ── Trait Picker ──────────────────────────────────────────────────────────────

def pick_traits(seed=None):
    if seed is not None:
        random.seed(seed)

    body_keys   = list(BODY_COLORS.keys())
    accent_keys = list(ACCENT_COLORS.keys())
    bg_keys     = list(BACKGROUNDS.keys())

    real_body   = random.choice(body_keys)
    # Mirror body is always different
    mirror_body = random.choice([k for k in body_keys if k != real_body])

    real_accent   = random.choice(accent_keys)
    mirror_accent = random.choice([k for k in accent_keys if k != real_accent])

    return {
        'seed':          seed or random.randint(0, 999999),
        'real_body':     real_body,
        'real_accent':   real_accent,
        'mirror_body':   mirror_body,
        'mirror_accent': mirror_accent,
        'background':    random.choice(bg_keys),
        'mirror_aura':   weighted_choice(AURA_WEIGHTS),
    }

# ── Generator ─────────────────────────────────────────────────────────────────

def generate(seed=None, output_path=None, samples=128):
    clear_scene()

    traits = pick_traits(seed)
    print('\n── DONADA NFT Traits ────────────────────────────────────────────')
    print(json.dumps(traits, indent=2))

    real_body     = BODY_COLORS[traits['real_body']]
    real_accent   = ACCENT_COLORS[traits['real_accent']]
    mirror_body   = BODY_COLORS[traits['mirror_body']]
    mirror_accent = ACCENT_COLORS[traits['mirror_accent']]
    bg            = BACKGROUNDS[traits['background']]

    setup_render(samples=samples)
    setup_world(bg)
    setup_camera()
    create_ground(bg)

    create_mirror(real_accent, traits['mirror_aura'])

    create_phoenix('Real',   real_body,   real_accent)
    create_phoenix('Mirror', mirror_body, mirror_accent)

    setup_lighting(real_body, mirror_body)

    if output_path:
        bpy.context.scene.render.filepath = output_path
        bpy.ops.render.render(write_still=True)
        print(f'Rendered → {output_path}')

    return traits

# ── Batch ─────────────────────────────────────────────────────────────────────

def generate_batch(count=1000, output_dir='/tmp/donada/', samples=256):
    os.makedirs(output_dir, exist_ok=True)
    metadata = []

    for i in range(count):
        seed = random.randint(0, 9_999_999)
        out  = os.path.join(output_dir, f'donada_{i:04d}.png')
        traits = generate(seed=seed, output_path=out, samples=samples)
        traits['token_id'] = i
        traits['image']    = os.path.basename(out)
        metadata.append(traits)
        print(f'[{i+1}/{count}] token {i} rendered')

    meta_path = os.path.join(output_dir, 'metadata.json')
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f'\nDone — {count} NFTs written to {output_dir}')
    print(f'Metadata → {meta_path}')

# ── Run ───────────────────────────────────────────────────────────────────────
# Single preview (run this first to check the scene):
generate()

# Full collection (uncomment when ready):
# generate_batch(count=1000, output_dir='/path/to/output/', samples=256)
