import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  console.log('Generating PWA icons...');
  
  // 192x192 standard icon
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/pwa-192x192.png');
  console.log('Generated public/pwa-192x192.png');

  // 512x512 standard icon
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/pwa-512x512.png');
  console.log('Generated public/pwa-512x512.png');

  // 180x180 Apple touch icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('Generated public/apple-touch-icon.png');

  // 512x512 Maskable icon (safe zone padding: outer bleed with emerald background)
  // For maskable icon, keep content in center 80% circle (padding ~50px on 512px canvas)
  const innerResized = await sharp(svgBuffer)
    .resize(410, 410)
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 5, g: 150, b: 105, alpha: 1 } // #059669
    }
  })
    .composite([{ input: innerResized, gravity: 'center' }])
    .png()
    .toFile('public/pwa-maskable-512x512.png');
  console.log('Generated public/pwa-maskable-512x512.png');

  // 48x48 Favicon PNG
  await sharp(svgBuffer)
    .resize(48, 48)
    .png()
    .toFile('public/favicon.ico');
  console.log('Generated public/favicon.ico');

  console.log('All icons generated successfully!');
}

generate().catch(console.error);
