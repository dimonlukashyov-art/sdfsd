#version 150

#moj_import <fog.glsl>

uniform sampler2D Sampler0;
uniform sampler2D WorldDepth;
uniform sampler2D CompleteDepth;
uniform sampler2D BeforeHandsDepth;
uniform mat4 SceneProjection;
uniform vec2 FrameSize;
uniform float HandPass;
uniform vec4 ColorModulator;
uniform float FogStart;
uniform float FogEnd;
uniform vec4 FogColor;

in float vertexDistance;
in float viewDepth;
in vec4 vertexColor;
in vec2 texCoord0;

out vec4 fragColor;

// Distance along the view axis for a depth-buffer value written with SceneProjection.
float viewDistance(float depth) {
    if (depth >= 1.0) return 1.0e9;
    float ndc = depth * 2.0 - 1.0;
    return SceneProjection[3][2] / (ndc + SceneProjection[2][2]);
}

void main() {
    // Drawn after a shader pack has resolved its image: occlusion comes from the pack's own depth buffers,
    // with a little slack in place of the polygon offset that keeps stains on their surface.
    vec2 screen = gl_FragCoord.xy / FrameSize;
    float complete = texture(CompleteDepth, screen).r;
    bool handPixel = complete + 0.000001 < texture(BeforeHandsDepth, screen).r;
    if (HandPass < 0.5) {
        if (handPixel) discard;
        float scene = viewDistance(texture(WorldDepth, screen).r);
        if (viewDepth > scene * 1.004 + 0.03) discard;
    } else if (handPixel) {
        float hand = viewDistance(complete);
        if (viewDepth > hand * 1.004 + 0.01) discard;
    }
    vec4 color = texture(Sampler0, texCoord0) * vertexColor * ColorModulator;
    if (color.a < 0.1) discard;
    fragColor = linear_fog(color, vertexDistance, FogStart, FogEnd, FogColor);
}
