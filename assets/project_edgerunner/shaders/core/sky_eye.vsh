#version 150
in vec3 Position;
in vec2 UV0;
in vec4 Color;
uniform mat4 SkyProjection;
out vec2 texCoord;
out vec4 vertexColor;
void main() {
    // Position is already in the event's view space; Iris's global matrix may differ.
    gl_Position = SkyProjection * vec4(Position, 1.0);
    // The surface belongs to the sky; all world geometry must occlude it.
    gl_Position.z = gl_Position.w * 0.999999;
    texCoord = UV0;
    vertexColor = Color;
}
