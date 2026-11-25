#version 150
// What the sick brain does to the world, under the HUD. Every effect is off at amount 0.
uniform sampler2D DiffuseSampler;
uniform vec2 OutSize;
uniform float NeuralTime;
uniform float Heart;
uniform float FractureAmount;
uniform float FractureSeed;
uniform float DripAmount;
uniform float FocusAmount;
uniform vec2 FocusCenter;
uniform float ThreatAmount;
uniform float TunnelAmount;
in vec2 texCoord;
out vec4 fragColor;

float hash(float n) {
    return fract(sin(n * 12.9898) * 43758.5453);
}

vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

float luma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 tex(vec2 uv) {
    return texture(DiffuseSampler, clamp(uv, 0.001, 0.999)).rgb;
}

/** 0 at the center of the screen, 1 in the corners, round whatever the aspect. */
float radius(vec2 uv, float aspect) {
    vec2 c = uv - 0.5;
    return length(vec2(c.x * aspect, c.y)) / length(vec2(0.5 * aspect, 0.5));
}

void main() {
    float aspect = OutSize.x / max(OutSize.y, 1.0);
    vec2 uv = texCoord;

    // Heartbeat: no pull on the view itself (at phase V it beat so often it read as the FOV pumping); the rim below.

    // Fractured vision: the view splits into glass shards, each knocked a little out of place.
    float crack = 0.0;
    if (FractureAmount > 0.001) {
        vec2 p = vec2(uv.x * aspect, uv.y) * 3.2;
        vec2 cell = floor(p);
        vec2 f = fract(p);
        float d1 = 8.0;
        float d2 = 8.0;
        vec2 nearest = cell;
        for (int j = -1; j <= 1; j++) {
            for (int i = -1; i <= 1; i++) {
                vec2 g = vec2(float(i), float(j));
                vec2 r = g + hash2(cell + g + FractureSeed) - f;
                float d = dot(r, r);
                if (d < d1) {
                    d2 = d1;
                    d1 = d;
                    nearest = cell + g;
                } else if (d < d2) {
                    d2 = d;
                }
            }
        }
        vec2 shard = hash2(nearest + FractureSeed * 1.7) - 0.5;
        uv += shard * 0.07 * FractureAmount;
        uv = 0.5 + (uv - 0.5) * (1.0 - (hash2(nearest).x - 0.5) * 0.05 * FractureAmount);
        crack = (1.0 - smoothstep(0.0, 0.04, sqrt(d2) - sqrt(d1))) * FractureAmount;
    }

    vec3 color = tex(uv);

    // Pixel drip: in some columns the bright pixels run down the screen like melting paint.
    if (DripAmount > 0.001) {
        float column = floor(uv.x * OutSize.x / 3.0);
        float pick = hash(column * 1.37 + 0.5);
        if (pick < 0.2 + DripAmount * 0.45) {
            float flow = 0.75 + 0.25 * sin(NeuralTime * 1.7 + pick * 40.0);
            float len = (0.04 + hash(column * 2.71) * 0.32) * DripAmount * flow;
            float threshold = 0.62 - DripAmount * 0.18;
            vec3 best = color;
            float bestWeight = 0.0;
            for (int k = 1; k <= 14; k++) {
                float s = float(k) / 14.0;
                vec3 above = tex(vec2(uv.x, uv.y + s * len));
                float weight = smoothstep(threshold, threshold + 0.12, luma(above)) * (1.0 - s * 0.7);
                if (weight > bestWeight) {
                    bestWeight = weight;
                    best = above;
                }
            }
            color = mix(color, best, bestWeight * 0.9);
        }
    }

    // Motor lock: the target stays sharp, everything else is dragged toward it and drained.
    if (FocusAmount > 0.001) {
        vec2 d = uv - FocusCenter;
        float blur = smoothstep(0.06, 0.42, length(vec2(d.x * aspect, d.y))) * FocusAmount;
        if (blur > 0.001) {
            vec3 sum = vec3(0.0);
            for (int k = 0; k < 10; k++) {
                sum += tex(uv - d * (float(k) / 10.0) * 0.09 * blur);
            }
            vec3 blurred = sum / 10.0;
            vec3 drained = mix(blurred, vec3(luma(blurred)) * vec3(1.06, 0.9, 0.9), 0.75);
            color = mix(color, drained * (1.0 - 0.35 * blur), blur);
        }
    }

    // Threat vision: the broken IFF strips the world to red outlines, everyone a target.
    if (ThreatAmount > 0.001) {
        vec2 px = 1.0 / OutSize;
        float tl = luma(tex(uv + px * vec2(-1.0, 1.0)));
        float tc = luma(tex(uv + px * vec2(0.0, 1.0)));
        float tr = luma(tex(uv + px * vec2(1.0, 1.0)));
        float ml = luma(tex(uv + px * vec2(-1.0, 0.0)));
        float mr = luma(tex(uv + px * vec2(1.0, 0.0)));
        float bl = luma(tex(uv + px * vec2(-1.0, -1.0)));
        float bc = luma(tex(uv + px * vec2(0.0, -1.0)));
        float br = luma(tex(uv + px * vec2(1.0, -1.0)));
        float gx = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl);
        float gy = (tl + 2.0 * tc + tr) - (bl + 2.0 * bc + br);
        float edge = clamp(length(vec2(gx, gy)) * 2.6, 0.0, 1.0);
        vec3 threat = vec3(0.025, 0.0, 0.004) + vec3(1.0, 0.1, 0.08) * edge;
        float sweep = smoothstep(0.015, 0.0, abs(fract(NeuralTime * 0.8) - texCoord.y));
        threat += vec3(0.3, 0.02, 0.02) * sweep;
        color = mix(color, threat, ThreatAmount);
    }

    // Tunnel vision: the edges of sight blur, drain and sink into the dark.
    if (TunnelAmount > 0.001) {
        float t = smoothstep(0.42 - TunnelAmount * 0.22, 1.0, radius(texCoord, aspect)) * TunnelAmount;
        if (t > 0.001) {
            vec2 pull = (texCoord - 0.5) * t;
            vec3 soft = (tex(uv - pull * 0.02) + tex(uv - pull * 0.045) + tex(uv - pull * 0.07)) / 3.0;
            vec3 drained = mix(soft, vec3(luma(soft)), 0.7);
            color = mix(color, drained * (1.0 - 0.8 * t), min(1.0, t * 1.3));
        }
    }

    // The beat also flushes the rim of the view red and draws it in.
    if (Heart > 0.001) {
        float v = smoothstep(0.62 - Heart * 0.16, 1.05, radius(texCoord, aspect)) * Heart;
        color = mix(color, color * vec3(1.0, 0.32, 0.32) + vec3(0.16, 0.0, 0.0), v);
    }

    color += vec3(1.0, 0.86, 0.86) * crack * 0.85;
    fragColor = vec4(color, 1.0);
}
