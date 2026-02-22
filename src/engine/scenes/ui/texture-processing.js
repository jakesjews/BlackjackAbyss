function resolveSourceImage(texture) {
  return texture?.getSourceImage?.() || texture?.source?.[0]?.image || texture?.source?.[0]?.source || null;
}

function resolveSourceInfo(scene, sourceKey) {
  if (!scene?.textures || !sourceKey || !scene.textures.exists(sourceKey)) {
    return null;
  }
  const sourceTexture = scene.textures.get(sourceKey);
  const sourceImage = resolveSourceImage(sourceTexture);
  const sourceW = Math.max(1, Number(sourceImage?.width) || 0);
  const sourceH = Math.max(1, Number(sourceImage?.height) || 0);
  if (!sourceImage || sourceW < 1 || sourceH < 1) {
    return null;
  }
  return {
    sourceImage,
    sourceW,
    sourceH,
  };
}

function createDerivedTexture(
  scene,
  {
    sourceKey,
    outputKey,
    cacheMap = null,
    transformPixel = null,
  }
) {
  if (!scene?.textures || !sourceKey || !outputKey || !scene.textures.exists(sourceKey)) {
    return sourceKey;
  }
  const cachedOutputKey = cacheMap?.get?.(sourceKey);
  if (cachedOutputKey && scene.textures.exists(cachedOutputKey)) {
    return cachedOutputKey;
  }
  if (scene.textures.exists(outputKey)) {
    cacheMap?.set?.(sourceKey, outputKey);
    return outputKey;
  }
  if (typeof scene.textures.createCanvas !== "function") {
    return sourceKey;
  }
  const sourceInfo = resolveSourceInfo(scene, sourceKey);
  if (!sourceInfo) {
    return sourceKey;
  }
  const { sourceImage, sourceW, sourceH } = sourceInfo;

  try {
    const canvasTexture = scene.textures.createCanvas(outputKey, sourceW, sourceH);
    const ctx = canvasTexture?.getContext?.();
    if (!ctx) {
      return sourceKey;
    }
    ctx.clearRect(0, 0, sourceW, sourceH);
    ctx.drawImage(sourceImage, 0, 0);
    if (typeof transformPixel === "function") {
      const image = ctx.getImageData(0, 0, sourceW, sourceH);
      const pixels = image.data;
      for (let i = 0; i < pixels.length; i += 4) {
        const alpha = pixels[i + 3];
        if (alpha === 0) {
          continue;
        }
        transformPixel(pixels, i, alpha);
      }
      ctx.putImageData(image, 0, 0);
    }
    canvasTexture.refresh();
    cacheMap?.set?.(sourceKey, outputKey);
    return outputKey;
  } catch {
    if (scene.textures.exists(outputKey)) {
      scene.textures.remove(outputKey);
    }
    return sourceKey;
  }
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
  const sourceInfo = resolveSourceInfo(scene, sourceKey);
  if (!sourceInfo) {
    return sourceKey;
  }
  const { sourceImage, sourceW, sourceH } = sourceInfo;

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

export function resolveDarkIconTexture(scene, sourceKey, cacheMap = null) {
  const safeSourceKey = typeof sourceKey === "string" ? sourceKey : "";
  if (!safeSourceKey) {
    return sourceKey;
  }
  return createDerivedTexture(scene, {
    sourceKey: safeSourceKey,
    outputKey: `${safeSourceKey}__dark`,
    cacheMap,
    transformPixel: (pixels, index) => {
      const luminance = (pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722) / 255;
      const value = Math.round(18 + luminance * 34);
      pixels[index] = Math.round(value * 0.95);
      pixels[index + 1] = Math.round(value * 0.78);
      pixels[index + 2] = Math.round(value * 0.58);
    },
  });
}

export function resolveGoldIconTexture(scene, sourceKey) {
  const safeSourceKey = typeof sourceKey === "string" ? sourceKey : "";
  if (!safeSourceKey) {
    return sourceKey;
  }
  return createDerivedTexture(scene, {
    sourceKey: safeSourceKey,
    outputKey: `${safeSourceKey}__gold`,
    transformPixel: (pixels, index) => {
      const luminance = (pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722) / 255;
      const strength = 0.38 + luminance * 0.62;
      pixels[index] = Math.round(242 * strength);
      pixels[index + 1] = Math.round(205 * strength);
      pixels[index + 2] = Math.round(136 * strength);
    },
  });
}

export function resolveWatermarkTexture(
  scene,
  {
    sourceKey,
    outputKey,
    alphaScale = 1,
  }
) {
  const clampedAlphaScale = Math.min(1, Math.max(0, Number(alphaScale) || 0));
  const targetPeakAlpha = Math.round(255 * clampedAlphaScale);
  return createDerivedTexture(scene, {
    sourceKey,
    outputKey,
    transformPixel: (pixels, index, alpha) => {
      const luminance = (pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722) / 255;
      const strength = 0.45 + luminance * 0.55;
      pixels[index] = Math.round(214 * strength + 26);
      pixels[index + 1] = Math.round(182 * strength + 22);
      pixels[index + 2] = Math.round(140 * strength + 18);
      const normalizedAlpha = Math.min(1, Math.max(0, alpha / 255));
      pixels[index + 3] = Math.round(targetPeakAlpha * Math.pow(normalizedAlpha, 0.4));
    },
  });
}

export function getTextureSourceSize(scene, textureKey) {
  const texture = scene?.textures?.get?.(textureKey);
  const source = texture?.source?.[0];
  return {
    width: Math.max(1, Number(source?.width) || Number(texture?.getSourceImage?.()?.width) || 1),
    height: Math.max(1, Number(source?.height) || Number(texture?.getSourceImage?.()?.height) || 1),
  };
}

export function coverSizeForTexture(scene, textureKey, boundsW, boundsH) {
  const source = getTextureSourceSize(scene, textureKey);
  const sourceW = source.width;
  const sourceH = source.height;
  const scale = Math.max(boundsW / sourceW, boundsH / sourceH);
  return {
    width: sourceW * scale,
    height: sourceH * scale,
  };
}
