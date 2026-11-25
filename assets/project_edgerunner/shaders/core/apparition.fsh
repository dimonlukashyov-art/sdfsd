#version 150
// One you lost, laid over the world as a broken signal. Thin lines tear across it, a screen pixel or two high (not
// its skin's pixels: a torn picture breaks finer than what it shows), stacked in little runs of three to six, each
// broken into dashes of no fixed length, its colour turning along it (magenta into violet into blue), some dark, now
// and then a thin pale glint; a few drag far out to one side and fade there. Pieces of the body slip sideways, cut
// clean. The band across the eyes is always broken, the hardest of all; the rest come and go, so it can still be told
// who it is. Leaving, every piece tears away at once. The world as it is now hides it where it is in front, lines too.

uniform sampler2D Body;        // the body alone, drawn as it is (clear where it is not)
uniform sampler2D BodyDepth;   // its depth
uniform sampler2D SceneDepth;  // the world's depth, as it is now

uniform vec2 ScreenSize;
uniform vec4 Box;    // the body on screen: x0, y0, x1, y1 (pixels, from the bottom left)
uniform vec4 Face;   // the band across its eyes, the same way
uniform float Texel; // one pixel of its skin, in screen pixels
uniform float Line;  // the thinnest line, in screen pixels (one at 1080 lines high, more on bigger screens)
uniform float Time;  // ticks
uniform float Seed;
uniform float Tear;  // 0 while it is there; to 1 as it tears away
uniform float Calm;  // 1: less movement (the soft setting)
uniform float Muted; // 1: fewer flashes (slow and fixed, colour held back, lines fade instead of popping)
uniform float Alpha;
uniform float Dir;   // the side it drags to: 1 or -1

out vec4 fragColor;

const vec3 MAGENTA = vec3(1.00, 0.24, 0.86);
const vec3 PINK = vec3(1.00, 0.42, 0.72);
const vec3 VIOLET = vec3(0.58, 0.34, 1.00);
const vec3 BLUE = vec3(0.16, 0.30, 1.00);
const vec3 CYAN = vec3(0.30, 0.90, 1.00);
const vec3 LIME = vec3(0.45, 1.00, 0.35);
const vec3 ORANGE = vec3(1.00, 0.55, 0.20);
const vec3 DARK = vec3(0.03, 0.03, 0.07);
const vec3 NAVY = vec3(0.07, 0.08, 0.22);
const vec3 CREAM = vec3(1.00, 0.95, 0.84);
const vec3 GREY = vec3(0.45, 0.42, 0.55);

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21) + Seed * 0.0137);
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// A colour that turns along a line (k 0..1 from where it starts): mostly magenta, violet and blue, as in the picture.
vec3 run(float h, float k) {
    if (h < 0.36) return k < 0.5 ? mix(MAGENTA, VIOLET, k * 2.0) : mix(VIOLET, BLUE, k * 2.0 - 1.0);
    if (h < 0.56) return mix(PINK, MAGENTA, k);
    if (h < 0.70) return mix(VIOLET, BLUE, k);
    if (h < 0.80) return mix(BLUE, VIOLET, k);
    if (h < 0.88) return mix(CYAN, BLUE, k);
    if (h < 0.96) return mix(ORANGE, PINK, k);
    return mix(LIME, CYAN, k);
}

// The body at q, as seen at dest: nothing where it is not, or where the world now is in front of where it lands.
vec4 bodyAt(vec2 q, vec2 dest) {
    if (q.x < 0.0 || q.y < 0.0 || q.x >= ScreenSize.x || q.y >= ScreenSize.y) return vec4(0.0);
    vec2 uv = q / ScreenSize;
    vec4 c = texture(Body, uv);
    if (c.a < 0.02) return vec4(0.0);
    float body = texture(BodyDepth, uv).r;
    float world = texture(SceneDepth, dest / ScreenSize).r;
    if (body > world + 0.00002) return vec4(0.0);
    return c;
}

void main() {
    vec2 p = gl_FragCoord.xy;
    float t = max(1.0, Texel);
    float width = max(t, Box.z - Box.x);
    float height = max(t, Box.w - Box.y);
    float y = p.y - Box.y;
    float calm = clamp(Calm, 0.0, 1.0), muted = clamp(Muted, 0.0, 1.0);
    // The eye strip is projected separately: never round it out to anything larger.
    bool face = p.y >= Face.y && p.y < Face.w && Face.w > Face.y;
    // One line's height: a screen pixel or two at 1080, a little more as the body fills more of the screen.
    float unit = clamp(floor(height / 150.0 + 0.5), max(1.0, Line), max(1.0, Line) * 3.0);

    // ---- pieces of the body slipping sideways, cut clean (in steps, a few times a second; slow with fewer flashes)
    float rate = mix(mix(0.30, 0.14, calm), 0.03, muted);
    float slabUnit = max(2.0 * unit, height * 0.03);
    float su = floor(y / slabUnit);
    float group = floor(su / 4.0);
    float gStep = floor(Time * rate + hash(vec2(group, 19.0)) * 5.0);
    float g1 = hash(vec2(group + 55.0, gStep)), g2 = hash(vec2(group + 66.0, gStep)), g3 = hash(vec2(group + 77.0, gStep));
    float first = floor(g2 * 3.0), size = 1.0 + floor(g3 * 3.0);
    float inGroup = su - group * 4.0;
    bool slab = !face && g1 < mix(mix(0.30, 0.16, calm), 0.10, muted) && inGroup >= first && inGroup < first + size;
    float shift = 0.0;
    if (slab) {
        // Mostly the way it drags, now and then back.
        float side = fract(g1 * 13.7) < 0.8 ? 1.0 : -1.0;
        shift = side * width * (0.05 + 0.20 * fract(g3 * 7.3)) * mix(1.0, 0.5, calm) * mix(1.0, 0.6, muted);
    }
    // Thin slices of it, a line or two high, slipping on their own.
    float sliceRow = floor(y / (2.0 * unit));
    float sStep = floor(Time * rate * 1.6 + hash(vec2(sliceRow, 23.0)) * 3.0);
    float s1 = hash(vec2(sliceRow + 88.0, sStep));
    if (!face && !slab && s1 < mix(mix(0.05, 0.025, calm), 0.0, muted)) shift = width * (0.03 + 0.1 * fract(s1 * 31.7)) * Dir;
    // The eyes: their row always slides, by whole skin pixels.
    float faceStep = floor(Time * mix(mix(0.85, 0.35, calm), 0.06, muted) + hash(vec2(floor(y / t), 7.0)) * 4.0);
    if (face) shift = (1.0 + floor(hash(vec2(31.0, faceStep)) * mix(3.0, 1.5, calm))) * t * Dir;
    // Tearing away: everything goes, each piece its own way and further.
    float tearRow = floor(y / slabUnit);
    shift += Dir * Tear * Tear * (1.5 + hash(vec2(tearRow + 77.0, 3.0)) * 9.0) * width * 0.35;
    shift = floor(shift + 0.5);
    vec2 src = vec2(p.x - shift, p.y);
    vec4 color = bodyAt(src, p);

    // The eyes: a solid bar where the face is, slid with its row; dragged out of the cut, a run of it fading.
    if (face) {
        vec3 bar = mix(VIOLET, GREY, muted * 0.45);
        if (color.a > 0.0 && src.x >= Face.x && src.x < Face.z) {
            float dash = mod(floor((src.x - Face.x) / t), 5.0) == 4.0 ? 0.55 : 0.88;
            color.rgb = mix(color.rgb, bar, dash);
        } else if (color.a <= 0.0) {
            float start = (Dir > 0.0 ? Face.z : Face.x) + shift;
            float d = (p.x - start) * Dir;
            float reach = width * 1.1 * mix(1.0, 0.45, calm) * (1.0 + 2.5 * Tear);
            float gap = hash(vec2(floor(d / (unit * 9.0)), faceStep + 5.0));
            if (d >= 0.0 && d < reach && gap > 0.2) {
                float k = d / reach;
                color = vec4(mix(mix(MAGENTA, VIOLET, k), GREY, muted * 0.45), pow(1.0 - k, 0.7) * mix(0.9, 0.5, muted));
            }
        }
    }

    // ---- the lines: the body in bands, a run of three to six thin lines in some of them now and then
    float band = max(9.0 * unit, height * 0.07);
    float bi = floor(y / band);
    float lineRate = mix(mix(0.22, 0.10, calm), 0.035, muted);
    float phase = Time * lineRate + hash(vec2(bi, 3.0)) * 7.0;
    float bStep = floor(phase);
    float want = mix(mix(0.82, 0.45, calm), 0.25, muted);
    // A small body (a cat at a distance) has few bands: fewer runs, so it can still be told what it is.
    float chance = mix(want * clamp(height / 90.0, 0.5, 1.0), 0.95, Tear);
    float c1 = hash(vec2(bi + 101.0, bStep));
    if (!face && c1 < chance) {
        float n = 3.0 + floor(hash(vec2(bi + 202.0, bStep)) * 4.0);
        // Laid out from the band's foot: each line one or two high, the gaps between them small.
        float total = 0.0;
        for (int i = 0; i < 6; i++) {
            if (float(i) >= n) break;
            float hi = hash(vec2(bi * 7.0 + float(i), bStep + 11.0));
            total += (hi < 0.66 ? 1.0 : hi < 0.93 ? 2.0 : 3.0) * unit + (i < 5 ? (fract(hi * 9.1) < 0.7 ? 1.0 : fract(hi * 9.1) < 0.93 ? 2.0 : 3.0) * unit : 0.0);
        }
        float at = bi * band + floor(hash(vec2(bi + 303.0, bStep)) * max(0.0, band - total));
        float lineIndex = -1.0, thick = 1.0;
        for (int i = 0; i < 6; i++) {
            if (float(i) >= n) break;
            float hi = hash(vec2(bi * 7.0 + float(i), bStep + 11.0));
            float h = (hi < 0.66 ? 1.0 : hi < 0.93 ? 2.0 : 3.0) * unit;
            if (y >= at && y < at + h) { lineIndex = float(i); thick = h; break; }
            at += h + (fract(hi * 9.1) < 0.7 ? 1.0 : fract(hi * 9.1) < 0.93 ? 2.0 : 3.0) * unit;
        }
        if (lineIndex >= 0.0) {
            float key = bi * 7.0 + lineIndex;
            // Where this row has body: a few looks across it, its nearest depth.
            float from = 1e9, to = -1e9, depth = 1.0;
            float row = p.y;
            for (int i = 0; i < 8; i++) {
                float x = Box.x + (float(i) + 0.5) / 8.0 * width;
                vec2 uv = vec2(x, row) / ScreenSize;
                if (texture(Body, uv).a < 0.02) continue;
                from = min(from, x); to = max(to, x);
                depth = min(depth, texture(BodyDepth, uv).r);
            }
            // A run starts where the body is, so empty rows (between the legs, over the head) stay clean.
            if (to >= from && depth <= texture(SceneDepth, p / ScreenSize).r + 0.00002) {
                float l1 = hash(vec2(key + 404.0, bStep)), l2 = hash(vec2(key + 505.0, bStep));
                float l3 = hash(vec2(key + 606.0, bStep)), l4 = hash(vec2(key + 707.0, bStep));
                // A run's lines start near one another and reach about as far, each a little off.
                float r1 = hash(vec2(bi + 808.0, bStep)), r2 = hash(vec2(bi + 909.0, bStep));
                float near = Dir > 0.0 ? from : to, far = Dir > 0.0 ? to : from;
                float start = mix(near, far, clamp(r1 * r1 * 0.6 + (l1 - 0.5) * 0.25, 0.0, 0.7)) - Dir * width * 0.12 * fract(l1 * 5.3);
                float d = (p.x - start) * Dir;
                // Some stay near the body; most run well past it, two to five of its widths, fading out there.
                float rr = clamp(r2 + (l2 - 0.5) * 0.3, 0.0, 1.0);
                float reach = rr < 0.25 ? 0.5 + 0.7 * rr / 0.25 : rr < 0.6 ? 1.2 + 1.2 * (rr - 0.25) / 0.35 : 2.4 + 2.6 * (rr - 0.6) / 0.4;
                float len = reach * width * (1.0 + 2.5 * Tear) * mix(1.0, 0.6, calm) * mix(1.0, 0.55, muted);
                // What kind of line: coloured (its colour turning along it), dark (some dotted bright), a pale glint.
                bool glint = l3 > 0.93 && thick <= unit, dark = !glint && l3 > 0.72;
                bool dotted = dark && fract(l3 * 17.0) < 0.45;
                if (glint) len = min(len, width * (0.3 + 0.5 * l4));
                if (d >= 0.0 && d < len) {
                    // Dashes of no fixed length with gaps of no fixed length: cells of their own width per line,
                    // a dash in most, starting and ending somewhere inside it. Some lines run whole.
                    float cell = unit * (10.0 + floor(fract(l4 * 3.7) * 50.0));
                    float ci = floor(d / cell), f = fract(d / cell);
                    float ch = hash(vec2(key + ci * 1.37, bStep + 41.0));
                    float a = fract(ch * 3.3) * 0.25, b = a + 0.45 + fract(ch * 7.7) * 0.6;
                    bool whole = fract(l4 * 11.0) < (dotted ? 0.7 : 0.25);
                    bool on = whole || (ch < mix(0.95, 0.7, fract(l4 * 5.0)) && f >= a && f < b);
                    if (on) {
                        float k = d / len;
                        vec3 tint = run(fract(l3 * 1.31 + hash(vec2(bi, bStep + 9.0)) * 0.35), k);
                        if (glint) tint = CREAM;
                        if (dark) {
                            tint = fract(l3 * 29.0) < 0.5 ? DARK : NAVY;
                            // Bright dots strung along a dark line.
                            if (dotted && mod(floor(d / unit), 2.0) == 0.0 && y - floor(y / thick) * thick < unit) tint = fract(l4 * 13.0) < 0.6 ? LIME : CYAN;
                        }
                        tint = mix(tint, GREY, muted * 0.45);
                        // With fewer flashes a run fades in and out instead of popping.
                        float held = mix(1.0, sin(3.14159 * fract(phase)), muted);
                        // Past the body it thins out toward its end; on the body it is solid.
                        float past = (p.x - far) * Dir;
                        float fade = past <= 0.0 ? 1.0 : pow(clamp(1.0 - past / max(1.0, len - (far - start) * Dir), 0.0, 1.0), 0.55);
                        float tip = 1.0 - smoothstep(0.85, 1.0, k);
                        float strength = mix(0.95, 0.45, muted) * held * min(fade, tip);
                        if (color.a > 0.0) color.rgb = mix(color.rgb, tint, strength);
                        else color = vec4(tint, strength);
                    }
                }
            }
        }
    }

    if (color.a <= 0.0) discard;
    // Leaving: what is left of it goes in the last half of the tear.
    float leaving = 1.0 - smoothstep(0.45, 1.0, Tear);
    fragColor = vec4(color.rgb, color.a * Alpha * leaving);
}
