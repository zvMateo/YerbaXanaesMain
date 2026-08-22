type BrandSealProps = {
  size?: number;
  className?: string;
};

/** Existing circular seal (recolored PNG). object-contain so the greek-key is not cropped. */
export function BrandSeal({ size = 40, className }: BrandSealProps) {
  return (
    <img
      src="/brand/logo.png"
      alt="Yerba Xanaes"
      width={size}
      height={size}
      className={`object-contain ${className ?? ""}`}
      style={{ width: size, height: size }}
    />
  );
}
