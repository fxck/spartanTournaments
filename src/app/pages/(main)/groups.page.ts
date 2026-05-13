import {  Component, computed , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { injectLoad } from '@analogjs/router';
import { toSignal } from '@angular/core/rxjs-interop';
import type { load } from './groups.server';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-groups',
  imports: [CommonModule, RouterLink, ...HlmTableImports],
  template: `
    <div class="space-y-8">
      <header>
        <h1 class="text-4xl font-bold tracking-tight">Gruppenstände</h1>
        <p class="text-muted-foreground mt-2">Aktuelle Tabellen der Gruppenphase.</p>
      </header>

      <div class="grid gap-12 lg:grid-cols-2">
        @for (group of groupList(); track group.id) {
          <div class="space-y-4">
            <h2 class="text-2xl font-bold px-2 text-primary">Gruppe {{ group.id }}</h2>
            <div hlmTableContainer class="border rounded-lg overflow-hidden shadow-sm">
              <table hlmTable>
                <thead hlmTHead>
                  <tr hlmTr>
                    <th hlmTh class="w-12 text-center">#</th>
                    <th hlmTh>Name</th>
                    <th hlmTh class="w-20 text-center">MP</th>
                    <th hlmTh class="w-20 text-center">GP</th>
                    <th hlmTh class="w-20 text-center border-l">Diff</th>
                  </tr>
                </thead>
                <tbody hlmTBody>
                  @for (c of group.competitors; track c.id; let i = $index) {
                    <tr hlmTr>
                      <td hlmTd class="w-12 text-center font-bold">{{ i + 1 }}</td>
                      <td hlmTd>
                        <a [routerLink]="['/competitor', c.id]" 
                           class="font-medium hover:underline hover:text-primary transition-colors">
                          {{ c.name }}
                        </a>
                      </td>
                      <td hlmTd class="w-20 text-center font-bold">{{ c.matchPoints }}</td>
                      <td hlmTd class="w-20 text-center">{{ c.gamePoints }}</td>
                      <td hlmTd class="w-20 text-center font-mono border-l" 
                          [class.text-green-600]="c.diff > 0" 
                          [class.text-red-600]="c.diff < 0">
                        {{ c.diff > 0 ? '+' : '' }}{{ c.diff }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        } @empty {
          <div class="col-span-full py-24 text-center border-2 border-dashed rounded-xl text-muted-foreground italic">
            Keine Gruppen eingeteilt.
          </div>
        }
      </div>
    </div>
  `,
})
export default class GroupsPage {
  data = toSignal(injectLoad<typeof load>(), { initialValue: [] });
  groupList = computed(() => (this.data() ?? []) as any[]);
}
