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
  readonly dialogs = signal<SimpleDialog[]>([]);

  actualDialog = computed<SimpleDialog | undefined>(() => {
    return this.dialogs()[0] ?? undefined;
  });

  title = computed(() => this.actualDialog()?.title ?? '');
  description = computed(() => this.actualDialog()?.description ?? '');
  mainButton = computed(() => this.actualDialog()?.mainButton);
  cancelButton = computed(() => this.actualDialog()?.cancelButton);
  otherButtons = computed(() => this.actualDialog()?.otherButtons ?? []);
  type = computed(() => this.actualDialog()?.type ?? 'message');
  transparentBackground = computed(() => this.actualDialog()?.transparentBackground ?? false);
  dialogState = computed(() => this.actualDialog() ? 'open' : 'closed');

  create(dialog: SimpleDialog): void {
    this.dialogs.set([...this.dialogs(), dialog]);
  }

  dismiss(): void {
    this.dialogs.set(this.dialogs().slice(1));
  }

  onAction(buttonValue: string): void {
    const dialog = this.actualDialog();
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

  // Helper helper to make standard confirm simple
  confirm(title: string, description: string, destructive = false): Promise<boolean> {
    return new Promise((resolve) => {
      this.create({
        title,
        description,
        mainButton: destructive ? dlgBtnDelete : dlgBtnConfirm,
        cancelButton: dlgBtnCancel,
        action: (res) => resolve(res === 'confirm' || res === 'delete'),
      });
    });
  }
}
