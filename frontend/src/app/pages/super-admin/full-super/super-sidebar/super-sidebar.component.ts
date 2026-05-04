// src/app/pages/super-admin/full-super/super-sidebar/super-sidebar.component.ts
import { TablerIconComponent } from 'angular-tabler-icons';
import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from 'src/app/material.module';
import { BrandingComponent } from '../../../../layouts/full/sidebar/branding.component';
import { AppNavItemComponent } from '../../../../layouts/full/sidebar/nav-item/nav-item.component';
import { superAdminNavItems, auditorNavItems } from './super-admin-data';
import { NavItem } from '../../../../layouts/full/sidebar/nav-item/nav-item';

@Component({
  selector: 'app-super-sidebar',
  standalone: true,
  imports: [
    CommonModule, RouterModule, TranslateModule,
    TablerIconComponent, MaterialModule, NgScrollbarModule,
    BrandingComponent, AppNavItemComponent,
  ],
  templateUrl: './super-sidebar.component.html',
})
export class SuperSidebarComponent implements OnInit {
  @Input() showToggle = true;
  @Output() toggleMobileNav = new EventEmitter<void>();

  public navItems: NavItem[] = [];

  ngOnInit(): void {
    const role = (localStorage.getItem('user_role') || '').toLowerCase();
    this.navItems = role === 'auditor' ? auditorNavItems : superAdminNavItems;
  }
}
