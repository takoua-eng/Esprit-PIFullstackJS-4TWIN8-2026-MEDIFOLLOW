import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatSidenav, MatSidenavContent, MatSidenavModule } from '@angular/material/sidenav';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MaterialModule } from 'src/app/material.module';
import { TranslateModule } from '@ngx-translate/core';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { BrandingComponent } from 'src/app/layouts/full/sidebar/branding.component';
import { AppNavItemComponent } from 'src/app/layouts/full/sidebar/nav-item/nav-item.component';
import { HeaderComponent } from 'src/app/layouts/full/header/header.component';
import { AppTopstripComponent } from 'src/app/layouts/full/top-strip/topstrip.component';
import { NavItem } from 'src/app/layouts/full/sidebar/nav-item/nav-item';

const auditorNav: NavItem[] = [
  {
    displayName: 'Dashboard',
    iconName: 'gauge',
    route: '/auditor/dashboard',
    bgcolor: 'primary',
  },
  {
    displayName: 'Patients',
    iconName: 'users',
    route: '/auditor/patients',
    bgcolor: 'primary',
    permission: 'audit:read',
  },
  {
    displayName: 'Coordinateurs',
    iconName: 'users-group',
    route: '/auditor/coordinators',
    bgcolor: 'accent',
    permission: 'audit:read',
  },
  {
    displayName: 'Reminders',
    iconName: 'bell',
    route: '/auditor/reminders',
    bgcolor: 'warning',
    permission: 'audit:read',
  },
  {
    displayName: 'Anomalies',
    iconName: 'alert-triangle',
    route: '/auditor/anomalies',
    bgcolor: 'error',
    permission: 'audit:read',
  },
  {
    displayName: 'Audit Logs',
    iconName: 'clipboard-list',
    route: '/auditor/logs',
    bgcolor: 'primary',
    permission: 'audit:read',
  },
];

@Component({
  selector: 'app-auditor-layout',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule, RouterModule, MatSidenavModule, MaterialModule,
    TablerIconComponent, TranslateModule, NgScrollbarModule,
    BrandingComponent, AppNavItemComponent, HeaderComponent, AppTopstripComponent,
  ],
  template: `
    <app-topstrip></app-topstrip>
    <mat-sidenav-container class="mainWrapper blue_theme light-theme" autosize autoFocus>
      <mat-sidenav #sidenav [mode]="isOver ? 'over' : 'side'" [opened]="!isOver"
        class="sidebarNav light-theme">
        <div class="flex-layout">
          <div class="d-flex align-items-center justify-content-between">
            <app-branding></app-branding>
          </div>
          <ng-scrollbar class="position-relative" style="height:100%">
            <mat-nav-list class="sidebar-list">
              <app-nav-item *ngFor="let item of navItems" [item]="item"
                (notify)="sidenav.toggle()">
              </app-nav-item>
            </mat-nav-list>
          </ng-scrollbar>
        </div>
      </mat-sidenav>
      <mat-sidenav-content class="contentWrapper light-theme" #content>
        <main class="pageWrapper maxWidth">
          <app-header [showToggle]="!isOver" (toggleMobileNav)="sidenav.toggle()"></app-header>
          <div class="m-t-30">
            <router-outlet></router-outlet>
          </div>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
})
export class AuditorLayoutComponent implements OnInit {
  navItems = auditorNav;
  isOver = false;

  @ViewChild('content', { static: true }) content!: MatSidenavContent;
  private sub = Subscription.EMPTY;

  constructor(private bp: BreakpointObserver, private router: Router) {}

  ngOnInit(): void {
    this.bp.observe(['screen and (max-width: 768px)']).subscribe(s => {
      this.isOver = s.breakpoints['screen and (max-width: 768px)'];
    });
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.content?.scrollTo({ top: 0 }));
  }
}
