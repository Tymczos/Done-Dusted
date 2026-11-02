import { SceneryArtwork } from "../src/components/scenery/SceneryArtwork";
import { sceneSpec, sceneryPacks } from "../src/theme/scenes";
import { periods } from "../src/theme/preferences";
import { semanticColors } from "../src/theme/palettes";
export function Sheet() {
  const c = semanticColors("lavender", false);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1270">
      <rect width="1280" height="1270" fill={c.background} />
      <text x="28" y="38" fontSize="22" fontFamily="Inter" fill={c.text}>
        Done &amp; Dusted · Lavender Mist scenery artwork
      </text>
      <text x="28" y="65" fontSize="13" fontFamily="Inter" fill={c.muted}>
        Rendered from the native artwork components via SVG primitives. This is
        not a native app screenshot.
      </text>
      {periods.map((period, i) => (
        <text
          key={period}
          x={28 + i * 312}
          y="96"
          fontFamily="Inter"
          fontSize="15"
          fill={c.text}
        >
          {period[0]!.toUpperCase() + period.slice(1)}
        </text>
      ))}
      {sceneryPacks.map((pack, row) => (
        <g key={pack.id} transform={`translate(0,${112 + row * 230})`}>
          {periods.map((period, column) => (
            <svg
              key={period}
              x={28 + column * 312}
              y="0"
              width="290"
              height="174"
              viewBox="0 0 400 240"
            >
              <SceneryArtwork spec={sceneSpec("lavender", period, pack.id)} />
            </svg>
          ))}
          <text x="28" y="202" fontFamily="Inter" fontSize="15" fill={c.text}>
            {pack.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
