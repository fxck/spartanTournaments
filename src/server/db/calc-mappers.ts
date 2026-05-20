import type { CalcCompetitor } from 'calc-tournament';
import type { competitors } from './schema';

type CompetitorRow = typeof competitors.$inferSelect;

export function toCalcCompetitor(c: CompetitorRow): CalcCompetitor {
  return {
    id: c.id,
    name: c.name,
    drawNumber: c.drawNumber ?? 0,
    groupID: c.groupID ?? 0,
    diff: 0,
    createdAt: c.createdAt,
  };
}
