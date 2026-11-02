import { useId } from "react";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
} from "react-native-svg";
import type { SceneSpec } from "../../theme/scenes";
import type { ScenePalette } from "../../theme/palettes";
/** Original, locally rendered artwork; no downloaded scene assets or remote URLs. */
export function SceneryArtwork({
  spec,
  sky = true,
  celestial = true,
  stars = true,
}: {
  spec: SceneSpec;
  sky?: boolean;
  celestial?: boolean;
  stars?: boolean;
}) {
  const c = spec.palette;
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const skyId = `sky-${id}`,
    ribbonId = `ribbon-${id}`;
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      accessible={false}
    >
      <Defs>
        <LinearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.top} />
          <Stop offset="1" stopColor={c.bottom} />
        </LinearGradient>
        <LinearGradient id={ribbonId} x1="0" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor={c.aurora} stopOpacity="0.1" />
          <Stop offset="0.55" stopColor={c.highlight} stopOpacity="0.75" />
          <Stop offset="1" stopColor={c.aurora} stopOpacity="0.05" />
        </LinearGradient>
      </Defs>
      {sky && <Rect width="400" height="240" fill={`url(#${skyId})`} />}
      {stars && spec.period === "night" && <StarField color={c.star} />}
      {celestial && <Celestial spec={spec} />}
      {spec.pack === "mountains" && <Mountains c={c} />}
      {spec.pack === "aurora" && <Aurora c={c} ribbonId={ribbonId} />}
      {spec.pack === "shepherd" && <Pasture c={c} />}
      {spec.pack === "mediterranean" && <Coast c={c} />}
      {spec.pack === "whale" && <Ocean c={c} />}
    </Svg>
  );
}
export function StarField({ color }: { color: string }) {
  return (
    <G fill={color}>
      {[
        [30, 32],
        [78, 67],
        [112, 23],
        [164, 52],
        [211, 22],
        [252, 72],
        [290, 39],
        [344, 24],
        [373, 84],
        [48, 104],
        [196, 96],
        [320, 105],
      ].map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.8 : 1} />
      ))}
    </G>
  );
}
export function Celestial({ spec }: { spec: SceneSpec }) {
  const c = spec.palette;
  return spec.period === "night" ? (
    <G>
      <Circle cx="320" cy="49" r="20" fill={c.sun} />
      <Circle cx="329" cy="42" r="18" fill={c.top} />
    </G>
  ) : (
    <G>
      <Circle
        cx={
          spec.period === "morning"
            ? 88
            : spec.period === "afternoon"
              ? 286
              : 316
        }
        cy={spec.period === "evening" ? 115 : 70}
        r="36"
        fill={c.sun}
        opacity="0.12"
      />
      <Circle
        cx={
          spec.period === "morning"
            ? 88
            : spec.period === "afternoon"
              ? 286
              : 316
        }
        cy={spec.period === "evening" ? 115 : 70}
        r="24"
        fill={c.sun}
      />
    </G>
  );
}
function Mountains({ c }: { c: ScenePalette }) {
  return (
    <G>
      <Path
        d="M-20 176L78 66L147 149L235 55L340 168L410 101V240H-20Z"
        fill={c.far}
      />
      <Path d="M0 200L98 122L175 190L273 104L400 197V240H0Z" fill={c.middle} />
      <Path d="M0 210Q90 174 194 204T400 180V240H0Z" fill={c.near} />
      <Path d="M0 224Q120 202 220 223T400 214V240H0Z" fill={c.water} />
      <Path
        d="M118 230Q200 218 284 231"
        fill="none"
        stroke={c.highlight}
        strokeWidth="2"
        opacity="0.4"
      />
    </G>
  );
}
function Aurora({ c, ribbonId }: { c: ScenePalette; ribbonId: string }) {
  return (
    <G>
      <Path
        d="M-20 34Q80 138 173 36T420 64L420 134Q291 40 204 103T-20 104Z"
        fill={`url(#${ribbonId})`}
      />
      <Path
        d="M-20 68Q100 171 221 55T420 93"
        fill="none"
        stroke={c.aurora}
        strokeWidth="8"
        opacity="0.5"
      />
      <Path d="M0 184Q90 133 200 179T400 157V240H0Z" fill={c.far} />
      <Path d="M0 211Q120 156 250 199T400 181V240H0Z" fill={c.middle} />
      {[15, 50, 82, 315, 350, 384].map((x, i) => (
        <G key={x} transform={`translate(${x},${160 + (i % 2) * 16})`}>
          <Path d="M0 -34L-14 0H-9L-20 20H20L9 0H14Z" fill={c.near} />
          <Rect x="-2" y="17" width="4" height="25" fill={c.near} />
        </G>
      ))}
      <Path d="M0 225Q200 207 400 222V240H0Z" fill={c.near} />
    </G>
  );
}
function Pasture({ c }: { c: ScenePalette }) {
  return (
    <G>
      <G fill={c.sun} opacity="0.45">
        <Ellipse cx="180" cy="57" rx="42" ry="9" />
        <Ellipse cx="211" cy="52" rx="23" ry="13" />
        <Ellipse cx="54" cy="99" rx="32" ry="8" />
      </G>
      <Path d="M0 167Q105 101 225 167T400 143V240H0Z" fill={c.far} />
      <Path d="M0 203Q160 122 400 195V240H0Z" fill={c.middle} />
      <Path d="M0 222Q210 173 400 219V240H0Z" fill={c.near} />
      {[
        [102, 190],
        [142, 181],
        [285, 213],
      ].map(([x, y], i) => (
        <G key={i} transform={`translate(${x},${y})`}>
          <Path d="M-9 8V16M3 8V16" stroke={c.near} strokeWidth="3" />
          <Ellipse rx="14" ry="9" fill={c.house} />
          <Circle cx="13" cy="-1" r="5" fill={c.near} />
        </G>
      ))}
      <Path
        d="M335 178V120M322 131H348M322 131L320 162M348 131L351 158"
        stroke={c.near}
        strokeWidth="3"
        fill="none"
      />
    </G>
  );
}
function Coast({ c }: { c: ScenePalette }) {
  return (
    <G>
      <Path d="M0 158Q75 120 158 158L245 240H0Z" fill={c.far} />
      <Path d="M0 175Q180 150 400 166V240H0Z" fill={c.water} />
      <Path d="M0 183Q83 154 154 203L204 240H0Z" fill={c.middle} />
      <Path d="M0 217Q55 180 123 226L139 240H0Z" fill={c.near} />
      {[
        [23, 133, 35],
        [65, 147, 38],
        [110, 167, 29],
      ].map(([x, y, w], i) => (
        <G key={i}>
          <Rect x={x} y={y} width={w} height="34" rx="2" fill={c.house} />
          <Polygon
            points={`${x! - 3},${y} ${x! + w! / 2},${y! - 14} ${x! + w! + 3},${y}`}
            fill={c.roof}
          />
          <Rect
            x={x! + w! / 2 - 4}
            y={y! + 15}
            width="8"
            height="19"
            rx="4"
            fill={c.near}
          />
          <Rect x={x! + 5} y={y! + 7} width="6" height="7" fill={c.water} />
        </G>
      ))}
      <Path
        d="M231 209Q275 202 327 209M282 189Q315 185 348 189"
        fill="none"
        stroke={c.highlight}
        strokeWidth="2"
        opacity="0.5"
      />
    </G>
  );
}
function Ocean({ c }: { c: ScenePalette }) {
  return (
    <G>
      <Path d="M0 156Q60 140 130 155T270 155T400 148V240H0Z" fill={c.far} />
      <Path d="M0 178Q80 157 160 177T320 173T400 181V240H0Z" fill={c.water} />
      <Path
        d="M109 190C128 164 185 159 224 181Q246 193 268 177L290 162L283 185L309 179Q295 204 263 205C216 234 134 225 109 201Z"
        fill={c.near}
      />
      <Circle cx="136" cy="192" r="2.5" fill={c.highlight} />
      <Path
        d="M127 203Q149 208 163 201M170 215Q177 197 201 201"
        fill="none"
        stroke={c.middle}
        strokeWidth="3"
      />
      <Path
        d="M139 162Q124 136 113 149M139 162Q145 130 156 145"
        fill="none"
        stroke={c.highlight}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <Path d="M0 225Q80 210 160 228T320 225T400 223V240H0Z" fill={c.middle} />
      <Path
        d="M23 202Q49 196 74 202M312 209Q348 200 383 208"
        stroke={c.highlight}
        strokeWidth="2"
        opacity="0.6"
        fill="none"
      />
    </G>
  );
}
