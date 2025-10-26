// utils/device.ts
import DeviceInfo from 'react-native-device-info';

export function getModel(): string {
  try {
    return DeviceInfo.getModel?.() ?? '';
  } catch {
    return '';
  }
}

export function isWear(model?: string): boolean {
  const s = (model ?? getModel() ?? '').toLowerCase();
  // Heurística simple por nombre de modelo
  const keywords = ['watch', 'wear', 'pixel watch', 'galaxy watch', 'ticwatch', 'fossil'];
  return keywords.some(k => s.includes(k));
}

export function isPhone(model?: string): boolean {
  return !isWear(model);
}
