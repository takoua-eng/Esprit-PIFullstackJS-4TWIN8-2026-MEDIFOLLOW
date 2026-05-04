import {
  Component,
  HostBinding,
  Input,
  OnChanges,
  Output,
  EventEmitter,
} from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { NavItem } from './nav-item';
import { Router } from '@angular/router';
import { NavService } from '../../../../services/nav.service';
import { CoreService } from '../../../../services/core.service';

import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nav-item',
  imports: [TranslateModule, TablerIconComponent, MaterialModule, CommonModule],
  templateUrl: './nav-item.component.html',
  styleUrls: ['./nav-item.component.scss'],
})
export class AppNavItemComponent implements OnChanges {
  @Output() notify: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Input() item: NavItem | any;

  expanded: boolean = false;

  @HostBinding('attr.aria-expanded') ariaExpanded = this.expanded;
  @Input() depth: any;

  constructor(
    public navService: NavService,
    public router: Router,
    public core: CoreService,
  ) {}

  /** Returns true if the item should be visible based on its permission */
  isVisible(item: NavItem): boolean {
    if (!item.permission) return true;
    return this.core.hasPermission(item.permission);
  }

  /** Filter children to only those the user has permission to see */
  visibleChildren(item: NavItem): NavItem[] {
    if (!item.children) return [];
    return item.children.filter(c => this.isVisible(c));
  }

  private normalizeRoute(route?: string): string {
    if (!route) return '';
    return route.startsWith('/') ? route : `/${route}`;
  }

  ngOnChanges() {
    const url = this.navService.currentUrl();
    const route = this.normalizeRoute(this.item.route);

    if (route && url) {
      this.expanded = url.startsWith(route);
      this.ariaExpanded = this.expanded;
    }
  }

  onItemSelected(item: NavItem) {
    if (!item.children || !item.children.length) {
      const route = this.normalizeRoute(item.route);
      if (route) {
        this.router.navigateByUrl(route);
      }
    }

    if (item.children && item.children.length) {
      this.expanded = !this.expanded;
    }

    window.scroll({ top: 0, left: 0, behavior: 'smooth' });

    if (!this.expanded) {
      if (window.innerWidth < 768) {
        this.notify.emit();
      }
    }
  }

  openExternalLink(url: string): void {
    if (url) window.open(url, '_blank');
  }

  onSubItemSelected(item: NavItem) {
    if (!item.children || !item.children.length) {
      if (this.expanded && window.innerWidth < 768) {
        this.notify.emit();
      }
    }
  }
}