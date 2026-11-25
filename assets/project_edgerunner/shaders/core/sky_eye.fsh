#version 150
uniform sampler2D Sampler0;
uniform vec4 ColorModulator;
uniform sampler2D WorldDepth;
uniform sampler2D CompleteDepth;
uniform sampler2D BeforeHandsDepth;
uniform vec2 FrameSize;
in vec2 texCoord;
in vec4 vertexColor;
out vec4 fragColor;
void main() {
    vec2 screen = gl_FragCoord.xy / FrameSize;
    // Solid world geometry always occludes the sky; hand projection uses a separate depth range.
    if (texture(WorldDepth, screen).r < 0.999999) discard;
    if (texture(CompleteDepth, screen).r + 0.000001 < texture(BeforeHandsDepth, screen).r) discard;
    vec4 color = texture(Sampler0, texCoord) * vertexColor * ColorModulator;
    if (color.a < 0.001) discard;
    fragColor = color;
}
