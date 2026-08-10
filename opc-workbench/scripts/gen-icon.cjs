// Generate a 256x256 ICO file using pure Node.js (no dependencies)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(width, height, r, g, b) {
  // PNG signature
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;   // bit depth
  ihdrData[9] = 2;   // color type: RGB
  ihdrData[10] = 0;  // compression
  ihdrData[11] = 0;  // filter
  ihdrData[12] = 0;  // interlace

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcInput = Buffer.concat([typeBuf, data]);
    const crc = require('crypto').createHash('crc3279502701');
    // Actually, let's use a simpler approach for CRC
    return Buffer.concat([lenBuf, typeBuf, data, Buffer.alloc(4)]);
  }

  // Simple CRC32 implementation
  function crc32(buf) {
    let table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        if (c & 1) c = 0xEDB88320 ^ (c >>> 1);
        else c = c >>> 1;
      }
      table[n] = c >>> 0;
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function makeChunkProper(typeStr, data) {
    const typeBuf = Buffer.from(typeStr, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  const ihdr = makeChunkProper('IHDR', ihdrData);

  // IDAT - raw pixel data
  const rowSize = 1 + width * 3; // filter byte + RGB
  const rawData = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const offset = y * rowSize;
    rawData[offset] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const px = offset + 1 + x * 3;
      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
    }
  }
  const compressed = zlib.deflateSync(rawData);
  const idat = makeChunkProper('IDAT', compressed);

  // IEND
  const iend = makeChunkProper('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Create a 256x256 blue icon
const png = createPNG(256, 256, 41, 128, 245);

// ICO header (6 bytes): reserved(2) + type(2, ICO=1) + count(2)
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // type: ICO
icoHeader.writeUInt16LE(1, 4); // image count: 1

// Directory entry (16 bytes)
const dirEntry = Buffer.alloc(16);
dirEntry[0] = 0;   // width (0 = 256)
dirEntry[1] = 0;   // height (0 = 256)
dirEntry[2] = 0;   // color count
dirEntry[3] = 0;   // reserved
dirEntry.writeUInt16LE(1, 4);   // planes
dirEntry.writeUInt16LE(32, 6);   // bit depth
dirEntry.writeUInt32LE(png.length, 8);  // bytes in res
dirEntry.writeUInt32LE(22, 12);  // offset (6 + 16 = 22)

const ico = Buffer.concat([icoHeader, dirEntry, png]);

const outDir = path.join(__dirname, '..', 'build');
const icoPath = path.join(outDir, 'icon.ico');
const pngPath = path.join(outDir, 'icon.png');

try {
  // Try to write directly
  fs.writeFileSync(icoPath, ico);
  fs.writeFileSync(pngPath, png);
  console.log(`Created ${icoPath}: ${ico.length} bytes`);
  console.log(`Created ${pngPath}: ${png.length} bytes`);
} catch (e) {
  // Fallback: write to workspace temp
  const tmpIco = path.join(__dirname, '..', '_icon_tmp.ico');
  const tmpPng = path.join(__dirname, '..', '_icon_tmp.png');
  fs.writeFileSync(tmpIco, ico);
  fs.writeFileSync(tmpPng, png);
  console.log(`Created ${tmpIco}: ${ico.length} bytes`);
  console.log(`Created ${tmpPng}: ${png.length} bytes`);
  console.log('NOTE: Could not write to build/ directly. Copy manually:');
  console.log(`  Copy-Item _icon_tmp.ico build/icon.ico`);
  console.log(`  Copy-Item _icon_tmp.png build/icon.png`);
}
