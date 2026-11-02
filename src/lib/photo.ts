import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_SIDE = 1280;

/**
 * Reduz a foto do check-in antes do upload: lado maior ≤ 1280 px, JPEG 70%.
 * Uma foto de 12 MP cai de ~4 MB para ~250 KB — upload rápido no 4G e menos Storage.
 */
export async function compressPhoto(uri: string, width?: number, height?: number): Promise<string> {
  try {
    const ctx = ImageManipulator.manipulate(uri);
    const w = width ?? 0;
    const h = height ?? 0;
    if (w > MAX_SIDE || h > MAX_SIDE || (!w && !h)) {
      ctx.resize(w >= h ? { width: MAX_SIDE } : { height: MAX_SIDE });
    }
    const image = await ctx.renderAsync();
    const result = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
    return result.uri;
  } catch {
    // Se a manipulação falhar (ex.: formato raro), envia a original — o bucket aceita até 5 MB.
    return uri;
  }
}
