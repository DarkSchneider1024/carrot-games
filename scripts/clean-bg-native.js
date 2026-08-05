import fs from 'fs';

const srcPath = "C:\\Users\\gueiw\\.gemini\\antigravity-ide\\brain\\6cd12da8-d0f3-460e-9425-88cc13bbc18e\\asset_goal_trophy_clean_1785893158416.png";
const destPath = "c:\\GitRoot\\CarrotStudio\\carrot-games\\public\\assets\\images\\asset_goal_castle.png";

fs.copyFileSync(srcPath, destPath);
console.log('Copied trophy image to destPath successfully!');
