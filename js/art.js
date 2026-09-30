// Procedural SVG art: isometric facilities, ships, planets and HUD glyphs.
// Everything shares one <defs> block (injectDefs) so each illustration stays small.

const R2 = Math.SQRT2;
const n = v => Math.round(v * 10) / 10;

const DEFS = `
<linearGradient id="g-mt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f8ff"/><stop offset="1" stop-color="#aebdd2"/></linearGradient>
<linearGradient id="g-ml" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9c7da"/><stop offset="1" stop-color="#7a8aa3"/></linearGradient>
<linearGradient id="g-mr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d6b84"/><stop offset="1" stop-color="#343e54"/></linearGradient>
<linearGradient id="g-dt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#43526f"/><stop offset="1" stop-color="#29334a"/></linearGradient>
<linearGradient id="g-dl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d374d"/><stop offset="1" stop-color="#1b2232"/></linearGradient>
<linearGradient id="g-dr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2232"/><stop offset="1" stop-color="#0f141f"/></linearGradient>
<linearGradient id="g-cyl"><stop offset="0" stop-color="#56647e"/><stop offset=".3" stop-color="#e3ebf6"/><stop offset=".56" stop-color="#9aaac0"/><stop offset=".86" stop-color="#46536a"/><stop offset="1" stop-color="#2a3243"/></linearGradient>
<linearGradient id="g-cylt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7faff"/><stop offset="1" stop-color="#9aabc2"/></linearGradient>
<linearGradient id="g-cyld"><stop offset="0" stop-color="#1c2434"/><stop offset=".3" stop-color="#4d5b76"/><stop offset=".62" stop-color="#2b3548"/><stop offset="1" stop-color="#121822"/></linearGradient>
<linearGradient id="g-cyldt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a5977"/><stop offset="1" stop-color="#252f44"/></linearGradient>
<linearGradient id="g-gold"><stop offset="0" stop-color="#6e430b"/><stop offset=".3" stop-color="#ffe7a3"/><stop offset=".58" stop-color="#e3a632"/><stop offset="1" stop-color="#5e3a0a"/></linearGradient>
<linearGradient id="g-goldt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff5cf"/><stop offset="1" stop-color="#d69a2a"/></linearGradient>
<linearGradient id="g-padside"><stop offset="0" stop-color="#0b111c"/><stop offset=".32" stop-color="#2a3b58"/><stop offset=".62" stop-color="#172136"/><stop offset="1" stop-color="#080c15"/></linearGradient>
<radialGradient id="g-padtop" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#2a3d5e"/><stop offset=".7" stop-color="#18233a"/><stop offset="1" stop-color="#0f1628"/></radialGradient>
<radialGradient id="g-glass" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="#f0feff"/><stop offset=".3" stop-color="#6fe0ff"/><stop offset=".72" stop-color="#1768b0"/><stop offset="1" stop-color="#0a2552"/></radialGradient>
<radialGradient id="g-glassp" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="#fbf0ff"/><stop offset=".32" stop-color="#c197ff"/><stop offset=".72" stop-color="#5b2fb0"/><stop offset="1" stop-color="#211046"/></radialGradient>
<radialGradient id="g-dome" cx=".34" cy=".28" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#c2cfe0"/><stop offset=".75" stop-color="#5d6b84"/><stop offset="1" stop-color="#2a3243"/></radialGradient>
<radialGradient id="g-core" cx=".4" cy=".36" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".25" stop-color="#c8fbff"/><stop offset=".6" stop-color="#38e1ff"/><stop offset="1" stop-color="#0a6fc0"/></radialGradient>
<radialGradient id="g-glow-c"><stop offset="0" stop-color="#38e1ff" stop-opacity=".75"/><stop offset=".45" stop-color="#38e1ff" stop-opacity=".22"/><stop offset="1" stop-color="#38e1ff" stop-opacity="0"/></radialGradient>
<radialGradient id="g-glow-o"><stop offset="0" stop-color="#ffd08a" stop-opacity=".95"/><stop offset=".4" stop-color="#ff8a3d" stop-opacity=".4"/><stop offset="1" stop-color="#ff6a2a" stop-opacity="0"/></radialGradient>
<radialGradient id="g-glow-g"><stop offset="0" stop-color="#fff0b0" stop-opacity=".9"/><stop offset=".45" stop-color="#ffc53d" stop-opacity=".3"/><stop offset="1" stop-color="#ffc53d" stop-opacity="0"/></radialGradient>
<radialGradient id="g-glow-p"><stop offset="0" stop-color="#e2c8ff" stop-opacity=".9"/><stop offset=".45" stop-color="#a978ff" stop-opacity=".3"/><stop offset="1" stop-color="#a978ff" stop-opacity="0"/></radialGradient>
<radialGradient id="g-glow-r"><stop offset="0" stop-color="#ffb0b8" stop-opacity=".9"/><stop offset=".45" stop-color="#ff4d6a" stop-opacity=".35"/><stop offset="1" stop-color="#ff4d6a" stop-opacity="0"/></radialGradient>
<linearGradient id="g-beam-c" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#38e1ff" stop-opacity=".55"/><stop offset="1" stop-color="#38e1ff" stop-opacity="0"/></linearGradient>
<linearGradient id="g-beam-g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffc53d" stop-opacity=".6"/><stop offset="1" stop-color="#ffc53d" stop-opacity="0"/></linearGradient>
<linearGradient id="g-beam-p" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#c79bff" stop-opacity=".7"/><stop offset="1" stop-color="#a978ff" stop-opacity="0"/></linearGradient>
<linearGradient id="g-ore" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c8"/><stop offset=".45" stop-color="#ffa447"/><stop offset="1" stop-color="#b2400f"/></linearGradient>
<linearGradient id="g-door" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0e17"/><stop offset=".6" stop-color="#3b1d10"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient>
<pattern id="g-hazard" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#1a1a1a"/><rect width="3" height="6" fill="#ffc53d"/></pattern>
<linearGradient id="s-hull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3f8ff"/><stop offset=".45" stop-color="#a3b6cf"/><stop offset="1" stop-color="#34435c"/></linearGradient>
<linearGradient id="s-hull-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a6c88"/><stop offset="1" stop-color="#1c2537"/></linearGradient>
<linearGradient id="s-hull-e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb3a6"/><stop offset=".45" stop-color="#b8394f"/><stop offset="1" stop-color="#3c0d1c"/></linearGradient>
<radialGradient id="s-flame" cx=".7" cy=".5" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#9ff4ff"/><stop offset=".7" stop-color="#38b8ff" stop-opacity=".55"/><stop offset="1" stop-color="#2a6cff" stop-opacity="0"/></radialGradient>
<radialGradient id="s-flame-o" cx=".7" cy=".5" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#ffe19a"/><stop offset=".7" stop-color="#ff7a2a" stop-opacity=".55"/><stop offset="1" stop-color="#ff3d2a" stop-opacity="0"/></radialGradient>
<radialGradient id="p-shade" cx=".32" cy=".28" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset=".85" stop-color="#01030c" stop-opacity=".72"/><stop offset="1" stop-color="#01030c" stop-opacity=".92"/></radialGradient>
<radialGradient id="p-mining" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#e2cfb2"/><stop offset=".55" stop-color="#8f7458"/><stop offset="1" stop-color="#3d2d22"/></radialGradient>
<radialGradient id="p-trade" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#8fe2ff"/><stop offset=".55" stop-color="#2275c8"/><stop offset="1" stop-color="#0a2761"/></radialGradient>
<radialGradient id="p-energy" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f0ffff"/><stop offset=".5" stop-color="#52e4ff"/><stop offset="1" stop-color="#0b5f93"/></radialGradient>
<radialGradient id="p-intel" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f0dcff"/><stop offset=".55" stop-color="#9458ec"/><stop offset="1" stop-color="#2a1160"/></radialGradient>
<radialGradient id="p-fortress" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffc19e"/><stop offset=".55" stop-color="#d23f2d"/><stop offset="1" stop-color="#43090e"/></radialGradient>
<radialGradient id="p-disk" cx=".5" cy=".5" r=".5"><stop offset=".3" stop-color="#fff2c8"/><stop offset=".55" stop-color="#ff9a4a"/><stop offset=".8" stop-color="#b43ad8" stop-opacity=".8"/><stop offset="1" stop-color="#5b1aa8" stop-opacity="0"/></radialGradient>
<linearGradient id="p-ring" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd6a8" stop-opacity=".1"/><stop offset=".3" stop-color="#ffd6a8" stop-opacity=".75"/><stop offset=".7" stop-color="#c77a50" stop-opacity=".7"/><stop offset="1" stop-color="#ffd6a8" stop-opacity=".1"/></linearGradient>
<radialGradient id="p-atmo-mining"><stop offset=".74" stop-color="#e0bf94" stop-opacity=".55"/><stop offset=".8" stop-color="#e0bf94" stop-opacity=".22"/><stop offset="1" stop-color="#e0bf94" stop-opacity="0"/></radialGradient><radialGradient id="p-atmo-trade"><stop offset=".74" stop-color="#6fd0ff" stop-opacity=".55"/><stop offset=".8" stop-color="#6fd0ff" stop-opacity=".22"/><stop offset="1" stop-color="#6fd0ff" stop-opacity="0"/></radialGradient><radialGradient id="p-atmo-energy"><stop offset=".74" stop-color="#9ff4ff" stop-opacity=".55"/><stop offset=".8" stop-color="#9ff4ff" stop-opacity=".22"/><stop offset="1" stop-color="#9ff4ff" stop-opacity="0"/></radialGradient><radialGradient id="p-atmo-intel"><stop offset=".74" stop-color="#c79bff" stop-opacity=".55"/><stop offset=".8" stop-color="#c79bff" stop-opacity=".22"/><stop offset="1" stop-color="#c79bff" stop-opacity="0"/></radialGradient><radialGradient id="p-atmo-fortress"><stop offset=".74" stop-color="#ff8a5a" stop-opacity=".55"/><stop offset=".8" stop-color="#ff8a5a" stop-opacity=".22"/><stop offset="1" stop-color="#ff8a5a" stop-opacity="0"/></radialGradient>
<clipPath id="p-clip"><circle cx="60" cy="60" r="36"/></clipPath>
<radialGradient id="i-coin" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fff6c9"/><stop offset=".45" stop-color="#ffcb3d"/><stop offset="1" stop-color="#c7800f"/></radialGradient>
<linearGradient id="i-steel-t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#b6c8dc"/></linearGradient>
<linearGradient id="i-steel-l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9eb3cc"/><stop offset="1" stop-color="#5f7593"/></linearGradient>
<linearGradient id="i-steel-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#58708f"/><stop offset="1" stop-color="#2d3c55"/></linearGradient>
<linearGradient id="i-bolt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8fdff"/><stop offset=".5" stop-color="#46e4ff"/><stop offset="1" stop-color="#0f8fd6"/></linearGradient>
<linearGradient id="i-gem-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3e4ff"/><stop offset="1" stop-color="#b17dff"/></linearGradient>
<linearGradient id="i-gem-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a26bff"/><stop offset="1" stop-color="#4b1fa6"/></linearGradient>
<linearGradient id="i-star" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4c2"/><stop offset=".5" stop-color="#ffc53d"/><stop offset="1" stop-color="#e0851a"/></linearGradient>
`;

export function injectDefs() {
  if (document.getElementById("art-defs")) return;
  const holder = document.createElement("div");
  holder.innerHTML = `<svg id="art-defs" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs>${DEFS}</defs></svg>`;
  document.body.prepend(holder.firstElementChild);
}

// ---------- isometric helpers ----------
function iso(ox, oy) {
  const P = (x, y, z) => [n(ox + (x - y)), n(oy + (x + y) / 2 - z)];
  const pts = list => list.map(p => p.join(",")).join(" ");
  const api = {
    P,
    box({ x = 0, y = 0, z = 0, w, d, h, top = "url(#g-mt)", left = "url(#g-ml)", right = "url(#g-mr)", cls = "" }) {
      const x0 = x - w / 2, x1 = x + w / 2, y0 = y - d / 2, y1 = y + d / 2, z1 = z + h;
      const t = [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)];
      const l = [P(x0, y1, z), P(x1, y1, z), P(x1, y1, z1), P(x0, y1, z1)];
      const r = [P(x1, y0, z), P(x1, y1, z), P(x1, y1, z1), P(x1, y0, z1)];
      return `<g class="${cls}"><polygon points="${pts(l)}" fill="${left}"/><polygon points="${pts(r)}" fill="${right}"/><polygon points="${pts(t)}" fill="${top}"/></g>`;
    },
    // polygon on the lower-left face (y = const) given x/z rectangle
    faceL({ y, x0, x1, z0, z1, fill, cls = "" }) {
      return `<polygon class="${cls}" points="${pts([P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)])}" fill="${fill}"/>`;
    },
    faceR({ x, y0, y1, z0, z1, fill, cls = "" }) {
      return `<polygon class="${cls}" points="${pts([P(x, y0, z0), P(x, y1, z0), P(x, y1, z1), P(x, y0, z1)])}" fill="${fill}"/>`;
    },
    cyl({ x = 0, y = 0, z = 0, r, h, body = "url(#g-cyl)", top = "url(#g-cylt)", cls = "" }) {
      const [cx, cy] = P(x, y, z);
      const rx = n(r * R2), ry = n(r * R2 / 2), ty = n(cy - h);
      return `<g class="${cls}"><path d="M${n(cx - rx)} ${ty}V${cy}A${rx} ${ry} 0 0 0 ${n(cx + rx)} ${cy}V${ty}Z" fill="${body}"/><ellipse cx="${cx}" cy="${ty}" rx="${rx}" ry="${ry}" fill="${top}"/></g>`;
    },
    ring({ x = 0, y = 0, z = 0, r, stroke = "#38e1ff", w = 1.4, dash = "", cls = "", half = "", op = 1 }) {
      const [cx, cy] = P(x, y, z);
      const rx = n(r * R2), ry = n(r * R2 / 2);
      const attrs = `fill="none" stroke="${stroke}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ""} opacity="${op}" class="${cls}" stroke-linecap="round"`;
      if (!half) return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${attrs}/>`;
      const sweep = half === "back" ? 1 : 0;
      return `<path d="M${n(cx - rx)} ${cy}A${rx} ${ry} 0 0 ${sweep} ${n(cx + rx)} ${cy}" ${attrs}/>`;
    },
    dome({ x = 0, y = 0, z = 0, r, h, fill = "url(#g-glass)", cls = "" }) {
      const [cx, cy] = P(x, y, z);
      const rx = n(r * R2), ry = n(r * R2 / 2);
      return `<path class="${cls}" d="M${n(cx - rx)} ${cy}A${rx} ${h} 0 0 1 ${n(cx + rx)} ${cy}A${rx} ${ry} 0 0 1 ${n(cx - rx)} ${cy}Z" fill="${fill}"/>`;
    },
    line(a, b, stroke = "#9fb0c6", w = 1.6, cls = "") {
      return `<line class="${cls}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>`;
    },
    glow(p, r, grad = "g-glow-c", cls = "glow") {
      return `<circle class="${cls}" cx="${p[0]}" cy="${p[1]}" r="${r}" fill="url(#${grad})"/>`;
    },
    light(p, color = "#38e1ff", r = 1.8, cls = "blink") {
      return `<circle class="glow ${cls}" cx="${p[0]}" cy="${p[1]}" r="${r * 3}" fill="${color}" opacity=".25"/><circle class="glow ${cls}" cx="${p[0]}" cy="${p[1]}" r="${r}" fill="#fff"/>`;
    },
  };
  return api;
}

const OX = 80, OY = 116;

function pad(I, accent = "#38e1ff") {
  return I.cyl({ r: 46, z: -8, h: 8, body: "url(#g-padside)", top: "url(#g-padtop)" })
    + I.ring({ r: 42, stroke: accent, w: 1, op: .35 })
    + I.ring({ r: 45, stroke: accent, w: 1.6, dash: "1.5 6", op: .9, cls: "pad-lights" })
    + I.ring({ r: 30, stroke: "#8fb6ff", w: .6, op: .18 });
}

// ---------- facilities ----------
const FACILITY_ART = {
  command(I, t) {
    const gold = t >= 3;
    const top = I.P(0, 0, 60);
    let s = I.cyl({ r: 32, h: 10, body: "url(#g-cyld)", top: "url(#g-cyldt)" })
      + I.ring({ z: 5, r: 32, stroke: "#38e1ff", w: 1.4, dash: "3 4", cls: "glow flow" });
    if (t >= 2) {
      for (const [x, y] of [[-26, 12], [12, -26]]) {
        s += I.cyl({ x, y, z: 10, r: 5, h: 36 }) + I.light(I.P(x, y, 50), gold ? "#ffc53d" : "#38e1ff", 1.8);
      }
    }
    s += I.ring({ z: 70, r: 31, stroke: gold ? "#ffc53d" : "#38e1ff", w: 2, dash: "10 6", half: "back", cls: "glow", op: .8 })
      + I.cyl({ z: 10, r: 17, h: 50 });
    const base = I.P(0, 0, 14), up = I.P(0, 0, 54);
    for (const dx of [-12, -4, 4, 12]) s += I.line([n(base[0] + dx), n(base[1] + Math.abs(dx) * -0.3 + 8)], [n(up[0] + dx), n(up[1] + 8 - Math.abs(dx) * .3)], "#7fefff", 1.3, "glow win");
    s += I.cyl({ z: 40, r: 23, h: 5, body: gold ? "url(#g-gold)" : "url(#g-cyld)", top: gold ? "url(#g-goldt)" : "url(#g-cyldt)" })
      + I.ring({ z: 42, r: 23, stroke: gold ? "#fff0b0" : "#38e1ff", w: 1, dash: "2 3", cls: "glow", op: .9 })
      + I.dome({ z: 60, r: 17, h: 18, fill: "url(#g-glass)" })
      + I.ring({ z: 70, r: 31, stroke: gold ? "#ffc53d" : "#38e1ff", w: 2, dash: "10 6", half: "front", cls: "glow", op: .9 });
    const tip = [top[0], n(top[1] - 38)];
    s += I.line([top[0], n(top[1] - 16)], tip, "#dfe8f3", 1.6) + I.glow(tip, 12, gold ? "g-glow-g" : "g-glow-c", "glow pulse") + I.light(tip, gold ? "#ffc53d" : "#38e1ff", 2.4);
    if (gold) s += I.ring({ z: 78, r: 22, stroke: "#ffe7a3", w: 1.4, dash: "4 4", cls: "glow", op: .8 });
    return s;
  },

  extractor(I, t) {
    const legs = [[-17, -17], [17, -17], [17, 17], [-17, 17]];
    const apex = z => I.P(0, 0, z);
    const at = ([x, y], z, k) => I.P(x * (1 - k), y * (1 - k), z);
    let s = "";
    if (t >= 2) s += I.cyl({ x: 30, y: -20, r: 8, h: 34, z: 0 }) + I.ring({ x: 30, y: -20, z: 24, r: 8, stroke: "#ff8a3d", w: 2.2, op: .9 }) + I.light(I.P(30, -20, 36), "#ff8a3d", 1.4);
    s += I.box({ w: 50, d: 50, h: 10, top: "url(#g-dt)", left: "url(#g-dl)", right: "url(#g-dr)" })
      + I.faceL({ y: 25, x0: -25, x1: 25, z0: 7, z1: 10, fill: "url(#g-hazard)" })
      + I.faceR({ x: 25, y0: -25, y1: 25, z0: 7, z1: 10, fill: "url(#g-hazard)" })
      + I.glow(I.P(0, 0, 10), 22, "g-glow-o", "glow pulse");
    const zt = 80, braces = [30, 52];
    const legLine = (p, stroke) => I.line(at(p, 10, 0), apex(zt), stroke, 2.2);
    s += legLine(legs[0], "#56647e") + legLine(legs[1], "#6b7a93") + legLine(legs[3], "#6b7a93");
    s += I.cyl({ z: 4, r: 4.5, h: 62, body: "url(#g-cyl)" });
    s += `<polygon points="${I.P(-5, -5, 10).join(",")} ${I.P(5, 5, 10).join(",")} ${I.P(0, 0, 0).join(",")}" fill="url(#g-ore)"/>`;
    s += legLine(legs[2], "#c9d5e4");
    for (const z of braces) {
      const k = (z - 10) / (zt - 10);
      const ring = legs.map(p => at(p, z, k));
      s += `<polygon points="${ring.map(p => p.join(",")).join(" ")}" fill="none" stroke="#8b9bb3" stroke-width="1.2"/>`;
    }
    s += I.box({ z: zt - 6, w: 13, d: 13, h: 9, top: t >= 3 ? "url(#g-goldt)" : "url(#g-mt)", left: t >= 3 ? "url(#g-gold)" : "url(#g-ml)" })
      + I.light(I.P(0, 0, zt + 8), "#ff4d6a", 2, "blink");
    s += I.box({ x: 4, y: 36, w: 18, d: 14, h: 9 });
    const crystals = t >= 3 ? [[-2, 36, 18], [6, 34, 22], [12, 38, 15], [0, 40, 13]] : [[0, 36, 14], [7, 37, 17], [11, 40, 11]];
    for (const [x, y, h] of crystals) {
      const b = I.P(x, y, 9), tip = I.P(x, y, 9 + h * .7);
      s += `<polygon points="${n(b[0] - 3.2)},${b[1]} ${tip[0]},${tip[1]} ${n(b[0] + 3.2)},${b[1]} ${b[0]},${n(b[1] + 2)}" fill="url(#g-ore)" stroke="#ffe0a8" stroke-width=".5"/>`;
    }
    s += I.glow(I.P(6, 38, 14), 12, "g-glow-o", "glow pulse");
    if (t >= 2) s += I.box({ x: 25, y: 12, w: 8, d: 30, h: 3, z: 12, top: "url(#g-dt)", left: "url(#g-dl)", right: "url(#g-dr)" });
    return s;
  },

  reactor(I, t) {
    const c = I.P(0, 0, 48);
    const gold = t >= 3;
    let s = I.cyl({ r: 30, h: 12, body: "url(#g-cyld)", top: "url(#g-cyldt)" })
      + I.ring({ z: 6, r: 30, stroke: "#38e1ff", w: 1.4, dash: "3 4", cls: "glow flow" })
      + I.cyl({ z: 12, r: 21, h: 7, body: "url(#g-cyl)", top: "url(#g-cyldt)" })
      + I.ring({ z: 19, r: 14, stroke: "#38e1ff", w: 1, op: .6 });
    const pillars = t >= 2 ? [[-22, -22], [22, -22], [-22, 22], [22, 22]] : [];
    for (const [x, y] of pillars.filter(([x, y]) => x + y < 0)) s += I.box({ x, y, z: 12, w: 6, d: 6, h: 32 }) + I.light(I.P(x, y, 46), "#38e1ff", 1.5);
    s += I.glow(c, 44, "g-glow-c", "glow pulse");
    const rings = [[-20, 32, 9], [24, 28, 8]];
    if (gold) rings.push([0, 36, 7]);
    for (const [rot, rx, ry] of rings) s += `<g transform="rotate(${rot} ${c[0]} ${c[1]})"><path d="M${n(c[0] - rx)} ${c[1]}A${rx} ${ry} 0 0 1 ${n(c[0] + rx)} ${c[1]}" fill="none" stroke="${rot === 0 ? "#ffc53d" : "#38e1ff"}" stroke-width="1.6" opacity=".45"/></g>`;
    for (const a of [90, 210, 330]) {
      const rad = a * Math.PI / 180;
      s += I.line(I.P(Math.cos(rad) * 16, Math.sin(rad) * 16, 19), I.P(Math.cos(rad) * 6, Math.sin(rad) * 6, 38), "#b9c7da", 2);
    }
    s += `<circle cx="${c[0]}" cy="${c[1]}" r="16" fill="url(#g-core)"/><ellipse cx="${n(c[0] - 5)}" cy="${n(c[1] - 6)}" rx="5" ry="3" fill="#fff" opacity=".7"/>`;
    for (const [rot, rx, ry] of rings) s += `<g transform="rotate(${rot} ${c[0]} ${c[1]})"><path class="glow flow" d="M${n(c[0] + rx)} ${c[1]}A${rx} ${ry} 0 0 1 ${n(c[0] - rx)} ${c[1]}" fill="none" stroke="${rot === 0 ? "#ffe7a3" : "#9ff4ff"}" stroke-width="2" stroke-dasharray="7 5"/></g>`;
    for (const [x, y] of pillars.filter(([x, y]) => x + y >= 0)) s += I.box({ x, y, z: 12, w: 6, d: 6, h: 32 }) + I.light(I.P(x, y, 46), "#38e1ff", 1.5);
    return s;
  },

  market(I, t) {
    const gold = t >= 3;
    let s = I.cyl({ r: 34, h: 8, body: "url(#g-cyld)", top: "url(#g-cyldt)" })
      + I.cyl({ z: 8, r: 26, h: 14 })
      + I.ring({ z: 14, r: 26, stroke: "#ffc53d", w: 2.4, dash: "2 3", half: "front", cls: "glow win" })
      + I.cyl({ z: 22, r: 18, h: 16 })
      + I.ring({ z: 30, r: 18, stroke: "#ffc53d", w: 2.4, dash: "2 3", half: "front", cls: "glow win" });
    let z = 38;
    s += I.cyl({ z, r: 25, h: 3, body: gold ? "url(#g-gold)" : "url(#g-cyld)", top: gold ? "url(#g-goldt)" : "url(#g-cyldt)" })
      + I.ring({ z: z + 3, r: 22, stroke: "#ffc53d", w: 1, dash: "1.5 4", cls: "glow pad-lights" });
    z += 3;
    if (t >= 2) { s += I.cyl({ z, r: 11, h: 12 }) + I.ring({ z: z + 6, r: 11, stroke: "#ffc53d", w: 2, dash: "2 3", half: "front", cls: "glow win" }); z += 12; }
    const top = I.P(0, 0, z);
    s += `<polygon class="glow beam" points="${n(top[0] - 7)},${top[1]} ${n(top[0] + 7)},${top[1]} ${n(top[0] + 18)},${n(top[1] - 46)} ${n(top[0] - 18)},${n(top[1] - 46)}" fill="url(#g-beam-g)"/>`;
    const coin = [top[0], n(top[1] - 30)];
    s += I.glow(coin, 18, "g-glow-g", "glow pulse")
      + `<g class="coin-spin"><circle cx="${coin[0]}" cy="${coin[1]}" r="10" fill="url(#i-coin)" stroke="#fff3c4" stroke-width="1"/><path d="M${coin[0]} ${n(coin[1] - 5.5)}l5 5.5-5 5.5-5-5.5Z" fill="#b87812" opacity=".75"/></g>`;
    if (gold) s += I.box({ x: -30, y: 10, z: 8, w: 10, d: 16, h: 6, top: "url(#g-goldt)", left: "url(#g-gold)" }) + I.light(I.P(-30, 18, 16), "#ffc53d", 1.4);
    return s;
  },

  observatory(I, t) {
    const gold = t >= 3;
    let s = "";
    if (t >= 2) {
      const m = I.P(-20, -18, 12), dc = [m[0], n(m[1] - 16)];
      s += I.line(m, dc, "#8b9bb3", 2) + `<ellipse cx="${dc[0]}" cy="${dc[1]}" rx="9" ry="4" transform="rotate(25 ${dc[0]} ${dc[1]})" fill="url(#g-mt)" stroke="#5d6b84" stroke-width=".8"/>`;
    }
    s += I.box({ w: 46, d: 46, h: 12, top: "url(#g-dt)", left: "url(#g-dl)", right: "url(#g-dr)" })
      + I.faceL({ y: 23, x0: -18, x1: 18, z0: 4, z1: 7, fill: "#a978ff", cls: "glow win" })
      + I.cyl({ x: -4, y: 6, z: 12, r: 17, h: 8 })
      + I.dome({ x: -4, y: 6, z: 20, r: 17, h: 26, fill: "url(#g-dome)" });
    const dt = I.P(-4, 6, 20);
    s += `<path d="M${n(dt[0] - 3)} ${n(dt[1] + 8)}L${n(dt[0] - 4)} ${n(dt[1] - 22)}Q${dt[0]} ${n(dt[1] - 27)} ${n(dt[0] + 4)} ${n(dt[1] - 22)}L${n(dt[0] + 3)} ${n(dt[1] + 8)}Z" fill="#150b2e"/>`
      + `<path class="glow pulse" d="M${n(dt[0] - 1.5)} ${n(dt[1] + 6)}L${n(dt[0] - 2)} ${n(dt[1] - 20)}L${n(dt[0] + 2)} ${n(dt[1] - 20)}L${n(dt[0] + 1.5)} ${n(dt[1] + 6)}Z" fill="#c79bff" opacity=".85"/>`;
    const mast = I.P(18, -12, 12), dish = [n(mast[0] + 4), n(mast[1] - 28)];
    s += I.line(mast, [mast[0], n(mast[1] - 22)], "#9fb0c6", 2.4)
      + `<polygon class="glow beam" points="${dish[0]},${dish[1]} ${n(dish[0] + 44)},${n(dish[1] - 50)} ${n(dish[0] + 58)},${n(dish[1] - 34)}" fill="url(#g-beam-p)"/>`
      + `<g transform="rotate(-38 ${dish[0]} ${dish[1]})"><ellipse cx="${dish[0]}" cy="${dish[1]}" rx="17" ry="7" fill="${gold ? "url(#g-goldt)" : "url(#g-mt)"}" stroke="#5d6b84" stroke-width=".8"/><ellipse cx="${dish[0]}" cy="${n(dish[1] - 1)}" rx="12" ry="4.2" fill="${gold ? "#c78a1f" : "#8a9bb3"}"/></g>`
      + I.line(dish, [n(dish[0] + 6), n(dish[1] - 9)], "#dfe8f3", 1.2) + I.light([n(dish[0] + 6), n(dish[1] - 9)], "#c79bff", 1.6);
    return s;
  },

  foundry(I, t) {
    const gold = t >= 3;
    let s = "";
    const post = (x, y) => I.box({ x, y, w: 4, d: 4, h: 50, top: "url(#g-mt)", left: "url(#g-ml)", right: "url(#g-mr)" });
    s += post(-28, -22) + post(28, -22);
    s += I.box({ w: 62, d: 42, h: 26 });
    for (const x of [-20, -8, 4, 16]) s += I.line(I.P(x, -21, 26), I.P(x, 21, 26), "#8fa0b8", 1);
    s += I.faceL({ y: 21, x0: -20, x1: 16, z0: 0, z1: 20, fill: "url(#g-door)" });
    for (const z of [5, 10, 15]) s += I.line(I.P(-20, 21, z), I.P(16, 21, z), "#000", .8);
    s += I.faceR({ x: 31, y0: -14, y1: 14, z0: 13, z1: 17, fill: gold ? "#ffc53d" : "#38e1ff", cls: "glow win" });
    s += I.box({ x: 0, y: -22, z: 48, w: 62, d: 5, h: 4, top: gold ? "url(#g-goldt)" : "url(#g-mt)", left: gold ? "url(#g-gold)" : "url(#g-ml)" });
    const hook = I.P(4, -22, 48);
    s += I.line(hook, [hook[0], n(hook[1] + 14)], "#dfe8f3", 1);
    s += `<g class="hull-lift"><polygon points="${n(hook[0] - 14)},${n(hook[1] + 18)} ${n(hook[0] + 12)},${n(hook[1] + 15)} ${n(hook[0] + 20)},${n(hook[1] + 19)} ${n(hook[0] + 12)},${n(hook[1] + 23)} ${n(hook[0] - 14)},${n(hook[1] + 22)}" fill="url(#s-hull)"/><line x1="${n(hook[0] - 10)}" y1="${n(hook[1] + 20)}" x2="${n(hook[0] + 12)}" y2="${n(hook[1] + 19)}" stroke="#38e1ff" stroke-width="1" class="glow"/></g>`;
    if (t >= 2) s += I.cyl({ x: -18, y: -8, z: 26, r: 4, h: 14, body: "url(#g-cyld)", top: "#0b0f18" }) + I.glow(I.P(-18, -8, 44), 7, "g-glow-o", "glow pulse");
    for (const [x, y] of [[-2, 22], [8, 22], [3, 22]]) s += I.light(I.P(x, y, 2), "#ffb347", 1.1, "spark");
    s += I.glow(I.P(-2, 22, 4), 16, "g-glow-o", "glow pulse");
    return s;
  },
};

export function facilityTier(level) {
  if (level <= 0) return 0;
  if (level < 5) return 1;
  if (level < 10) return 2;
  return 3;
}

export function facilityArt(key, level, locked = false) {
  const I = iso(OX, OY);
  const tier = facilityTier(level);
  const accent = key === "observatory" ? "#a978ff" : key === "market" ? "#ffc53d" : key === "foundry" || key === "extractor" ? "#ff9a4a" : "#38e1ff";
  const draw = FACILITY_ART[key];
  const body = draw ? draw(I, Math.max(1, tier)) : "";
  const state = locked ? "locked" : tier === 0 ? "bp" : `tier-${tier}`;
  return `<svg class="facility-art ${state}" viewBox="0 0 160 164" aria-hidden="true"><ellipse cx="80" cy="128" rx="70" ry="30" fill="#000" opacity=".35"/>${pad(I, locked ? "#5f6f8c" : accent)}<g class="structure">${body}</g></svg>`;
}

// ---------- ships ----------
const SHIP_ART = {
  striker: enemy => `
    <ellipse class="flame" cx="12" cy="20" rx="12" ry="4" fill="url(#${enemy ? "s-flame-o" : "s-flame"})"/>
    <polygon points="30,19 16,5 25,5 48,17" fill="url(#s-hull-d)"/>
    <path d="M14 16 L50 13 L76 20 L50 27 L14 24 Z" fill="url(#${enemy ? "s-hull-e" : "s-hull"})"/>
    <polygon points="30,21 16,35 25,35 48,23" fill="#1a2334"/>
    <path d="M48 15.5 Q60 15.5 66 20 L48 20Z" fill="url(#g-glass)"/>
    <line x1="18" y1="20.5" x2="58" y2="20.5" stroke="${enemy ? "#ff6a7a" : "#38e1ff"}" stroke-width="1.2" class="glow"/>`,
  guardian: enemy => `
    <ellipse class="flame" cx="10" cy="14" rx="10" ry="3.6" fill="url(#${enemy ? "s-flame-o" : "s-flame"})"/>
    <ellipse class="flame" cx="10" cy="26" rx="10" ry="3.6" fill="url(#${enemy ? "s-flame-o" : "s-flame"})"/>
    <polygon points="14,8 46,5 64,13 64,27 46,35 14,32" fill="url(#${enemy ? "s-hull-e" : "s-hull"})"/>
    <polygon points="14,20 64,20 64,27 46,35 14,32" fill="#000" opacity=".28"/>
    <rect x="30" y="2" width="14" height="6" rx="2" fill="url(#s-hull-d)"/>
    <path d="M22 13 H54 M22 27 H54" stroke="${enemy ? "#ff6a7a" : "#37f29a"}" stroke-width="1.4" class="glow"/>
    <path class="shield" d="M68 3 Q84 20 68 37" fill="none" stroke="${enemy ? "#ff6a7a" : "#37f29a"}" stroke-width="2.2" opacity=".75"/>`,
  siege: enemy => `
    <ellipse class="flame" cx="8" cy="15" rx="9" ry="3.2" fill="url(#${enemy ? "s-flame-o" : "s-flame-o"})"/>
    <ellipse class="flame" cx="8" cy="25" rx="9" ry="3.2" fill="url(#${enemy ? "s-flame-o" : "s-flame-o"})"/>
    <rect x="54" y="17" width="24" height="5" rx="1.5" fill="#2a3243"/>
    <circle class="glow pulse" cx="78" cy="19.5" r="3" fill="#ffb347"/>
    <polygon points="8,11 50,9 60,14 60,27 50,31 8,29" fill="url(#${enemy ? "s-hull-e" : "s-hull"})"/>
    <polygon points="8,20 60,20 60,27 50,31 8,29" fill="#000" opacity=".3"/>
    <path d="M30 9 Q38 1 46 9Z" fill="url(#s-hull-d)"/>
    <path d="M14 16 H48" stroke="#ff8a3d" stroke-width="1.6" class="glow"/>
    <path d="M14 24 H40" stroke="#ff8a3d" stroke-width="1" opacity=".7"/>`,
};

export function shipArt(key, { enemy = false, cls = "" } = {}) {
  return `<svg class="ship-art ship-${key} ${cls}" viewBox="0 0 84 40" aria-hidden="true">${(SHIP_ART[key] || SHIP_ART.striker)(enemy)}</svg>`;
}

// ---------- planets ----------
const PLANET_ART = {
  mining: () => `
    <circle cx="60" cy="60" r="36" fill="url(#p-mining)"/>
    <g clip-path="url(#p-clip)" opacity=".85">
      <ellipse cx="46" cy="48" rx="9" ry="7" fill="#5c4637"/><ellipse cx="45" cy="47" rx="7" ry="5" fill="#7a624d"/>
      <ellipse cx="70" cy="68" rx="12" ry="9" fill="#5c4637"/><ellipse cx="69" cy="66.5" rx="9.5" ry="6.5" fill="#826a54"/>
      <ellipse cx="58" cy="80" rx="6" ry="4" fill="#5c4637"/><ellipse cx="76" cy="44" rx="5" ry="4" fill="#5c4637"/>
      <path d="M24 62 Q50 56 96 66" stroke="#b39a7c" stroke-width="3" fill="none" opacity=".4"/>
    </g>`,
  trade: () => `
    <circle cx="60" cy="60" r="36" fill="url(#p-trade)"/>
    <g clip-path="url(#p-clip)">
      <path d="M30 40 Q44 30 56 40 T70 58 Q60 70 46 62 T30 40Z" fill="#3fbf7a" opacity=".9"/>
      <path d="M62 74 Q76 66 88 76 Q84 90 70 92 Q60 86 62 74Z" fill="#2f9e62" opacity=".9"/>
      <path d="M20 54 Q40 48 60 54 T100 50" stroke="#fff" stroke-width="3" fill="none" opacity=".35"/>
      <path d="M26 78 Q50 72 70 80" stroke="#fff" stroke-width="2.4" fill="none" opacity=".3"/>
      <g fill="#ffd36a" class="city">${[[72, 84], [78, 78], [84, 70], [66, 88], [88, 62]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1"/>`).join("")}</g>
    </g>
    <circle cx="100" cy="30" r="6" fill="#c9d3e3"/><circle cx="102" cy="32" r="6" fill="#000" opacity=".4"/>`,
  energy: () => `
    <circle cx="60" cy="60" r="36" fill="url(#p-energy)"/>
    <g clip-path="url(#p-clip)" fill="none" stroke-linecap="round">
      <path class="glow pulse" d="M30 44 L46 54 L42 68 L58 76 L66 94 M46 54 L62 46 L74 52 M58 76 L78 70 L92 76" stroke="#e6ffff" stroke-width="1.6"/>
      <path d="M22 60 Q60 44 98 62" stroke="#fff" stroke-width="6" opacity=".18"/>
    </g>`,
  intel: () => `
    <ellipse cx="60" cy="60" rx="54" ry="12" fill="none" stroke="#8b9bb3" stroke-width="3" transform="rotate(-14 60 60)" opacity=".7"/>
    <circle cx="60" cy="60" r="36" fill="url(#p-intel)"/>
    <g clip-path="url(#p-clip)" opacity=".55">
      <rect x="20" y="40" width="90" height="5" fill="#f0dcff"/><rect x="20" y="52" width="90" height="8" fill="#5d2bb0"/>
      <rect x="20" y="66" width="90" height="4" fill="#e3c6ff"/><rect x="20" y="76" width="90" height="7" fill="#3c1a82"/>
      <ellipse cx="72" cy="58" rx="7" ry="3.4" fill="#f5e4ff"/>
    </g>
    <path d="M6 73.5 A54 12 -14 0 0 114 46.5" fill="none" stroke="#c9d5e4" stroke-width="3" transform="rotate(0)"/>
    <g fill="url(#g-mt)" stroke="#34435c" stroke-width=".6"><rect x="14" y="68" width="8" height="5"/><rect x="98" y="46" width="8" height="5"/><rect x="56" y="80" width="10" height="5"/></g>
    <g class="blink" fill="#c79bff"><circle cx="18" cy="70" r="1.4"/><circle cx="102" cy="48" r="1.4"/><circle cx="61" cy="82" r="1.4"/></g>`,
  fortress: () => `
    <ellipse cx="60" cy="60" rx="58" ry="13" fill="none" stroke="url(#p-ring)" stroke-width="7" transform="rotate(-12 60 60)" opacity=".7"/>
    <circle cx="60" cy="60" r="36" fill="url(#p-fortress)"/>
    <g clip-path="url(#p-clip)" fill="none">
      <path class="glow pulse" d="M28 50 L44 56 L52 48 L66 58 L84 52 M44 56 L48 72 L64 78 L78 90 M66 58 L70 72" stroke="#ffb347" stroke-width="1.8"/>
    </g>
    <path d="M2.6 72.1 A58 13 -12 0 0 117.4 47.9" fill="none" stroke="url(#p-ring)" stroke-width="7" opacity=".85"/>`,
  boss: () => `
    <circle cx="60" cy="60" r="46" fill="url(#g-glow-p)" class="pulse"/>
    <g transform="rotate(-16 60 60)"><path d="M4 60 A56 15 0 0 1 116 60" fill="none" stroke="url(#p-disk)" stroke-width="10" opacity=".85"/></g>
    <circle cx="60" cy="60" r="22" fill="#020106"/>
    <circle cx="60" cy="60" r="23.5" fill="none" stroke="#ffcf8a" stroke-width="1.6" opacity=".9"/>
    <circle cx="60" cy="60" r="27" fill="none" stroke="#b43ad8" stroke-width="2" opacity=".5"/>
    <g transform="rotate(-16 60 60)"><path d="M116 60 A56 15 0 0 1 4 60" fill="none" stroke="url(#p-disk)" stroke-width="12"/><path d="M104 60 A44 10 0 0 1 16 60" fill="none" stroke="#fff4d6" stroke-width="1.4" opacity=".7"/></g>`,
};

export function planetArt(type, cls = "") {
  const body = (PLANET_ART[type] || PLANET_ART.mining)();
  const shade = type === "boss" ? "" : `<circle cx="60" cy="60" r="36" fill="url(#p-shade)"/><path d="M30 38 A36 36 0 0 1 72 26" fill="none" stroke="#fff" stroke-width="1.4" opacity=".55" stroke-linecap="round"/>`;
  const halo = type === "boss" ? "" : `<circle cx="60" cy="60" r="48" fill="url(#p-atmo-${PLANET_ART[type] ? type : "mining"})"/>`;
  // shading must sit under front ring pieces, so insert before the last ring element for ringed worlds
  if (type === "fortress" || type === "intel") {
    const split = body.lastIndexOf("<path d=\"M");
    return `<svg class="planet-art planet-${type} ${cls}" viewBox="0 0 120 120" aria-hidden="true">${halo}${body.slice(0, split)}${shade}${body.slice(split)}</svg>`;
  }
  return `<svg class="planet-art planet-${type} ${cls}" viewBox="0 0 120 120" aria-hidden="true">${halo}${body}${shade}</svg>`;
}

// ---------- resource gems ----------
const RESOURCE_ICON = {
  credits: `<ellipse cx="16" cy="18" rx="12" ry="11.5" fill="#8a560d"/><circle cx="16" cy="15.6" r="12" fill="url(#i-coin)"/><circle cx="16" cy="15.6" r="8.6" fill="none" stroke="#fff3c4" stroke-width="1.2" opacity=".7"/><path d="M16 9.6l5.4 6-5.4 6-5.4-6Z" fill="#b87812" opacity=".85"/><path d="M16 11.4l3.6 4.2-3.6 4.2Z" fill="#ffe7a3" opacity=".7"/><ellipse cx="11.5" cy="9.8" rx="3.6" ry="1.8" fill="#fff" opacity=".7" transform="rotate(-30 11.5 9.8)"/>`,
  alloy: `<polygon points="16,6 28,12 16,18 4,12" fill="url(#i-steel-t)"/><polygon points="4,12 16,18 16,27 4,21" fill="url(#i-steel-l)"/><polygon points="28,12 16,18 16,27 28,21" fill="url(#i-steel-r)"/><polygon points="16,9 23,12.5 16,16 9,12.5" fill="#fff" opacity=".45"/><path d="M4 12 16 18 28 12" fill="none" stroke="#fff" stroke-width=".8" opacity=".7"/>`,
  energy: `<path d="M18.5 3 7 18h7.5L12.5 29 25 13h-7.6Z" fill="#0b4f86" transform="translate(.8 1.2)"/><path d="M18.5 3 7 18h7.5L12.5 29 25 13h-7.6Z" fill="url(#i-bolt)" stroke="#e8fdff" stroke-width=".9" stroke-linejoin="round"/><path d="M17 7 11 16h4" fill="none" stroke="#fff" stroke-width="1.2" opacity=".8" stroke-linecap="round"/>`,
  intel: `<polygon points="16,3 26,14 16,14" fill="url(#i-gem-a)"/><polygon points="16,3 6,14 16,14" fill="#e6d0ff"/><polygon points="6,14 16,29 16,14" fill="url(#i-gem-b)"/><polygon points="26,14 16,29 16,14" fill="#3b1591"/><path d="M6 14h20" stroke="#fff" stroke-width=".8" opacity=".6"/><polygon points="16,5 12,12 16,12" fill="#fff" opacity=".55"/>`,
};

export function resourceIcon(key, cls = "") {
  return `<svg class="res-icon res-icon-${key} ${cls}" viewBox="0 0 32 32" aria-hidden="true">${RESOURCE_ICON[key] || ""}</svg>`;
}

export function starIcon(cls = "") {
  return `<svg class="star-icon ${cls}" viewBox="0 0 32 32" aria-hidden="true"><path d="m16 3.5 3.8 7.9 8.6 1.2-6.2 6 1.5 8.6L16 23.1l-7.7 4.1 1.5-8.6-6.2-6 8.6-1.2Z" fill="#9a5a0c" transform="translate(0 1.2)"/><path d="m16 3.5 3.8 7.9 8.6 1.2-6.2 6 1.5 8.6L16 23.1l-7.7 4.1 1.5-8.6-6.2-6 8.6-1.2Z" fill="url(#i-star)" stroke="#fff4c2" stroke-width=".8" stroke-linejoin="round"/><path d="m16 7 2.4 5-2.4 7-2.4-7Z" fill="#fff" opacity=".45"/></svg>`;
}

// ---------- line icons ----------
const LINE = {
  base: '<path d="M3.5 20.5h17"/><path d="M5.5 20.5V11l6.5-4.5 6.5 4.5v9.5"/><path d="M12 6.5V3M9.5 20.5v-5h5v5"/><circle cx="12" cy="11.5" r="1.4"/>',
  map: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/>',
  goals: '<path d="M6 3.5h12v4.5a6 6 0 0 1-12 0Z"/><path d="M6 5.5H3.5a3 3 0 0 0 3 4M18 5.5h2.5a3 3 0 0 1-3 4M12 14v3.5M8 20.5h8M9.5 17.5h5"/>',
  sound: '<path d="M4 9.5v5h3.5l5 4v-13l-5 4Z"/><path class="sound-wave" d="M16 9a4.2 4.2 0 0 1 0 6M18.6 6.5a8 8 0 0 1 0 11"/><path class="sound-muted" d="m16 9.5 5 5M21 9.5l-5 5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.9-2.4 2.2-2.4 4"/><path d="M12 17.2v.1"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><path d="M12 14.5v2.5"/>',
  up: '<path d="M12 19V6M6.5 11 12 5.5 17.5 11"/>',
  sword: '<path d="M14.5 4.5h5v5L9 20l-2.5.5.5-2.5Z"/><path d="m5 15 4 4M3.5 20.5l2-2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  bolt: '<path d="M13 2.5 5.5 13.5H11l-1 8 7.5-11H12Z"/>',
  power: '<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9Z"/><path d="M12 8v8M8.5 10l7 4M15.5 10l-7 4"/>',
  trend: '<path d="M3.5 17 9.5 11l4 4 7-7.5"/><path d="M15 7.5h5.5V13"/>',
  flag: '<path d="M5.5 21V4"/><path d="M5.5 4.5h12l-2.5 4 2.5 4h-12"/>',
  skull: '<path d="M5 11a7 7 0 0 1 14 0v3.5l-2 1.5v3.5H7V16l-2-1.5Z"/><circle cx="9.3" cy="11.5" r="1.6"/><circle cx="14.7" cy="11.5" r="1.6"/><path d="M10.5 19.5v-2M13.5 19.5v-2"/>',
  gift: '<rect x="4" y="9" width="16" height="11.5" rx="1.5"/><path d="M3 9h18v-3H3ZM12 6v14.5"/><path d="M12 6c-1.5-3-5-3.5-5-1s3 1 5 1c2 0 5 1.5 5-1s-3.5-2-5 1"/>',
  build: '<path d="M4 20.5h16M6 20.5V10h5v10.5M11 14h7v6.5"/><path d="M8.5 13h0M8.5 16h0M14.5 17h0"/><path d="M6 10 8.5 5 11 10"/>',
  fleet: '<path d="M3 12h4l3-4h7l4 4-4 4h-7l-3-4"/><path d="M10 12h7"/>',
  galaxy: '<path d="M12 12c0-3 3-5 6-3M12 12c3 0 5 3 3 6M12 12c0 3-3 5-6 3M12 12c-3 0-5-3-3-6"/><circle cx="12" cy="12" r="1.5"/>',
  reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 4v4.5h4.5"/>',
};

export function icon(name, cls = "") {
  return `<svg class="ico ico-${name} ${cls}" viewBox="0 0 24 24" aria-hidden="true">${LINE[name] || ""}</svg>`;
}

export function brandMark(cls = "") {
  return `<svg class="brand-mark ${cls}" viewBox="0 0 64 64" aria-hidden="true">
    <defs><linearGradient id="bm-rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".5" stop-color="#ffc53d"/><stop offset="1" stop-color="#b86a0a"/></linearGradient>
    <radialGradient id="bm-core" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#9ff4ff"/><stop offset=".5" stop-color="#2a8cff"/><stop offset="1" stop-color="#1a1060"/></radialGradient></defs>
    <path d="M32 3 56 16v32L32 61 8 48V16Z" fill="#0a1024" stroke="url(#bm-rim)" stroke-width="3"/>
    <circle cx="32" cy="33" r="13" fill="url(#bm-core)"/>
    <ellipse cx="32" cy="34" rx="21" ry="6" fill="none" stroke="#ffc53d" stroke-width="2.2" transform="rotate(-18 32 34)"/>
    <path d="M32 12l2.4 6.2L41 19l-5 4.2 1.6 6.5L32 26.3l-5.6 3.4L28 23.2 23 19l6.6-.8Z" fill="#fff" opacity=".95"/>
  </svg>`;
}
