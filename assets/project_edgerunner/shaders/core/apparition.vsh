#version 150
// A rectangle of the screen, given straight in clip space: the apparition's box and the reach of its streaks.
in vec3 Position;

void main() {
    gl_Position = vec4(Position.xy, 0.0, 1.0);
}
