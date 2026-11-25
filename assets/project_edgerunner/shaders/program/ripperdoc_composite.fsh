#version 150
// Only the internal hallucination is downsampled; the real world retains native resolution.
uniform sampler2D DiffuseSampler;
uniform sampler2D SurgerySampler;
uniform float Opacity;
in vec2 texCoord;
out vec4 fragColor;

void main() {
    vec3 scene = texture(DiffuseSampler, texCoord).rgb;
    vec3 surgery = texture(SurgerySampler, texCoord).rgb;
    fragColor = vec4(mix(scene, surgery, Opacity), 1.0);
}
