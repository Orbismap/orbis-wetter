/** Weather map modes. The layer IDs are the ones orbis-karten knows (src/karten/standard.ts, Karte "wetter"). */
export type WxMapMode = 'radar' | 'precip' | 'temp' | 'wind';

export const MODE_LABEL: Record<WxMapMode, string> = {
  radar: 'Radar',
  precip: 'Niederschlag',
  temp: 'Temperatur',
  wind: 'Wind',
};

export const MODE_LAYERS: Record<WxMapMode, string[]> = {
  radar: ['radar'],
  precip: ['niederschlag'],
  temp: ['temperatur'],
  wind: ['wind'],
};
