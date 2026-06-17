import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { isFinals } from 'calc-tournament';
import { phaseLabel } from './phase-name';

/** Minimal shape a pairing needs to render its header band. */
export type PairingHeaderData = {
  startTime: string | Date;
  court: number;
  groupID: number;
  round: number;
};

/**
 * Shared header band for pairing cards (Startseite, Spielplan, Ergebnisse, Schiedsrichter).
 *
 * Layout: start time as the primary (red) accent on the left, the phase/group badge next to
 * it (primary when it's a finals game), and the court ("Bahn") in its own separated panel on
 * the right. Anything projected via <ng-content> sits between badge and court — typically a
 * centered action button.
 *
 * Phase label and finals highlighting are derived from the pairing itself, so callers only
 * pass the pairing.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pairing-header',
  imports: [DatePipe],
  template: `
    <div class="flex items-stretch border-b bg-muted/30">
      <div class="flex-1 flex items-center gap-2 min-w-0 px-4 py-2.5">
        <span class="flex items-center gap-1.5 text-primary shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="text-sm font-bold tabular-nums leading-none">{{ pairing().startTime | date: 'HH:mm' }}</span>
        </span>
        <span
          class="px-2 py-0.5 rounded font-bold text-xs shrink-0"
          [class.bg-secondary]="!isFinals()"
          [class.text-secondary-foreground]="!isFinals()"
          [class.bg-primary]="isFinals()"
          [class.text-primary-foreground]="isFinals()"
        >
          {{ label() }}
        </span>
        <ng-content />
      </div>
      <div class="flex items-center px-4 py-2.5 border-l bg-card shrink-0">
        <span class="text-sm font-bold leading-none tracking-tight text-muted-foreground"
          >Bahn {{ pairing().court }}</span
        >
      </div>
    </div>
  `,
})
export class PairingHeaderComponent {
  pairing = input.required<PairingHeaderData>();

  protected label = computed(() => phaseLabel(this.pairing()));
  protected isFinals = computed(() => isFinals(this.pairing()));
}
