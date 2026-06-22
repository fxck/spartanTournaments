import { CalcCompetitor, CalcGroup } from '../models/models';

export function calcGroups(competitors: CalcCompetitor[], groupCount: number): CalcGroup[] {
  if (groupCount > competitors.length / 2) {
    throw new Error('too many groups for this count of competitors!');
  }
  // Fill groups in ascending draw-number blocks: the larger groups (filled first)
  // get the lowest draws, the smaller, last groups get the highest draws. Draw
  // numbers are random lots, so this has no competitive effect — it just gives
  // high-lot teams fewer games (smaller group) so they can be started later (#4).
  competitors.sort((a, b) => (a.drawNumber ?? 0) - (b.drawNumber ?? 0));
  const base = Math.floor(competitors.length / groupCount);
  const remainder = competitors.length % groupCount;

  const groups: CalcGroup[] = [];
  let index = 0;
  for (let i = 0; i < groupCount; i++) {
    const size = base + (i < remainder ? 1 : 0);
    groups.push({ id: i + 1, competitors: competitors.slice(index, index + size) });
    index += size;
  }
  return groups;
}
