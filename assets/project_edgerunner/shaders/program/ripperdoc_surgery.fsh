#version 150
// Induction -> drifting phosphenes -> cortical tunnel -> rosette -> recovery.
// A separate history target adds retinal persistence; no world-depth or camera dependency.
uniform sampler2D PrevSampler;
uniform vec2 OutSize;
uniform float SurgeryTime;
uniform float Dream;
uniform float Geometry;
uniform vec4 Audio;
uniform float PrevValid;
uniform float FrameDelta;
uniform float ReducedMotion;
in vec2 texCoord;
out vec4 fragColor;

mat2 rotate(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

float hash(vec2 p) {
    vec3 v = fract(vec3(p.xyx) * 0.1031);
    v += dot(v, v.yzx + 33.33);
    return fract((v.x + v.y) * v.z);
}

float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}

float field(vec2 p) {
    float v = 0.0, a = 0.55;
    // Three octaves, with a constant rotation: most of the visual depth is analytic.
    mat2 octave = mat2(0.863, -0.505, 0.505, 0.863);
    for (int i = 0; i < 3; i++) {
        v += a * noise(p);
        p = octave * p * 2.03 + vec2(2.3, 5.1);
        a *= 0.5;
    }
    return v;
}

float glow(float d, float width) {
    return exp(-d * d / max(width * width, 0.000001));
}

float cue(float time, float center, float width) {
    return glow(time - center, width);
}

void main() {
    vec2 uv = texCoord;
    float aspect = OutSize.x / max(OutSize.y, 1.0);
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
    float seconds = max(0.0, SurgeryTime);
    float motion = mix(1.0, 0.20, ReducedMotion);
    float t = seconds * motion;
    float hit = Audio.w * mix(1.0, 0.22, ReducedMotion);
    float low = Audio.y * mix(1.0, 0.45, ReducedMotion);
    float high = Audio.z;
    float descent = smoothstep(3.8, 8.2, seconds) * (1.0 - smoothstep(12.0, 15.4, seconds));
    float mandala = smoothstep(10.8, 14.2, seconds) * (1.0 - smoothstep(17.2, 19.6, seconds));
    float wake = smoothstep(16.8, 20.1, seconds);
    float stress = (cue(seconds, 9.3, 0.6) + cue(seconds, 10.9, 0.55)
                  + cue(seconds, 12.2, 0.7) + cue(seconds, 16.4, 0.55)) * motion;

    // Different speeds at different depths make the field breathe and descend.
    vec2 drift = vec2(sin(t * 0.25), cos(t * 0.19)) * (0.045 + descent * 0.025);
    vec2 q = rotate(0.12 * sin(t * 0.23)) * (p - drift);
    q *= 1.0 + 0.035 * sin(t * 1.12) * Dream * motion;
    vec2 warp = vec2(field(q * 3.1 + vec2(t * 0.09, 2.4)),
                     field(q * 3.1 + vec2(6.7, -t * 0.075))) - 0.5;
    vec2 fluid = q + warp * (0.23 + low * 0.04 + stress * 0.06);
    float radius = length(fluid);
    float angle = atan(fluid.y, fluid.x);
    float logRadius = log(max(radius, 0.035));
    float cloud = field(fluid * 3.8 + vec2(t * 0.10, -t * 0.13));
    float veil = smoothstep(0.15, 0.78, cloud);

    vec3 cyan = vec3(0.04, 0.79, 0.78);
    vec3 blue = vec3(0.09, 0.28, 0.83);
    vec3 violet = vec3(0.56, 0.10, 0.82);
    vec3 rose = vec3(0.96, 0.19, 0.42);
    vec3 gold = vec3(0.94, 0.53, 0.13);
    float tint = 0.5 + 0.5 * sin(cloud * 7.0 + fluid.x * 1.7 - t * 0.11);
    vec3 pigment = mix(violet, cyan, tint);
    pigment = mix(pigment, blue, descent * (0.2 + 0.25 * veil));
    pigment = mix(pigment, rose, mandala * (1.0 - tint) * 0.48);
    vec3 color = vec3(0.009, 0.009, 0.023);
    color += pigment * veil * (0.17 + Dream * (0.37 + Audio.x * 0.14));

    // Liquid contours have a wide glow and a narrow core, with colored fringes.
    float contour = cloud * 25.0 + radius * 5.0 - t * 0.63;
    float bands = glow(sin(contour), 0.15 + low * 0.04);
    float fringe = glow(sin(contour + 0.17), 0.16);
    color += pigment * bands * veil * Dream * (0.09 + high * 0.17);
    color += mix(blue, rose, mandala) * fringe * veil * Dream * 0.065;

    // Broad out-of-focus retinal impressions pass in front of the finer geometry.
    for (int i = 0; i < 5; i++) {
        float f = float(i);
        vec2 center = vec2(sin(t * 0.22 + f * 2.4) * 0.49,
                           cos(t * 0.17 + f * 1.9) * 0.29);
        vec2 d = (q - center) * vec2(1.0, 1.30);
        float dist = length(d);
        float ring = glow(dist - (0.105 + low * 0.025), 0.05);
        vec3 c = mix(cyan, rose, f / 4.0);
        c = mix(c, gold, (1.0 - descent) * (0.16 + hit * 0.40));
        color += c * (glow(dist, 0.23) * 0.12 + ring * 0.075) * Dream;
    }

    // Irregular perspective funnel, with separate distance layers rather than a flat grid.
    if (descent > 0.001) {
        float tunnelPhase = logRadius * 16.0 - t * 1.40 + sin(angle * 5.0 + t * 0.21) * 1.05;
        float tunnel = glow(sin(tunnelPhase), 0.12);
        float tunnelHalo = glow(sin(tunnelPhase + 0.08), 0.36);
        float spoke = glow(sin(angle * 7.0 + logRadius * 1.6 + t * 0.13), 0.075);
        float funnelMask = smoothstep(0.04, 0.13, radius) * (1.0 - smoothstep(0.55, 1.2, radius));
        vec3 tunnelColor = mix(cyan, violet, 0.5 + 0.35 * sin(logRadius * 2.3 - t * 0.12));
        color += tunnelColor * descent * funnelMask * (tunnel * 0.22 + tunnelHalo * 0.05 + spoke * 0.085)
               * (0.75 + high * 0.45) * (0.4 + Geometry * 0.6);
        color += blue * glow(radius, 0.13) * descent * 0.08;
    }

    // The tunnel opens into a slowly unfolding six-fold cortical rosette.
    if (mandala > 0.001) {
        float petal = cos(angle * 6.0 + t * 0.17);
        float rosettePhase = radius * 25.0 + petal * (1.1 + 0.3 * sin(t * 0.24)) - t * 0.55;
        float rosette = glow(sin(rosettePhase), 0.13);
        float lace = glow(sin(angle * 12.0 - logRadius * 4.0 + t * 0.11), 0.10);
        float rosetteMask = smoothstep(0.045, 0.15, radius) * (1.0 - smoothstep(0.38, 0.82, radius));
        color += mix(rose, cyan, 0.5 + 0.4 * petal) * mandala * rosetteMask
               * (rosette * 0.21 + lace * 0.07) * (0.75 + high * 0.35);
    }

    // Neural strands branch through the field during the sound's strongest passages.
    vec2 nerve = rotate(-0.35 + 0.04 * t) * fluid;
    float strand = glow(nerve.y + sin(nerve.x * 6.2 + t * 0.44) * 0.13, 0.007);
    float branch = glow(nerve.y - 0.08 + sin(nerve.x * 10.0 - t * 0.25) * 0.055, 0.004);
    float discharge = (hit * 0.7 + stress * 0.16) * Dream;
    color += mix(gold, rose, mandala) * (strand + branch * 0.6) * discharge * glow(nerve.x, 0.72) * 0.55;

    // Sparse fixed-position phosphenes brighten smoothly, without per-frame random flashing.
    vec2 grid = fluid * 24.0;
    vec2 cell = floor(grid);
    vec2 jitter = vec2(hash(cell), hash(cell + 13.7));
    float point = glow(length(fract(grid) - jitter), 0.09);
    float speck = step(0.935, hash(cell + 3.1)) * point;
    color += mix(cyan, gold, hash(cell + 7.3)) * speck * Dream * (0.12 + hit * 0.28);

    // Soft lid shadows and edge falloff keep the image internal and unfocused.
    float lid = 0.34 + sin(q.x * 3.0 + t * 0.19) * 0.025;
    float aperture = 1.0 - smoothstep(lid, lid + 0.18, abs(q.y));
    float vignette = 1.0 - smoothstep(0.32, 1.08, length(p));
    color *= (0.34 + 0.66 * aperture) * (0.30 + 0.70 * vignette);
    color *= 1.0 - wake * 0.12;

    // Genuine frame history, with a small outward drift and chromatic persistence.
    // History is invalid after resize, restart or a gap while menus were open.
    if (PrevValid > 0.5 && Dream > 0.001) {
        float echoMotion = motion * (0.7 + hit * 0.3);
        vec2 oldUV = 0.5 + (uv - 0.5) * (1.0 - 0.004 * echoMotion);
        oldUV += vec2(sin(t * 0.27), cos(t * 0.31)) * 0.0009 * echoMotion;
        vec2 split = vec2(0.0011 * echoMotion, 0.00025 * echoMotion);
        vec3 echo = vec3(texture(PrevSampler, clamp(oldUV + split, 0.001, 0.999)).r,
                         texture(PrevSampler, clamp(oldUV, 0.001, 0.999)).g,
                         texture(PrevSampler, clamp(oldUV - split, 0.001, 0.999)).b);
        float retention = exp(-max(FrameDelta, 0.001) / 0.085) * Dream * mix(0.42, 0.10, ReducedMotion);
        color = mix(color, max(color * 0.72, echo * 0.97), retention);
    }
    color += (hash(floor(uv * OutSize / 1.5)) - 0.5) * 0.007 * Dream;
    color = clamp(color, 0.0, 0.85);
    fragColor = vec4(color, 1.0);
}
