import {  Component , ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SimpleDialogComponent } from './shared/simple-dialog/simple-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, SimpleDialogComponent],
  template: `<router-outlet /><app-simple-dialog />`,
})
export class App {}
