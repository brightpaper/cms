import Image from "next/image";

import { cn } from "@/lib/utils";

interface BrandLogoProps {
  readonly className?: string;
  /** Renders at higher priority in the sidebar, where it is above the fold. */
  readonly priority?: boolean;
}

/**
 * The Bright Paper logo, from `public/bright.jpeg`.
 *
 * Two things about that file need handling, both measured rather than guessed:
 *
 * 1. **It is 75.6% blank.** The artwork occupies only a 909x247 box at offset
 *    (209, 164) inside a 1280x720 image. Rendering it as-is would show a
 *    postage stamp floating in white space, so the surrounding margin is
 *    cropped away with the percentages below.
 *
 * 2. **It is a JPEG, so it has no transparency** — the artwork sits on solid
 *    white, which would appear as a white slab against the tinted sidebar.
 *    `mix-blend-multiply` maps that white onto whatever is behind it while
 *    leaving the orange and green untouched.
 *
 * The blend mode assumes a light background. That holds everywhere the logo is
 * used today; on a dark surface the white would need a transparent PNG instead.
 */
export function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <span
      className={cn(
        "relative block overflow-hidden",
        // 909 / 247, the aspect ratio of the artwork itself, not the file.
        "aspect-[909/247]",
        className,
      )}
    >
      <Image
        src="/bright.jpeg"
        alt="Bright Paper"
        width={1280}
        height={720}
        priority={priority}
        unoptimized
        className="absolute max-w-none mix-blend-multiply"
        style={{
          // Scale the full image so its content box fills this element, then
          // shift the unwanted margin out of view.
          width: `${(1280 / 909) * 100}%`,
          height: `${(720 / 247) * 100}%`,
          left: `${(-209 / 909) * 100}%`,
          top: `${(-164 / 247) * 100}%`,
        }}
      />
    </span>
  );
}
