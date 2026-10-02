#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp usampler2D;

uniform vec2 u_res;
uniform float u_tilePx;
uniform usampler2D u_tiles;
uniform sampler2D u_atlas;

in vec2 v_world;
out vec4 outColor;

const vec3 HIDDEN_COLOUR = vec3(0.35, 0.38, 0.45);
const vec3 REVEALED_COLOUR = vec3(0.75, 0.78, 0.85);
const vec3 FLAGGED_COLOUR = vec3(0.95, 0.85, 0.45);
const vec3 MINE_COLOUR = vec3(0.95, 0.55, 0.10);

const vec3 NUMBER_COLOUR[9] = vec3[9](
    vec3(0.0),
    vec3(0.10, 0.25, 0.85),
    vec3(0.10, 0.55, 0.15),
    vec3(0.85, 0.15, 0.15),
    vec3(0.10, 0.10, 0.55),
    vec3(0.55, 0.10, 0.10),
    vec3(0.10, 0.50, 0.50),
    vec3(0.05, 0.05, 0.05),
    vec3(0.40, 0.40, 0.40)
  );

const float BORDER_FRACTION = 25.0;
const float RADIUS_FRACTION = 12.5;
const float CELLS = 11.0;

void main() {
  ivec2 t = clamp(ivec2(v_world), ivec2(0), ivec2(63));

  uint b = texelFetch(u_tiles, t, 0).r;
  uint state = b & 3u;
  bool mine = (b & 4u) != 0u;
  uint nearby = (b >> 3u) & 15u;

  vec3 colour = HIDDEN_COLOUR;
  vec3 ink = vec3(1.0);
  uint glyph = 0u;

  if (state == 1u) {
    if (mine) {
      colour = MINE_COLOUR;
      glyph = 9u;
    } else {
      colour = REVEALED_COLOUR;
      ink = NUMBER_COLOUR[min(nearby, 8u)];
      glyph = nearby;
    }
  } else if (state == 2u) {
    colour = FLAGGED_COLOUR;
    glyph = 10u;
  }

  vec2 p = (fract(v_world) - 0.5) * u_tilePx;

  if (glyph > 0u) {
    vec2 uvc = clamp(p / u_tilePx + 0.5, 0.001, 0.999);
    vec2 uv = vec2((float(glyph) + uvc.x) / CELLS, uvc.y);

    vec4 g = textureGrad(
        u_atlas,
        uv,
        vec2(1.0 / (u_tilePx * CELLS), 0.0),
        vec2(0.0, 1.0 / u_tilePx)
      );

    if (glyph >= 9u) {
      colour = g.rgb + colour * (1.0 - g.a);
    } else {
      colour = mix(colour, ink, g.a);
    }
  }

  float border = floor(u_tilePx / BORDER_FRACTION);
  if (border < 1.0) {
    outColor = vec4(colour, 1.0);
    return;
  }

  float radius = floor(u_tilePx / RADIUS_FRACTION);
  vec2 q = abs(p) - (vec2(u_tilePx * 0.5) - vec2(border)) + vec2(radius);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;

  outColor = vec4(colour, clamp(0.5 - d, 0.0, 1.0));
}
