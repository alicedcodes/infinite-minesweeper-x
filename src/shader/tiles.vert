#version 300 es
precision highp float;

uniform vec2 u_res;
uniform vec2 u_cam;
uniform float u_tilePx;

out vec2 v_world;

void main() {
  float x = float((gl_VertexID & 1) << 2);
  float y = float((gl_VertexID & 2) << 1);
  vec2 clipPos = vec2(x - 1.0, y - 1.0);

  v_world = u_cam + (vec2(clipPos.x, -clipPos.y) * u_res * 0.5) / u_tilePx;

  gl_Position = vec4(clipPos, 0.0, 1.0);
}
