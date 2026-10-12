const W = 630;
const H = 880; // пропорции карточки 63:88, как у HoloCard

let texture = null;

/**
 * Единая нейтральная текстура для всех карточек: тёмный фон со свечением и кольцами.
 * Цвет типа покемона накладывается поверх обычным CSS (плавно меняется), а арт — обычным <img>,
 * поэтому текстуру не нужно перерисовывать для каждого покемона, и смена эволюции идёт без рывков.
 */
export function getCardTexture() {
  if (texture) return texture;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, W * 0.8, H);
  bg.addColorStop(0, "#161a2b");
  bg.addColorStop(0.55, "#0b0d15");
  bg.addColorStop(1, "#141726");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, 300, 0, W / 2, 300, 340);
  glow.addColorStop(0, "rgba(120, 140, 220, .32)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
  ctx.lineWidth = 2;
  for (const r of [190, 250, 310]) {
    ctx.beginPath();
    ctx.arc(W / 2, 310, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  texture = canvas.toDataURL("image/jpeg", 0.9);
  return texture;
}
