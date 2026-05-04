import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { BrandingComponent } from './branding.component';
import { MaterialModule } from 'src/app/material.module';

@Component({
  selector: 'app-sidebar',
  imports: [BrandingComponent, TablerIconComponent, MaterialModule],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent implements OnInit {
  constructor() {}
  @Input() showToggle = true;
  @Output() toggleMobileNav = new EventEmitter<void>();
  @Output() toggleCollapsed = new EventEmitter<void>();

  ngOnInit(): void {}
}