const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const boboSrc = 'C:/GitRoot/CarrotStudio/ai-vtuber/public/showcase/bobo_v3.png';
const outDir = 'C:/GitRoot/CarrotStudio/carrot-games/public/assets/images';

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 512px;
    height: 512px;
    overflow: hidden;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .app-icon {
    width: 496px;
    height: 496px;
    border-radius: 110px;
    background: radial-gradient(circle at 50% 35%, #252e42 0%, #0d131f 100%);
    border: 14px solid #ea580c;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), inset 0 0 40px rgba(234, 88, 12, 0.35);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .inner-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 50%, rgba(251, 146, 60, 0.25) 0%, transparent 70%);
    pointer-events: none;
  }
  .bobo-img {
    height: 430px;
    object-fit: contain;
    z-index: 2;
    filter: drop-shadow(0 15px 25px rgba(0,0,0,0.7));
    transform: translateY(8px);
  }
</style>
</head>
<body>
  <div class="app-icon">
    <div class="inner-glow"></div>
    <img class="bobo-img" src="file:///${boboSrc}" />
  </div>
</body>
</html>`;

const tmpHtml = path.resolve(__dirname, 'bobo_logo.html');
fs.writeFileSync(tmpHtml, html, 'utf8');

const targetFiles = [
  path.join(outDir, 'logo_carrot.png'),
  path.join(outDir, 'icon_192.png'),
  path.join(outDir, 'icon_512.png')
];

for (const target of targetFiles) {
  console.log('Rendering to', target);
  execSync(`"${edgePath}" --headless --disable-gpu --default-background-color=00000000 --window-size=512,512 --screenshot="${target}" "file:///${tmpHtml.replace(/\\/g, '/')}"`);
}

fs.unlinkSync(tmpHtml);
console.log('Bobo logo successfully generated!');

