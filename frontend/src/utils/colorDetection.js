/**
 * Color Detection Utility
 * Analyzes an image to detect the dominant color of a temperature sticker
 * Uses RGB/HSV color space analysis
 */

// Color thresholds for sticker detection
const COLOR_RANGES = {
  green: {
    hueMin: 80,
    hueMax: 160,
    satMin: 30,
    valMin: 30
  },
  yellow: {
    hueMin: 35,
    hueMax: 70,
    satMin: 40,
    valMin: 40
  },
  red: {
    hueMin: 0,
    hueMax: 25,
    hueMin2: 340, // Red wraps around
    hueMax2: 360,
    satMin: 40,
    valMin: 30
  }
}

/**
 * Convert RGB to HSV color space
 */
function rgbToHsv(r, g, b) {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min

  let h = 0
  let s = max === 0 ? 0 : diff / max
  let v = max

  if (diff !== 0) {
    switch (max) {
      case r:
        h = 60 * (((g - b) / diff) % 6)
        break
      case g:
        h = 60 * ((b - r) / diff + 2)
        break
      case b:
        h = 60 * ((r - g) / diff + 4)
        break
    }
  }

  if (h < 0) h += 360

  return { h, s: s * 100, v: v * 100 }
}

/**
 * Analyze image data and determine dominant color
 * @param {ImageData} imageData - Canvas image data
 * @returns {Object} - Detected color and confidence
 */
export function analyzeImageData(imageData) {
  const { data, width, height } = imageData
  
  // Sample from center region (where sticker should be)
  const centerX = Math.floor(width / 2)
  const centerY = Math.floor(height / 2)
  const sampleSize = Math.floor(Math.min(width, height) * 0.3) // 30% of image
  
  const colorCounts = { red: 0, yellow: 0, green: 0, other: 0 }
  let totalSamples = 0
  
  // Average RGB for visualization
  let totalR = 0, totalG = 0, totalB = 0

  for (let y = centerY - sampleSize / 2; y < centerY + sampleSize / 2; y++) {
    for (let x = centerX - sampleSize / 2; x < centerX + sampleSize / 2; x++) {
      if (x < 0 || x >= width || y < 0 || y >= height) continue
      
      const i = (Math.floor(y) * width + Math.floor(x)) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      totalR += r
      totalG += g
      totalB += b
      
      const hsv = rgbToHsv(r, g, b)
      
      // Classify pixel
      if (hsv.s > COLOR_RANGES.red.satMin && hsv.v > COLOR_RANGES.red.valMin) {
        if ((hsv.h >= COLOR_RANGES.red.hueMin && hsv.h <= COLOR_RANGES.red.hueMax) ||
            (hsv.h >= COLOR_RANGES.red.hueMin2 && hsv.h <= COLOR_RANGES.red.hueMax2)) {
          colorCounts.red++
        } else if (hsv.h >= COLOR_RANGES.yellow.hueMin && hsv.h <= COLOR_RANGES.yellow.hueMax) {
          colorCounts.yellow++
        } else if (hsv.h >= COLOR_RANGES.green.hueMin && hsv.h <= COLOR_RANGES.green.hueMax) {
          colorCounts.green++
        } else {
          colorCounts.other++
        }
      } else {
        colorCounts.other++
      }
      
      totalSamples++
    }
  }

  // Determine dominant color
  const { red, yellow, green } = colorCounts
  const maxCount = Math.max(red, yellow, green)
  
  let detectedColor = 'unknown'
  let confidence = 0
  
  if (maxCount > 0 && totalSamples > 0) {
    if (red === maxCount) {
      detectedColor = 'red'
      confidence = (red / totalSamples) * 100
    } else if (yellow === maxCount) {
      detectedColor = 'yellow'
      confidence = (yellow / totalSamples) * 100
    } else if (green === maxCount) {
      detectedColor = 'green'
      confidence = (green / totalSamples) * 100
    }
  }

  // Calculate average color for preview
  const avgR = Math.round(totalR / totalSamples)
  const avgG = Math.round(totalG / totalSamples)
  const avgB = Math.round(totalB / totalSamples)

  return {
    color: detectedColor,
    confidence: Math.round(confidence),
    avgRgb: { r: avgR, g: avgG, b: avgB },
    colorCounts
  }
}

/**
 * Capture frame from video element and analyze color
 * @param {HTMLVideoElement} videoElement - Video element with camera stream
 * @returns {Object} - Analysis result
 */
export function analyzeVideoFrame(videoElement) {
  const canvas = document.createElement('canvas')
  canvas.width = videoElement.videoWidth
  canvas.height = videoElement.videoHeight
  
  const ctx = canvas.getContext('2d')
  ctx.drawImage(videoElement, 0, 0)
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return analyzeImageData(imageData)
}

/**
 * Get color emoji and status message
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
        message: 'Could not detect sticker color. Please try again.',
        className: ''
      }
  }
}

