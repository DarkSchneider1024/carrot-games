import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '../../godot/Bomberman/build/web');
const destDir = path.resolve(__dirname, '../public/games/bomberman');

if (fs.existsSync(srcDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log('✅ Bomberman Web build successfully synced to Carrot Games public folder!');
} else {
  console.warn('⚠️ Bomberman build directory not found at:', srcDir);
}
