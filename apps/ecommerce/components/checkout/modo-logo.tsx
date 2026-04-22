import Image from "next/image";

type ModoLogoProps = {
  className?: string;
  alt?: string;
};

const LOGO_SRC = "/1200x0.webp";

export function ModoLogo({ className, alt = "MODO" }: ModoLogoProps) {
  return (
    <Image
      src={LOGO_SRC}
      alt={alt}
      width={1200}
      height={280}
      className={className ?? "h-8 w-auto"}
      priority={false}
    />
  );
}
