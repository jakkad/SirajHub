const CANVAS_WIDTH = 128;
const CANVAS_HEIGHT = 1024;
const TITLE_START_Y = CANVAS_HEIGHT - 92;
const TITLE_MAX_LENGTH = CANVAS_HEIGHT - 190;
const RTL_SCRIPT = /[\u0590-\u08ff\ufb1d-\ufefc]/;

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function channelLuminance(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hexColor: string) {
  const value = Number.parseInt(hexColor.replace("#", ""), 16);
  const red = channelLuminance((value >> 16) & 255);
  const green = channelLuminance((value >> 8) & 255);
  const blue = channelLuminance(value & 255);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function fitSpineTitle(context: CanvasRenderingContext2D, title: string, rtl: boolean) {
  const fontFamily = rtl
    ? '"Noto Naskh Arabic", "Geeza Pro", Georgia, serif'
    : 'Georgia, "Times New Roman", serif';
  const normalized = title.replace(/\s+/g, " ").trim() || "Untitled";
  let fontSize = 62;

  while (fontSize > 38) {
    context.font = `700 ${fontSize}px ${fontFamily}`;
    if (context.measureText(normalized).width <= TITLE_MAX_LENGTH) return { text: normalized, fontSize, fontFamily };
    fontSize -= 2;
  }

  context.font = `700 ${fontSize}px ${fontFamily}`;
  const characters = Array.from(normalized);
  while (characters.length > 1 && context.measureText(`${characters.join("")}…`).width > TITLE_MAX_LENGTH) {
    characters.pop();
  }
  return { text: `${characters.join("")}…`, fontSize, fontFamily };
}

export function createSpineTextureCanvas(title: string, baseHex: string, seed: number) {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create a book-spine texture");

  const luminance = relativeLuminance(baseHex);
  const ink = luminance > 0.48 ? "#211e19" : "#f8f0dc";
  const accent = luminance > 0.48 ? "#a9432c" : "#ddb25d";
  const random = seededRandom(seed);

  context.fillStyle = baseHex;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const edgeShade = context.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
  edgeShade.addColorStop(0, "rgba(20, 14, 9, 0.20)");
  edgeShade.addColorStop(0.12, "rgba(20, 14, 9, 0.03)");
  edgeShade.addColorStop(0.86, "rgba(255, 247, 225, 0.03)");
  edgeShade.addColorStop(1, "rgba(20, 14, 9, 0.18)");
  context.fillStyle = edgeShade;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  for (let index = 0; index < 1800; index += 1) {
    const lightFiber = random() > 0.48;
    context.fillStyle = lightFiber ? "rgba(255,255,255,0.045)" : "rgba(20,14,9,0.04)";
    context.fillRect(Math.floor(random() * CANVAS_WIDTH), Math.floor(random() * CANVAS_HEIGHT), random() > 0.8 ? 2 : 1, random() > 0.7 ? 2 : 1);
  }

  context.fillStyle = accent;
  context.fillRect(18, 56, 5, CANVAS_HEIGHT - 112);
  context.fillStyle = luminance > 0.48 ? "rgba(255,255,255,0.26)" : "rgba(255,238,190,0.22)";
  context.fillRect(23, 56, 1, CANVAS_HEIGHT - 112);

  const rtl = RTL_SCRIPT.test(title);
  const fitted = fitSpineTitle(context, title, rtl);
  context.save();
  context.translate(CANVAS_WIDTH * 0.64, TITLE_START_Y);
  context.rotate(-Math.PI / 2);
  context.direction = rtl ? "rtl" : "ltr";
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.font = `700 ${fitted.fontSize}px ${fitted.fontFamily}`;
  context.fillStyle = ink;
  context.shadowColor = luminance > 0.48 ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.22)";
  context.shadowBlur = 1.5;
  context.shadowOffsetX = 1;
  context.fillText(fitted.text, 0, 0);
  context.restore();

  return canvas;
}
