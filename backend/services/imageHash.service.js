const sharp = require('sharp');

const HASH_SIDE = 8;
const SAMPLE_SIDE = 32;

function dctCoefficient(pixels, u, v) {
  let sum = 0;
  for (let x = 0; x < SAMPLE_SIDE; x += 1) {
    for (let y = 0; y < SAMPLE_SIDE; y += 1) {
      sum += pixels[x * SAMPLE_SIDE + y]
        * Math.cos(((2 * x + 1) * u * Math.PI) / (2 * SAMPLE_SIDE))
        * Math.cos(((2 * y + 1) * v * Math.PI) / (2 * SAMPLE_SIDE));
    }
  }
  const scale = (u === 0 ? Math.sqrt(1 / SAMPLE_SIDE) : Math.sqrt(2 / SAMPLE_SIDE))
    * (v === 0 ? Math.sqrt(1 / SAMPLE_SIDE) : Math.sqrt(2 / SAMPLE_SIDE));
  return scale * sum;
}

/**
 * Generates a standard DCT-based 64-bit perceptual hash.  The hash is a
 * 16-character lowercase hex string and is based on image content, not a URL.
 */
async function createPerceptualHash(imageBuffer) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new Error('An image buffer is required to calculate a perceptual hash.');
  }

  let pixels;
  try {
    ({ data: pixels } = await sharp(imageBuffer, { animated: false })
      .resize(SAMPLE_SIDE, SAMPLE_SIDE, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true }));
  } catch (error) {
    throw new Error(`Unable to process image: ${error.message}`);
  }

  const coefficients = [];
  for (let u = 0; u < HASH_SIDE; u += 1) {
    for (let v = 0; v < HASH_SIDE; v += 1) {
      coefficients.push(dctCoefficient(pixels, u, v));
    }
  }
  const medianSource = coefficients.slice(1).sort((a, b) => a - b);
  const median = medianSource[Math.floor(medianSource.length / 2)];
  const bits = coefficients.map((coefficient) => (coefficient >= median ? '1' : '0')).join('');
  return BigInt(`0b${bits}`).toString(16).padStart(16, '0');
}

function isValidPerceptualHash(value) {
  return typeof value === 'string' && /^[0-9a-f]{16}$/i.test(value);
}

function hammingDistance(firstHash, secondHash) {
  if (!isValidPerceptualHash(firstHash) || !isValidPerceptualHash(secondHash)) {
    return null;
  }
  let difference = BigInt(`0x${firstHash}`) ^ BigInt(`0x${secondHash}`);
  let count = 0;
  while (difference > 0n) {
    count += Number(difference & 1n);
    difference >>= 1n;
  }
  return count;
}

function visualSimilarity(firstHash, secondHash) {
  const distance = hammingDistance(firstHash, secondHash);
  return distance === null ? { distance: null, score: null } : { distance, score: (64 - distance) / 64 };
}

module.exports = { createPerceptualHash, hammingDistance, isValidPerceptualHash, visualSimilarity };
