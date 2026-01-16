/**
 * Advanced Color Detection Utility
 * Uses K-Means Clustering (Unsupervised ML) to robustly identify
 * temperature sticker colors under varying lighting conditions.
 */

// Color thresholds for sticker detection - Gaps closed for better detection
const COLOR_RANGES = {
  green: { hueMin: 75, hueMax: 170 },
  yellow: { hueMin: 30, hueMax: 75 },
  red: { hueMin: 0, hueMax: 30, hueMin2: 330, hueMax2: 360 }
}

/**
 * Convert RGB to HSV
 */
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const diff = max - min;
  
  let h = 0, s = max === 0 ? 0 : diff / max, v = max;
  
  if (diff !== 0) {
    switch (max) {
      case r: h = 60 * (((g - b) / diff) % 6); break;
      case g: h = 60 * ((b - r) / diff + 2); break;
      case b: h = 60 * ((r - g) / diff + 4); break;
    }
  }
  if (h < 0) h += 360;
  return { h, s: s * 100, v: v * 100 };
}

/**
 * Classify a standard HSV value into Green/Yellow/Red
 */
function classifyHsv(hsv) {
  // Lower threshold to catch darker/duller stickers in bad light
  if (hsv.s < 15 || hsv.v < 15) return 'unknown';

  if (hsv.h >= COLOR_RANGES.green.hueMin && hsv.h <= COLOR_RANGES.green.hueMax) {
    return 'green';
  }
  if (hsv.h >= COLOR_RANGES.yellow.hueMin && hsv.h <= COLOR_RANGES.yellow.hueMax) {
    return 'yellow';
  }
  if ((hsv.h >= COLOR_RANGES.red.hueMin && hsv.h <= COLOR_RANGES.red.hueMax) ||
      (hsv.h >= COLOR_RANGES.red.hueMin2 && hsv.h <= COLOR_RANGES.red.hueMax2)) {
    return 'red';
  }
  return 'unknown';
}

/**
 * K-Means Clustering Implementation
 */
function runKMeans(pixels, k = 5, maxIterations = 5) {
  if (pixels.length === 0) return [];

  // 1. Initialize centroids randomly
  let centroids = [];
  for (let i = 0; i < k; i++) {
    centroids.push({ ...pixels[Math.floor(Math.random() * pixels.length)] });
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    const clusters = Array(k).fill().map(() => []);
    
    // 2. Assign pixels to nearest centroid
    pixels.forEach(p => {
      let minDist = Infinity;
      let clusterIdx = 0;
      centroids.forEach((c, idx) => {
        const dist = Math.sqrt(Math.pow(p.r - c.r, 2) + Math.pow(p.g - c.g, 2) + Math.pow(p.b - c.b, 2));
        if (dist < minDist) {
          minDist = dist;
          clusterIdx = idx;
        }
      });
      clusters[clusterIdx].push(p);
    });

    // 3. Recalculate centroids
    centroids = clusters.map((cluster, i) => {
      if (cluster.length === 0) return centroids[i]; // Keep old if empty
      const sum = cluster.reduce((acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b }), { r: 0, g: 0, b: 0 });
      return {
        r: Math.round(sum.r / cluster.length),
        g: Math.round(sum.g / cluster.length),
        b: Math.round(sum.b / cluster.length),
        count: cluster.length
      };
    });
  }
  return centroids;
}

/**
 * Analyze image data using Machine Learning (K-Means)
 */
export function analyzeImageData(imageData) {
  const { data, width, height } = imageData;
  
  // 1. Sample pixels from the center area (most relevant)
  const samples = [];
  const sampleCount = 4000; // Increased sampling
  const centerX = width / 2;
  const centerY = height / 2;
  const regionSize = Math.min(width, height) * 0.5; // 50% center crop (Expanded area)
  
  for (let i = 0; i < sampleCount; i++) {
    const x = Math.floor(centerX - regionSize/2 + Math.random() * regionSize);
    const y = Math.floor(centerY - regionSize/2 + Math.random() * regionSize);
    
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = (y * width + x) * 4;
      samples.push({ r: data[idx], g: data[idx+1], b: data[idx+2] });
    }
  }

  // 2. Run K-Means Clustering
  // K=5 to better separate noise
  const centroids = runKMeans(samples, 5);

  // 3. Score centroids to find the thermal sticker
  // We look for a cluster that:
  // - Is NOT grayscale (Saturation > threshold)
  // - Matches our target hues
  // - Has significant presence
  
  let bestCandidate = null;
  let highestScore = -1;

  centroids.forEach(c => {
    const hsv = rgbToHsv(c.r, c.g, c.b);
    const colorName = classifyHsv(hsv);
    
    if (colorName !== 'unknown') {
      // Score = Saturation * (Cluster Size / Sample Size)
      // Encourages vivid colors that occupy space
      const score = hsv.s * (c.count / samples.length);
      
      if (score > highestScore) {
        highestScore = score;
        bestCandidate = {
          color: colorName,
          confidence: Math.min(100, Math.round((c.count / samples.length) * 200)), // Scale up for confidence
          avgRgb: { r: c.r, g: c.g, b: c.b }
        };
      }
    }
  });

  if (bestCandidate) {
    return bestCandidate;
  }

  // Fallback if no specific color found (return unknown but valid structure)
  return {
    color: 'unknown',
    confidence: 0,
    avgRgb: { r: 128, g: 128, b: 128 }
  };
}

/**
 * Capture frame and analyze
 */
export function analyzeVideoFrame(videoElement) {
  const canvas = document.createElement('canvas')
  // Reduce resolution for speed
  canvas.width = 300 // Fixed small width for processing
  const aspect = videoElement.videoHeight / videoElement.videoWidth
  canvas.height = canvas.width * aspect || 300
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return analyzeImageData(imageData)
}

/**
 * Get color display info
 */
export function getColorInfo(color) {
  switch (color) {
    case 'green':
      return {
        emoji: '🟢',
        label: 'Green (Safe)',
        status: 'SAFE',
        message: 'Temperature sticker indicates safe storage conditions.',
        className: 'safe'
      }
    case 'yellow':
      return {
        emoji: '🟡',
        label: 'Yellow (Warning)',
        status: 'WARNING',
        message: 'Temperature sticker shows elevated exposure. Monitor closely.',
        className: 'warning'
      }
    case 'red':
      return {
        emoji: '🔴',
        label: 'Red (Danger)',
        status: 'INVALIDATED',
        message: 'Temperature sticker indicates heat damage. Batch will be invalidated.',
        className: 'danger'
      }
    default:
      return {
        emoji: '⚪',
        label: 'Unknown',
        status: 'UNKNOWN',
        message: 'Could not detect sticker color.',
        className: ''
      }
  }
}

