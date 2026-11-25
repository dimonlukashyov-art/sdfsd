#version 150

#moj_import <light.glsl>

in vec3 Position;
in vec4 Color;
in vec2 UV0;
in ivec2 UV2;
in vec3 Normal;

uniform sampler2D Sampler2;
uniform mat4 SceneProjection;

out float vertexDistance;
out float viewDepth;
out vec4 vertexColor;
out vec2 texCoord0;

void main() {
    // Position is already in view space (the pose captured during the world pass); a pack's global matrices may differ.
    gl_Position = SceneProjection * vec4(Position, 1.0);
    vertexDistance = length(Position);
    viewDepth = -Position.z;
    vertexColor = Color * minecraft_sample_lightmap(Sampler2, UV2);
    texCoord0 = UV0;
}
