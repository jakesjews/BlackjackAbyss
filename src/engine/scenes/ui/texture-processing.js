function resolveSourceImage(texture) {
  return texture?.getSourceImage?.() || texture?.source?.[0]?.image || texture?.source?.[0]?.source || null;
}

function scanAlphaBounds(imageData, width, height, alphaThreshold) {
  const pixels = imageData.data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha > alphaThreshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
  };
}

export function createTightTextureFromAlpha(
  scene,
  {
    sourceKey,
    outputKey,
    alphaThreshold = 8,
    pad = 2,
  }
) {
  if (!scene?.textures || !sourceKey || !outputKey || !scene.textures.exists(sourceKey)) {
    return sourceKey;
  }
  if (scene.textures.exists(outputKey)) {
    return outputKey;
  }
  if (typeof scene.textures.createCanvas !== "function") {
    return sourceKey;
  }

  const sourceTexture = scene.textures.get(sourceKey);
  const sourceImage = resolveSourceImage(sourceTexture);
  const sourceW = Math.max(1, Number(sourceImage?.width) || 0);
  const sourceH = Math.max(1, Number(sourceImage?.height) || 0);
  if (!sourceImage || sourceW < 1 || sourceH < 1) {
    return sourceKey;
  }

  const scanKey = `__tight-scan-${outputKey}__`;
  if (scene.textures.exists(scanKey)) {
    scene.textures.remove(scanKey);
  }

  try {
    const scanTexture = scene.textures.createCanvas(scanKey, sourceW, sourceH);
    const scanCtx = scanTexture?.getContext?.();
    if (!scanCtx) {
      return sourceKey;
    }

    scanCtx.clearRect(0, 0, sourceW, sourceH);
    scanCtx.drawImage(sourceImage, 0, 0);
    const image = scanCtx.getImageData(0, 0, sourceW, sourceH);
    const bounds = scanAlphaBounds(image, sourceW, sourceH, alphaThreshold);
    if (!bounds) {
      return sourceKey;
    }

    const sx = Math.max(0, bounds.minX - pad);
    const sy = Math.max(0, bounds.minY - pad);
    const sw = Math.max(1, Math.min(sourceW - sx, bounds.maxX - bounds.minX + 1 + pad * 2));
    const sh = Math.max(1, Math.min(sourceH - sy, bounds.maxY - bounds.minY + 1 + pad * 2));

    const outputTexture = scene.textures.createCanvas(outputKey, sw, sh);
    const outputCtx = outputTexture?.getContext?.();
    if (!outputCtx) {
      scene.textures.remove(outputKey);
      return sourceKey;
    }
    outputCtx.clearRect(0, 0, sw, sh);
    outputCtx.drawImage(sourceImage, sx, sy, sw, sh, 0, 0, sw, sh);
    outputTexture.refresh();
    return outputKey;
  } catch {
    if (scene.textures.exists(outputKey)) {
      scene.textures.remove(outputKey);
    }
    return sourceKey;
  } finally {
    if (scene.textures.exists(scanKey)) {
      scene.textures.remove(scanKey);
    }
  }
}
