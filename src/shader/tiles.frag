#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp usampler2D;

uniform vec2 u_res;
uniform float u_tilePx;
uniform float u_time;
uniform float u_animMs;
uniform usampler2D u_tiles;
uniform sampler2D u_reveal;
uniform sampler2D u_atlas;

in vec2 v_world;
out vec4 outColor;

const vec3 CANT_COLOUR = vec3(0.08627);
const vec3 CAN_COLOUR = vec3(0.18039);
const vec3 REVEALED_COLOUR = vec3(0.75, 0.78, 0.85);
const vec3 MINE_INK = vec3(1.0, 0.38039, 0.30196);

const vec3 TILE_COLOUR[9] = vec3[9](
    vec3(1.00000, 0.10980, 0.00000),
    vec3(1.00000, 0.10980, 0.00000),
    vec3(1.00000, 0.63529, 0.00000),
    vec3(0.17647, 0.90588, 0.00000),
    vec3(0.00000, 0.98431, 0.77647),
    vec3(0.00000, 0.85490, 1.00000),
    vec3(0.44314, 0.58431, 1.00000),
    vec3(1.00000, 0.29412, 1.00000),
    vec3(1.00000, 0.00000, 0.70980)
  );

const float BORDER_FRACTION = 24.0;
const float RADIUS_FRACTION = 12.0;
const float CELLS = 11.0;

float rr(vec2 p, vec2 hs, float r) {
  vec2 q = abs(p) - hs + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  ivec2 t = clamp(ivec2(v_world), ivec2(0), ivec2(63));

  uint b = texelFetch(u_tiles, t, 0).r;
  uint state = b & 3u;
  bool mine = (b & 4u) != 0u;
  uint nearby = (b >> 3u) & 15u;
  bool can = (b & 128u) != 0u;

  vec3 colour = can ? CAN_COLOUR : CANT_COLOUR;
  vec3 ink = vec3(1.0);
  uint glyph = 0u;

  if (state == 1u) {
    if (mine) {
      colour = CAN_COLOUR;
      ink = MINE_INK;
      glyph = 9u;
    } else {
      colour = TILE_COLOUR[min(nearby, 8u)];
      ink = vec3(0.0);
      glyph = nearby;
    }
  } else if (state == 2u) {
    colour = CAN_COLOUR;
    ink = vec3(1.0);
    glyph = 10u;
  }

  float start = texelFetch(u_reveal, t, 0).r;
  float k = start > 0.0 ? clamp((u_time - start) / u_animMs, 0.0, 1.0) : 1.0;
  float sc = 1.0 - (1.0 - k) * (1.0 - k);
  float s = max(sc, 0.001);

  vec2 p = (fract(v_world) - 0.5) * u_tilePx;

  float border = floor(u_tilePx / BORDER_FRACTION);
  bool detail = border >= 1.0;

  if (detail && glyph > 0u && sc > 0.02) {
    vec2 uvc = clamp(p / (u_tilePx * s) + 0.5, 0.001, 0.999);
    vec2 uv = vec2((float(glyph) + uvc.x) / CELLS, uvc.y);

    vec4 g = textureGrad(
        u_atlas,
        uv,
        vec2(1.0 / (u_tilePx * s * CELLS), 0.0),
        vec2(0.0, 1.0 / (u_tilePx * s))
      );

    colour = mix(colour, ink, g.a);
  }

  if (!detail) {
    bool inside = all(lessThanEqual(abs(p), vec2(u_tilePx * 0.5 * sc)));
    outColor = vec4(inside ? colour : CAN_COLOUR, 1.0);
    return;
  }

  float radius = floor(u_tilePx / RADIUS_FRACTION);
  vec2 hs = vec2(u_tilePx * 0.5) - vec2(border);

  float cov = sc > 0.0 ? clamp(0.5 - rr(p / s, hs, radius) * s, 0.0, 1.0) : 0.0;
  float under = sc < 1.0 ? clamp(0.5 - rr(p, hs, radius), 0.0, 1.0) : 0.0;

  float a = cov + under * (1.0 - cov);
  vec3 c = a > 0.0 ? (colour * cov + CAN_COLOUR * under * (1.0 - cov)) / a : colour;

  outColor = vec4(c, a);
}
