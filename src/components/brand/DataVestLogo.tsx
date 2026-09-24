import dataVestMark from "@/assets/brand/datavest-mark.png";
import dataVestWordmark from "@/assets/brand/datavest-wordmark.png";

/**
 * Brand ink sampled from the supplied logo artwork, kept fixed so the tagline
 * always matches the wordmark artwork it sits under.
 */
const TAGLINE_INK = "#101819";
const TAGLINE = "INTERFACES-FIRST LAB PLATFORM";

/**
 * DataVest lockup.
 *
 * The wordmark + hexagon ship as a bitmap asset; the tagline is set as live
 * SVG text stretched with textLength to the exact width of that asset, so both
 * lines share the same left and right edge at every rendering size (expanded
 * sidebar, collapsed mark, splash, login).
 */
export function DataVestLogo({
  className = "",
  variant = "full",
}: {
  className?: string;
  variant?: "full" | "mark";
}) {
  if (variant === "mark") {
    return <img src={dataVestMark} alt="DataVest" className={className} />;
  }

  return (
    <span
      role="img"
      aria-label="DataVest — interfaces-first lab platform"
      className={`block ${className}`}
    >
      <img src={dataVestWordmark} alt="" className="block h-auto w-full" />
      <svg
        viewBox="0 0 424 19"
        className="block h-auto w-full"
        aria-hidden="true"
        focusable="false"
      >
        <text
          x="212"
          y="15"
          textAnchor="middle"
          textLength="424"
          lengthAdjust="spacing"
          fontFamily="Arial, Helvetica, 'Liberation Sans', sans-serif"
          fontSize="18"
          fontWeight="400"
          fill={TAGLINE_INK}
        >
          {TAGLINE}
        </text>
      </svg>
    </span>
  );
}
