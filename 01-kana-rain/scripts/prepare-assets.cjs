// Deterministic atlas extraction and web compression; original generated art is retained.
const sharp = require('sharp');
const path = require('node:path');
const root = path.join(__dirname, '..');
(async () => {
  for (const name of ['garden-source.png', 'spirit-atlas.png', 'water-atlas.png']) {
    const meta = await sharp(path.join(root, 'assets', name)).metadata();
    console.log(name, meta.width, meta.height, 'alpha:', meta.hasAlpha);
  }
  await sharp(path.join(root, 'assets/garden-source.png')).resize(1600).webp({quality: 82}).toFile(path.join(root, 'assets/garden.webp'));
  await sharp(path.join(root, 'assets/spirit-atlas.png')).resize(640).webp({quality: 90}).toFile(path.join(root, 'assets/spirit.webp'));
  const regions = { drop: [0, 0, 627, 784], 'drop-stained': [627, 0, 627, 784], splash: [0, 784, 627, 470], ripple: [627, 784, 627, 470] };
  for (const [name, [left, top, width, height]] of Object.entries(regions)) {
    await sharp(path.join(root, 'assets/water-atlas.png')).extract({left, top, width, height}).resize({width: 220}).webp({quality: 90}).toFile(path.join(root, `assets/${name}.webp`));
  }
  await sharp(path.join(root, 'assets/spirit-atlas.png')).extract({left:0,top:0,width:627,height:627}).resize(192,192).png().toFile(path.join(root,'assets/icon.png'));
})().catch(e => { console.error(e); process.exitCode=1; });
