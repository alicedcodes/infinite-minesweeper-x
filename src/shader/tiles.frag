#version 300 es
precision highp float;
precision highp int;
precision highp usampler2D;

uniform float u_tilePx;
uniform usampler2D u_tiles;

in vec2 v_world;
out vec4 outColor;

const vec3 HIDDEN_COLOUR = vec3(0.35, 0.38, 0.45);
const vec3 REVEALED_COLOUR = vec3(0.75, 0.78, 0.85);
const vec3 FLAGGED_COLOUR = vec3(0.85, 0.25, 0.25);
const vec3 MINE_COLOUR = vec3(0.95, 0.55, 0.10);

void main() {
  ivec2 t = clamp(ivec2(v_world), ivec2(0), ivec2(63));
  uint state = texelFetch(u_tiles, t, 0).r;

  vec3 colour =
    (state == 1u) ? REVEALED_COLOUR :
    (state == 2u) ? FLAGGED_COLOUR :
    (state == 3u) ? MINE_COLOUR :
    HIDDEN_COLOUR;

  float border = floor(u_tilePx / 20.0);
  if (border < 1.0) {
    outColor = vec4(colour, 1.0);
    return;
  }

  float radius = floor(u_tilePx / 8.0);

  vec2 p = (fract(v_world) - 0.5) * u_tilePx;
  vec2 q = abs(p) - vec2(u_tilePx * 0.5 - border - radius);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;

  outColor = vec4(colour, clamp(0.5 - d, 0.0, 1.0));
}
