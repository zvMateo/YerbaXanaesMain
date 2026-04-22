import Image from "next/image";

type MercadoPagoLogoProps = {
  variant?: "horizontal" | "icon";
  className?: string;
  alt?: string;
};

const LOGO_SRC =
  "/Logos%20Mercado%20Pago%202025--fb6f16c9/Logos%20Mercado%20Pago%202025/Uso%20digital%20-%20RGB/SVGs/MP_RGB_HANDSHAKE_color_horizontal.svg";

export function MercadoPagoLogo({
  variant = "horizontal",
  className,
  alt = "Mercado Pago",
}: MercadoPagoLogoProps) {
  if (variant === "icon") {
    return (
      <Image
        src={LOGO_SRC}
        alt={alt}
        width={80}
        height={32}
        className={className ?? "h-8 w-auto"}
      />
    );
  }

  return (
    <Image
      src={LOGO_SRC}
      alt={alt}
      width={164}
      height={66}
      className={className ?? "h-16 w-auto"}
      priority={false}
    />
  );
}
