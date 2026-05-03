import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';

import { SuperAdminProfileComponent } from './superadmin-profile.component';

describe('SuperAdminProfileComponent', () => {
  let component: SuperAdminProfileComponent;
  let fixture: ComponentFixture<SuperAdminProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperAdminProfileComponent, NoopAnimationsModule, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(SuperAdminProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('should have superAdmin data defined', () => {
    expect(component.superAdmin).toBeDefined();
    expect(component.superAdmin.role).toBe('Super Admin');
  });
});
