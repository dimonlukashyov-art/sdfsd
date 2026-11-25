#version 150
// Datamosh: a video stream that lost its key frames. Some 16 px blocks stop decoding the new picture
// and keep pushing the old one around with the camera's motion, so turning smears the world. The output
// is fed back as next frame's PrevSampler, so a smear keeps growing until the camera settles and the
// amount drops to zero: then every block decodes fresh at once, like a key frame arriving.
uniform sampler2D DiffuseSampler;
uniform sampler2D PrevSampler;
uniform vec2 OutSize;
uniform float NeuralTime;
uniform float MoshAmount;
uniform vec2 MoshMotion;
uniform float PrevValid;
in vec2 texCoord;
out vec4 fragColor;

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void main() {
    vec3 current = texture(DiffuseSampler, texCoord).rgb;
    float amount = clamp(MoshAmount, 0.0, 1.0) * PrevValid;
    if (amount <= 0.001) {
        fragColor = vec4(current, 1.0);
        return;
    }
    vec2 pixel = texCoord * OutSize;
    // Mostly 16 px macroblocks, merged into 32 px ones in patches, the way a codec splits a frame.
    vec2 coarse = floor(pixel / 32.0);
    float size = hash(coarse + 3.7) < 0.35 ? 32.0 : 16.0;
    vec2 block = floor(pixel / size);
    float frame = floor(NeuralTime * 5.0);
    if (hash(block * 0.71 + frame * 0.37) >= amount) {
        fragColor = vec4(current, 1.0);
        return;
    }
    // Each block carries its own slightly wrong motion vector.
    vec2 error = (vec2(hash(block + 7.1 + frame), hash(block + 3.3 + frame)) - 0.5) * 0.008 * amount;
    vec3 smeared = texture(PrevSampler, clamp(texCoord + MoshMotion + error, 0.001, 0.999)).rgb;
    // Now and then a block drops its detail and keeps only the color it had.
    if (hash(block + 11.0 + frame) < 0.08 * amount) {
        smeared = texture(PrevSampler, (block + 0.5) * size / OutSize).rgb;
    }
    fragColor = vec4(smeared, 1.0);
}
