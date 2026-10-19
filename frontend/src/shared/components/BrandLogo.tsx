interface BrandLogoProps {
  /** Rendered height of the mark in px; the wordmark scales with it. */
  height?: number;
  className?: string;
}

/**
 * CSV Pipeline lockup: a table mark (header row plus data rows) next to the wordmark.
 * Color comes from the parent via `currentColor`; the header row uses the accent token.
 */
export function BrandLogo({ height = 28, className }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <svg
        width={height}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x="2.75"
          y="2.75"
          width="18.5"
          height="18.5"
          rx="4.25"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M7 8.5h10"
          className="text-accent-light"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M7 12.75h10M7 16.5h6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-semibold tracking-tight" style={{ fontSize: Math.round(height * 0.7) }}>
        CSV Pipeline
      </span>
    </span>
  );
}
