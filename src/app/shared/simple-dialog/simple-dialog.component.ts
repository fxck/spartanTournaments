import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { SimpleDialogButton, SimpleDialogService } from './simple-dialog.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-simple-dialog',
  imports: [CommonModule, ...HlmAlertDialogImports, HlmButton],
  template: `
    <hlm-alert-dialog [state]="state()" (closed)="onClosed()">
      <hlm-alert-dialog-content
        *hlmAlertDialogPortal="let ctx"
        [class]="computedClass()"
        (keydown)="onKeyDown($event)"
        tabindex="-1"
      >
        @if (outsideClickElement()) {
          <div class="fixed top-0 left-0 -z-10 h-dvh w-screen overflow-hidden" (click)="onOutsideClick()"></div>
        }
        @if (cancelButton()) {
          <button
            class="absolute top-3 right-3 cursor-pointer opacity-80 transition-opacity hover:opacity-100 p-1 rounded-sm hover:bg-muted text-lg border-0 bg-transparent font-semibold"
            (click)="onOutsideClick()"
            aria-label="Schließen"
          >
            <span class="sr-only">Schließen</span>
            ×
          </button>
        }
        @if (title() || description()) {
          <hlm-alert-dialog-header class="space-y-2">
            @if (title()) {
              <h3 class="px-1 text-lg font-semibold" hlmAlertDialogTitle>
                {{ title() }}
              </h3>
            }
            @if (description()) {
              <p class="px-1 whitespace-pre-wrap text-sm text-muted-foreground" hlmAlertDialogDescription>
                {{ description() }}
              </p>
            }
          </hlm-alert-dialog-header>
        }
        <hlm-alert-dialog-footer
          class="p-1 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0 mt-4"
        >
          @if (cancelButton()) {
            @let cancel = cancelButton()!;
            <button
              [disabled]="cancel.disabled?.() || false"
              [variant]="cancel.variant ?? 'outline'"
              (click)="onAction(cancel)"
              hlmBtn
            >
              {{ cancel.label ?? 'Abbrechen' }}
            </button>
          }
          @for (button of otherButtons(); track $index) {
            <button
              [disabled]="button.disabled?.() || false"
              [variant]="button.variant ?? 'default'"
              (click)="onAction(button)"
              hlmBtn
            >
              {{ button.label ?? '' }}
            </button>
          }
          @if (mainButton()) {
            @let main = mainButton()!;
            <button
              [disabled]="main.disabled?.() || false"
              [variant]="main.variant ?? 'default'"
              (click)="onAction(main)"
              hlmBtn
            >
              {{ main.label ?? 'OK' }}
            </button>
          }
        </hlm-alert-dialog-footer>
      </hlm-alert-dialog-content>
    </hlm-alert-dialog>
  `,
})
export class SimpleDialogComponent {
  #dialogs = inject(SimpleDialogService);

  protected readonly outsideClickElement = signal(false);

  protected readonly renderBackdropEffect = effect(() => {
    if (this.state() === 'open') {
      setTimeout(() => {
        this.outsideClickElement.set(true);
      }, 300);
    } else {
      this.outsideClickElement.set(false);
    }
  });

  protected readonly title = computed(() => this.#dialogs.title());
  protected readonly description = computed(() => this.#dialogs.description());
  protected readonly mainButton = computed(() => this.#dialogs.mainButton());
  protected readonly cancelButton = computed(() => this.#dialogs.cancelButton());
  protected readonly otherButtons = computed(() => this.#dialogs.otherButtons());
  protected readonly state = computed(() => this.#dialogs.dialogState());
  protected readonly type = computed(() => this.#dialogs.type());
  protected readonly transparentBackground = computed(() => this.#dialogs.transparentBackground());

  protected readonly computedClass = computed(() => {
    let computedClass =
      'outline-none max-w-[90vw] sm:max-w-md w-full relative overflow-hidden flex flex-col p-6 rounded-lg border bg-background shadow-lg';
    if (this.transparentBackground()) {
      computedClass = 'border-none bg-transparent';
    } else {
      switch (this.type()) {
        case 'success':
          computedClass += ' border-green-200 bg-green-50 text-green-900';
          break;
        case 'info':
          computedClass += ' border-blue-200 bg-blue-50 text-blue-900';
          break;
        case 'warning':
          computedClass += ' border-yellow-200 bg-yellow-50 text-yellow-900';
          break;
        case 'error':
          computedClass += ' border-red-200 bg-red-50 text-red-900';
          break;
      }
    }
    return computedClass;
  });

  onAction(button: SimpleDialogButton): void {
    if (button.disabled?.()) return;
    this.#dialogs.onAction(button.value);
    if (button.closeOnAction === undefined || button.closeOnAction === true) {
      this.#dialogs.dismiss();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'Escape': {
        event.preventDefault();
        event.stopPropagation();
        const cancel = this.cancelButton();
        if (cancel) {
          this.onAction(cancel);
        }
        break;
      }
      case 'NumpadEnter':
      case 'Enter': {
        event.preventDefault();
        const main = this.mainButton();
        if (main) {
          this.onAction(main);
        }
        break;
      }
    }
  }

  onOutsideClick(): void {
    const cancel = this.cancelButton();
    if (cancel) {
      this.onAction(cancel);
    }
  }

  onClosed(): void {
    this.#dialogs.notifyClosed();
  }
}
