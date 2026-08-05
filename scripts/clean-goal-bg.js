import fs from 'fs';
import { PNG } from 'pngjs';

const filePath = 'public/assets/images/asset_goal_castle.png';

fs.createReadStream(filePath)
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = (this.width * y + x) << 2;
        const r = this.data[idx];
        const g = this.data[idx + 1];
        const b = this.data[idx + 2];
        
        // Remove white/near-white outer background
        if (r > 240 && g > 240 && b > 240) {
          this.data[idx + 3] = 0;
        }
      }
    }
    this.pack().pipe(fs.createWriteStream(filePath));
    console.log('Successfully made asset_goal_castle.png transparent!');
  });
