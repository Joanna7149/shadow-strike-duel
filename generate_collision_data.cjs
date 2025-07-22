// Node.js + canvas 自動產生每張 PNG 的最小包圍矩形 (hurtBox)
// 用法：node generate_collision_data.js <角色動畫資料夾> <輸出json路徑>

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

async function getHurtBoxFromPng(pngPath) {
  const img = await loadImage(pngPath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let found = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 0) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return null;
  // 以左下角為基準
  return {
    x: minX,
    y: height - maxY - 1,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

async function main() {
  const [,, animDir, outJson] = process.argv;
  if (!animDir || !outJson) {
    console.log('用法: node generate_collision_data.js <角色動畫資料夾> <輸出json路徑>');
    process.exit(1);
  }
  const actions = fs.readdirSync(animDir).filter(f => fs.statSync(path.join(animDir, f)).isDirectory());
  const result = {};
  for (const action of actions) {
    const actionDir = path.join(animDir, action);
    const frames = fs.readdirSync(actionDir).filter(f => f.endsWith('.png'));
    result[action] = {};
    for (const frameFile of frames) {
      const frameNum = path.basename(frameFile, '.png');
      const pngPath = path.join(actionDir, frameFile);
      const hurtBox = await getHurtBoxFromPng(pngPath);
      if (hurtBox) {
        result[action][frameNum] = { hurtBox: [hurtBox] };
      }
    }
  }
  fs.writeFileSync(outJson, JSON.stringify(result, null, 2));
  console.log('已產生:', outJson);
}

main(); 