import { Component } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
@Component({
  selector: 'app-menu',
  imports: [MatCardModule, MatMenuModule, MatIconModule, TablerIconComponent, MatButtonModule],
  templateUrl: './menu.component.html',
})
export class AppMenuComponent {
  constructor() {}
}
