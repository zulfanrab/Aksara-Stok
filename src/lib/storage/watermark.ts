/**
 * Membakar timestamp (tanggal, waktu, koordinat GPS) ke sudut kanan bawah gambar.
 * Hasilnya tertanam di piksel — tidak bisa dihapus dengan crop biasa.
 */

export interface WatermarkOptions {
  capturedAt: Date;
  coords?: GeolocationCoordinates | null;
}

function formatTimestamp(date: Date): string[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const line1 = `${pad(date.getDate())} ${months[date.getMonth()]} ${date.getFullYear()}  ${pad(date.getHours())}:${pad(date.getMinutes())} WIB`;
  return [line1];
}

/**
 * Membakar watermark timestamp ke canvas setelah gambar digambar.
 * Dipanggil tepat sebelum canvas.toBlob().
 */
export function burnWatermark(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  options: WatermarkOptions
): void {
  const lines = formatTimestamp(options.capturedAt);

  if (options.coords) {
    const lat = options.coords.latitude.toFixed(5);
    const lng = options.coords.longitude.toFixed(5);
    lines.push(`${lat}, ${lng}`);
  }

  // Skala font relatif ke lebar gambar — terlihat kecil tapi masih terbaca
  const fontSize = Math.max(14, Math.round(canvasWidth * 0.022));
  const lineHeight = fontSize * 1.4;
  const paddingX = Math.round(canvasWidth * 0.015);
  const paddingY = Math.round(canvasHeight * 0.015);
  const innerPad = Math.round(fontSize * 0.45);

  ctx.font = `600 ${fontSize}px 'Courier New', Courier, monospace`;
  ctx.textBaseline = "middle";

  // Hitung lebar teks terpanjang
  const maxTextWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const blockW = maxTextWidth + innerPad * 2;
  const blockH = lines.length * lineHeight + innerPad * 2;
  const blockX = canvasWidth - blockW - paddingX;
  const blockY = canvasHeight - blockH - paddingY;

  // Background gelap transparan
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.beginPath();
  const r = Math.round(fontSize * 0.35);
  ctx.roundRect(blockX, blockY, blockW, blockH, r);
  ctx.fill();

  // Teks putih
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  lines.forEach((line, i) => {
    const textX = blockX + innerPad;
    const textY = blockY + innerPad + lineHeight * i + lineHeight / 2;
    ctx.fillText(line, textX, textY);
  });
}
