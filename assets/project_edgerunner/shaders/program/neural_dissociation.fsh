#version 150
uniform sampler2D DiffuseSampler;
uniform float Severity;
uniform float DesaturationStrength;
uniform float DoubleStrength;
uniform float DistortionStrength;
uniform float DimmingStrength;
uniform float NeuralTime;
uniform float ReducedMotion;
uniform float ChromaticStrength;
uniform float TearStrength;
uniform float Collapse;
uniform float Blackout;
in vec2 texCoord;
out vec4 fragColor;

float hash(float n) {
    return fract(sin(n * 12.9898) * 43758.5453);
}

void main() {
    float severity = clamp(Severity, 0.0, 1.0);
    float chroma = clamp(ChromaticStrength, 0.0, 1.0);
    float neuralMix = 1.0;
    float desaturation = max(severity, DesaturationStrength);
    float doubleVision = max(severity, DoubleStrength);
    float distortion = max(severity, DistortionStrength);
    float dimming = max(severity, DimmingStrength);

    // Signal tear: horizontal slices of the real picture jump sideways, each with its channels pulled
    // apart, and a tracking band rolls down the screen.
    float tear = clamp(TearStrength, 0.0, 1.0);
    vec2 tearShift = vec2(0.0);
    float tearSplit = 0.0;
    if (tear > 0.001) {
        float slot = floor(NeuralTime * 9.0);
        float bands = 18.0 + hash(slot) * 30.0;
        float band = floor(texCoord.y * bands);
        float torn = step(hash(band * 1.9 + slot * 7.3), tear * 0.32);
        float shift = (hash(band * 3.1 + slot) - 0.5) * 0.12 * tear;
        float roll = smoothstep(0.05, 0.0, abs(texCoord.y - fract(NeuralTime * 0.35))) * tear;
        tearShift = vec2(shift * torn + roll * 0.025 * sin(texCoord.y * 300.0 + NeuralTime * 20.0), 0.0);
        tearSplit = (torn * 0.006 + roll * 0.004) * (0.5 + tear);
    }
    vec2 base = texCoord + tearShift;

    vec2 uv = base;
    vec2 center = uv - 0.5;
    float edge = smoothstep(0.12, 0.60, length(center));
    float breath = 0.5 + 0.5 * sin(NeuralTime * 0.9);
    float motion = 1.0 - ReducedMotion;
    uv += center * dot(center, center) * distortion * 0.038 * sin(NeuralTime * 0.7) * motion * neuralMix;
    vec2 echo = vec2(sin(NeuralTime * 0.43), cos(NeuralTime * 0.37)) * 0.004 * doubleVision * motion * neuralMix;
    vec3 sharp = texture(DiffuseSampler, clamp(uv, 0.002, 0.998)).rgb;
    vec3 doubled = texture(DiffuseSampler, clamp(uv + echo, 0.002, 0.998)).rgb;
    vec3 soft = texture(DiffuseSampler, clamp(uv - echo, 0.002, 0.998)).rgb;
    vec3 colorful = mix(sharp, (sharp + doubled + soft) / 3.0, edge * doubleVision * (0.5 + breath * 0.4) * neuralMix);
    vec3 chromaColor = colorful;
    if (chroma > 0.001) {
        float splitAngle = 1.4 * sin(NeuralTime * 0.7) + 0.25 * sin(NeuralTime * 1.3);
        float splitDistance = (0.046 + 0.006 * sin(NeuralTime * 1.7)) * chroma;
        vec2 split = vec2(cos(splitAngle), sin(splitAngle)) * splitDistance;
        float red = texture(DiffuseSampler, clamp(uv + split, 0.001, 0.999)).r;
        float green = texture(DiffuseSampler, clamp(uv, 0.001, 0.999)).g;
        float blue = texture(DiffuseSampler, clamp(uv - split, 0.001, 0.999)).b;
        chromaColor = vec3(red, green, blue);
    }
    vec3 color = mix(colorful, chromaColor, chroma);
    color = mix(color, vec3(dot(color, vec3(0.2126, 0.7152, 0.0722))), desaturation * (0.18 + 0.34 * breath));
    color *= 1.0 - edge * dimming * 0.20;

    if (tearSplit > 0.0) {
        color.r = texture(DiffuseSampler, clamp(uv + vec2(tearSplit, 0.0), 0.001, 0.999)).r;
        color.b = texture(DiffuseSampler, clamp(uv - vec2(tearSplit, 0.0), 0.001, 0.999)).b;
    }

    // Flatline: an old CRT switching off. The picture folds into a glowing line, the line into a dot,
    // the dot goes out.
    if (Collapse > 0.001) {
        float squashY = mix(1.0, 0.004, smoothstep(0.0, 0.6, Collapse));
        float squashX = mix(1.0, 0.003, smoothstep(0.6, 0.88, Collapse));
        vec2 c = texCoord - 0.5;
        vec2 source = 0.5 + vec2(c.x / squashX, c.y / squashY);
        float inside = step(abs(c.y), squashY * 0.5) * step(abs(c.x), squashX * 0.5);
        vec3 picture = texture(DiffuseSampler, clamp(source, 0.001, 0.999)).rgb;
        vec3 line = mix(picture * (1.0 + 3.0 * smoothstep(0.25, 0.7, Collapse)), vec3(0.88, 1.0, 1.0),
                smoothstep(0.4, 0.75, Collapse));
        float halo = exp(-abs(c.y) / max(squashY, 0.002) * 0.9) * exp(-abs(c.x) / max(squashX, 0.002) * 0.9);
        float alive = 1.0 - smoothstep(0.88, 1.0, Collapse);
        color = (line * inside + vec3(0.55, 0.75, 0.8) * halo * 0.35 * smoothstep(0.3, 0.7, Collapse)) * alive;
    }
    color *= 1.0 - clamp(Blackout, 0.0, 1.0);

    fragColor = vec4(color, 1.0);
}
