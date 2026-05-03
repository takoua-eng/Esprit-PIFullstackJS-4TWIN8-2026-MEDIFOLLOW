import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { TablerIconsModule } from 'angular-tabler-icons';

import { UserManagementComponent } from './user-management.component';

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        UserManagementComponent,
        TablerIconsModule.pick({}),
        HttpClientTestingModule,
        NoopAnimationsModule
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load users', () => {
    expect(component.dataSource).toBeDefined();
  });

  it('should open add dialog', () => {
    const dialogSpy = spyOn((component as any).dialog, 'open').and.returnValue({
      afterClosed: () => of(true),
    } as any);
    component.openAdd();
    expect(dialogSpy).toHaveBeenCalled();
  });

  it('should change role and reload', () => {
    component.selectRole('doctor');
    expect(component.selectedRole).toBe('doctor');
  });
});