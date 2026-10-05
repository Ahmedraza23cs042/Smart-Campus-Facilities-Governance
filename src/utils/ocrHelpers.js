// ✅ All OCR-related pure helpers, extracted from App.jsx without logic change.

export const MUET_KEYWORD_PATTERNS = [/M[E3]HR[A4]N/, /MUET/, /JAMSH[O0]R[O0]/, /UNIVERSITY/, /ENGINEERING/];

export const hasInstitutionKeyword = (text) => {
  const compact = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return MUET_KEYWORD_PATTERNS.some((re) => re.test(compact));
};

export const extractRollCandidates = (text) => {
  const upper = text.toUpperCase();
  const toDigits = (s) => s.replace(/O/g, '0').replace(/[IL]/g, '1').replace(/S/g, '5').replace(/B/g, '8');
  const patterns = [
    /(?:^|[^0-9A-Z])([0-9OIL]{2})[ \t\-_.]*([A-Z]{2,4})[ \t\-_.]*([0-9OIL]{1,4})(?![0-9A-Z])/g,
    /(?:^|[^0-9A-Z])([0-9OIL]{2})[ \t\-_.]*([A-Z]{2,4})[ \t\-_.]*([0-9OIL]{1,4})/g,
  ];
  const currentYear = new Date().getFullYear();
  const seen = new Set(); const found = [];
  for (const re of patterns) {
    for (const m of upper.matchAll(re)) {
      const yy = toDigits(m[1]); const serial = toDigits(m[3]);
      if (!/^\d{2}$/.test(yy) || !/^\d{1,4}$/.test(serial)) continue;
      if (parseInt(serial, 10) < 1) continue;
      const batchYear = 2000 + parseInt(yy, 10);
      if (batchYear > currentYear) continue;
      const dept = m[2]; const roll = `${yy}${dept}${serial.padStart(3, '0')}`;
      if (seen.has(roll)) continue;
      seen.add(roll);
      found.push({ roll, yy, dept, batchYear, serialLen: serial.length });
    }
  }
  return found.sort((a, b) => b.serialLen - a.serialLen);
};

export const REQUIRE_VALID_TILL = true;
export const MONTHS = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };

export const extractValidTill = (text) => {
  const upper = text.toUpperCase().replace(/O(?=\d)|(?<=\d)O/g, '0');
  const patterns = [
    /VALID\s*T[A-Z1]{2,4}[^A-Z0-9]{0,4}([A-Z]{3})[A-Z]*[ \t\-\/.,]*(20\d{2})/,
    /(?:VALIDITY|EXPIRY|EXPIRES?|VALID\s*UPTO)[^A-Z0-9]{0,4}([A-Z]{3})[A-Z]*[ \t\-\/.,]*(20\d{2})/,
    /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*[ \t\-\/.,]*(20\d{2})\b/
  ];
  for (const re of patterns) {
    const m = upper.match(re);
    if (m && MONTHS[m[1]] !== undefined) {
      const year = parseInt(m[2], 10); const month = MONTHS[m[1]];
      return { date: new Date(year, month + 1, 0, 23, 59, 59), label: `${m[1][0]}${m[1].slice(1).toLowerCase()} ${year}` };
    }
  }
  return null;
};

export const preprocessIdImage = async (file, mode = 'contrast') => {
  try {
    const bitmap = await createImageBitmap(file);
    const targetWidth = 1800;
    const scale = targetWidth / bitmap.width;
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth; canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = img.data;
    const gray = new Uint8ClampedArray(px.length / 4);
    const hist = new Array(256).fill(0);
    for (let i = 0, j = 0; i < px.length; i += 4, j++) { const g = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]); gray[j] = g; hist[g]++; }
    if (mode === 'binarize') {
      const total = gray.length; let sum = 0;
      for (let i = 0; i < 256; i++) sum += i * hist[i];
      let sumB = 0, wB = 0, maximum = 0, threshold = 0;
      for (let i = 0; i < 256; i++) {
        wB += hist[i]; if (wB === 0) continue;
        const wF = total - wB; if (wF === 0) break;
        sumB += i * hist[i];
        const mB = sumB / wB; const mF = (sum - sumB) / wF;
        const between = wB * wF * (mB - mF) * (mB - mF);
        if (between > maximum) { maximum = between; threshold = i; }
      }
      for (let i = 0, j = 0; i < px.length; i += 4, j++) { const v = gray[j] > threshold ? 255 : 0; px[i] = px[i + 1] = px[i + 2] = v; }
    } else {
      const total = gray.length;
      let acc = 0, low = 0, high = 255;
      for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * 0.02) { low = v; break; } }
      acc = 0;
      for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= total * 0.02) { high = v; break; } }
      const range = Math.max(high - low, 1);
      for (let i = 0, j = 0; i < px.length; i += 4, j++) { const v = Math.max(0, Math.min(255, ((gray[j] - low) * 255) / range)); px[i] = px[i + 1] = px[i + 2] = v; }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  } catch (err) { return null; }
};
