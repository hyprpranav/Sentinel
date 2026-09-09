declare module 'jsqr' {
  export interface Point {
    x: number;
    y: number;
  }

  export interface QRCodeResult {
    data: string;
    location?: {
      topRightCorner: Point;
      topLeftCorner: Point;
      bottomRightCorner: Point;
      bottomLeftCorner: Point;
    };
  }

  export default function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' }
  ): QRCodeResult | null;
}
