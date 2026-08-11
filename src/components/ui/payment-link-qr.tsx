"use client";

import { QRCodeSVG } from "qrcode.react";

/** Renders a scannable QR code for a checkout URL. */
export function PaymentLinkQr({ url, size = 168 }: { url: string; size?: number }) {
  return (
    <QRCodeSVG
      value={url}
      size={size}
      bgColor="#ffffff"
      fgColor="#000000"
      level="M"
      marginSize={2}
    />
  );
}
