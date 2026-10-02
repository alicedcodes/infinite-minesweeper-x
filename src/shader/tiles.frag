#version 300 es
precision highp float;

uniform float u_tilePx;
in vec2 v_world;
out vec4 outColor;

const vec3 TILE_COLOUR = vec3(0.0, 1.0, 0.0);

void main() {
  vec2 inTile = fract(v_world) * u_tilePx;

  float border = max(1.0, floor(u_tilePx / 25.0 + 0.5));

  vec2 inner = step(vec2(border), inTile) * step(inTile, vec2(u_tilePx - border));
  float mask = inner.x * inner.y;

  outColor = vec4(TILE_COLOUR, mask);
}
