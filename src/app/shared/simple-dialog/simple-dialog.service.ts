import { computed, Injectable, Signal, signal } from '@angular/core';

export interface SimpleDialogButton {
  label?: string;
  value: string;
  disabled?: Signal<boolean>;
  closeOnAction?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export interface SimpleDialog {
  title?: string;
  description?: string;
  type?: 'message' | 'error' | 'success' | 'warning' | 'info';
  mainButton?: SimpleDialogButton;
  cancelButton?: SimpleDialogButton;
  otherButtons?: SimpleDialogButton[];
  transparentBackground?: boolean;
  action?: (result: string) => void;
}

export interface ConfirmOptions {
  destructive?: boolean;
  confirmLabel?: string;
}

export const dlgBtnOk: SimpleDialogButton = {
  label: 'OK',
  value: 'ok',
};

export const dlgBtnCancel: SimpleDialogButton = {
  label: 'Abbrechen',
  variant: 'outline',
  value: 'cancel',
};

export const dlgBtnClose: SimpleDialogButton = {
  label: 'Schließen',
  variant: 'outline',
  value: 'close',
};

export const dlgBtnConfirm: SimpleDialogButton = {
  label: 'Bestätigen',
  value: 'confirm',
};

export const dlgBtnDelete: SimpleDialogButton = {
  label: 'Löschen',
  value: 'delete',
  variant: 'destructive',
};

@Injectable({
  providedIn: 'root',
})
export class SimpleDialogService {
  // Dialogs waiting to be shown. The one currently on screen lives in `#current`,
  // never in this queue, so we can serialize show/close transitions cleanly.
  readonly #queue = signal<SimpleDialog[]>([]);
  readonly #current = signal<SimpleDialog | undefined>(undefined);

  // True between dismiss() and the brain dialog's `closed` event. Brain keeps its
  // internal dialog ref alive during the close animation (closeDelay), and its
  // open() silently bails while that ref exists. Opening the next dialog before
  // the previous one has fully closed therefore wedges the whole controlled-state
  // machine — so we wait for `notifyClosed()` before advancing the queue.
  #closing = false;

  readonly actualDialog = this.#current.asReadonly();

  title = computed(() => this.actualDialog()?.title ?? '');
  description = computed(() => this.actualDialog()?.description ?? '');
  mainButton = computed(() => this.actualDialog()?.mainButton);
  cancelButton = computed(() => this.actualDialog()?.cancelButton);
  otherButtons = computed(() => this.actualDialog()?.otherButtons ?? []);
  type = computed(() => this.actualDialog()?.type ?? 'message');
  transparentBackground = computed(() => this.actualDialog()?.transparentBackground ?? false);
  dialogState = computed(() => (this.#current() ? 'open' : 'closed'));

  create(dialog: SimpleDialog): void {
    this.#queue.update((q) => [...q, dialog]);
    this.#tryShowNext();
  }

  dismiss(): void {
    if (!this.#current()) return;
    // Drive the brain dialog to 'closed' and wait for its close animation to
    // finish (notifyClosed) before showing whatever is queued next.
    this.#closing = true;
    this.#current.set(undefined);
  }

  /** Called by SimpleDialogComponent once the alert-dialog has fully closed. */
  notifyClosed(): void {
    this.#closing = false;
    this.#tryShowNext();
  }

  #tryShowNext(): void {
    if (this.#current() || this.#closing) return;
    const next = this.#queue()[0];
    if (!next) return;
    this.#queue.update((q) => q.slice(1));
    this.#current.set(next);
  }

  onAction(buttonValue: string): void {
    const dialog = this.#current();
    if (dialog?.action) {
      dialog.action(buttonValue);
    }
  }

  // Helper helper to make standard alert simple
  alert(title: string, description: string, type: SimpleDialog['type'] = 'message'): Promise<string> {
    return new Promise((resolve) => {
      this.create({
        title,
        description,
        type,
        mainButton: dlgBtnOk,
        action: (res) => resolve(res),
      });
    });
  }

  // Helper helper to make standard confirm simple. Pass `true` for a destructive
  // (red, "Löschen") confirm, or an options object to set a custom confirm label.
  confirm(title: string, description: string, options: boolean | ConfirmOptions = {}): Promise<boolean> {
    const opts: ConfirmOptions = typeof options === 'boolean' ? { destructive: options } : options;
    const destructive = opts.destructive ?? false;
    return new Promise((resolve) => {
      this.create({
        title,
        description,
        mainButton: {
          label: opts.confirmLabel ?? (destructive ? 'Löschen' : 'Bestätigen'),
          value: 'confirm',
          variant: destructive ? 'destructive' : 'default',
        },
        cancelButton: dlgBtnCancel,
        action: (res) => resolve(res === 'confirm'),
      });
    });
  }
}
