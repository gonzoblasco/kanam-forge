/**
 * KanamLogo - brand mark for Kanam Forge.
 *
 * A stylized leaf that also reads as a flame/forge spark: growth (Kanam's
 * identity) fused with the act of forging. Not the raw emoji - an evolution
 * of it, drawn as a single continuous stroke.
 */
export function KanamLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Leaf body: a teardrop that tapers to a stem, with a central vein */}
      <path
        d="M12 21.5C12 21.5 4.5 16.5 4.5 10.5C4.5 6.5 7.5 3.5 12 2.5C16.5 3.5 19.5 6.5 19.5 10.5C19.5 16.5 12 21.5 12 21.5Z"
        className="fill-primary/15 stroke-primary"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Central vein */}
      <path
        d="M12 3.5V20.5"
        className="stroke-primary"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Side veins - left */}
      <path
        d="M12 7.5C10.5 8.5 9 9.5 8 11"
        className="stroke-primary"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M12 11.5C10.5 12.5 9.5 13.5 8.8 15"
        className="stroke-primary"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Side veins - right */}
      <path
        d="M12 7.5C13.5 8.5 15 9.5 16 11"
        className="stroke-primary"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M12 11.5C13.5 12.5 14.5 13.5 15.2 15"
        className="stroke-primary"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Stem */}
      <path
        d="M12 20.5C12 20.5 12.5 22 13 22.5"
        className="stroke-primary"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
