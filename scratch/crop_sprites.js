import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';

const CHARS = ['carrot', 'veggie', 'flute', 'fridge'];
const EMOTIONS = ['joy', 'angry', 'sad', 'happy'];
const baseDir = 'c:/GitRoot/CarrotStudio/carrot-games/public/assets/images/characters';

async function cropAll() {
  for (const char of CHARS) {
    const srcPath = path.join(baseDir, `char_${char}.png`);
    if (!fs.existsSync(srcPath)) continue;

    const img = await loadImage(srcPath);
    const halfW = Math.floor(img.width / 2);
    const halfH = Math.floor(img.height / 2);

    const offsets = [
      { name: 'joy', sx: 0, sy: 0 },
      { name: 'angry', sx: halfW, sy: 0 },
      { name: 'sad', sx: 0, sy: halfH },
      { name: 'happy', sx: halfW, sy: halfH }
    ];

    for (const off of offsets) {
      const canvas = createCanvas(halfW, halfH);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, off.sx, off.sy, halfW, halfH, 0, 0, halfW, halfH);

      const outPath = path.join(baseDir, `${char}_${off.name}.png`);
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(outPath, buffer);
      console.log(`Saved ${outPath}`);
    }
  }
}

cropAll().catch(console.error);
