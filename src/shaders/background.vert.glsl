#version 300 es

in vec4 vs_Pos;

out vec2 fs_UV;

void main() {
    gl_Position = vec4(vs_Pos.xy, 0.999, 1.0);
	// gl_Position = vs_Pos;

    fs_UV = vs_Pos.xy * 0.5 + 0.5;
}