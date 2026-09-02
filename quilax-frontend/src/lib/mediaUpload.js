/**
 * Convierte un asset de ImagePicker / Camera a data URL (https o data:)
 * para endpoints que validan URL y no aceptan file:// locales.
 */
import i18n from '@/i18n';

export async function assetToDataUrl(asset, { maxBytes = 2_000_000 } = {}) {
  if (!asset) throw new Error(i18n.t('common.upload.noImage'));

  if (asset.base64) {
    const mime = asset.mimeType || 'image/jpeg';
    const dataUrl = `data:${mime};base64,${asset.base64}`;
    if (dataUrl.length > maxBytes) {
      throw new Error(i18n.t('common.upload.tooLarge'));
    }
    return dataUrl;
  }

  if (typeof asset.uri === 'string' && /^https?:\/\//i.test(asset.uri)) {
    return asset.uri;
  }

  if (typeof asset.uri === 'string' && asset.uri.startsWith('data:')) {
    if (asset.uri.length > maxBytes) {
      throw new Error(i18n.t('common.upload.tooLarge'));
    }
    return asset.uri;
  }

  // Web / fallback: fetch blob → base64
  if (typeof fetch === 'function' && asset.uri) {
    const res = await fetch(asset.uri);
    const blob = await res.blob();
    if (blob.size > maxBytes) {
      throw new Error(i18n.t('common.upload.tooLarge'));
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error(i18n.t('common.upload.readFailed')));
      reader.readAsDataURL(blob);
    });
    if (!dataUrl) throw new Error(i18n.t('common.upload.convertFailed'));
    return dataUrl;
  }

  throw new Error(i18n.t('common.upload.prepareFailed'));
}
