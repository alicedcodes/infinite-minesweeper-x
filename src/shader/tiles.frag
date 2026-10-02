#version 300 es
precision highp float;

uniform float u_tilePx;
in vec2 v_world;
out vec4 outColor;

const vec3 TILE_COLOUR = vec3(0.0, 1.0, 0.0);

void main() {
  float borderRaw = u_tilePx / 25.0;

  if (borderRaw < 1.0) {
    outColor = vec4(TILE_COLOUR, 1.0);
    return;
  }

  float border = floor(borderRaw + 0.5);
  float radius = floor(u_tilePx / 12.5 + 0.5);

  vec2 p = (fract(v_world) - 0.5) * u_tilePx;

  vec2 q = abs(p) - (u_tilePx * 0.5 - border) + radius;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;

  float alpha = clamp(0.5 - d, 0.0, 1.0);

  outColor = vec4(TILE_COLOUR, alpha);
}
