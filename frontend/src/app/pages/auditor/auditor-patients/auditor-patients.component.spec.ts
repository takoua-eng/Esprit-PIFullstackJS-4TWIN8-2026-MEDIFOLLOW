// auditor-patients.component.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AuditorPatientsComponent } from './auditor-patients.component';
import { API_BASE_URL } from 'src/app/core/api.config';

describe('AuditorPatientsComponent', () => {
  let component: AuditorPatientsComponent;
  let fixture: ComponentFixture<AuditorPatientsComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AuditorPatientsComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditorPatientsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should load patients and services', () => {
    const mockData = [
      {
        _id: '1',
        name: 'Ahmed',
        email: 'ahmed@test.com',
        mrn: 'MRN1',
        department: 'Cardio',
        service: 'Cardio',
        coordinatorName: 'Coord1',
        vitalsToday: true,
        symptomsToday: false,
        status: 'OK',
      },
      {
        _id: '2',
        name: 'Ali',
        email: 'ali@test.com',
        mrn: 'MRN2',
        department: 'Neuro',
        service: 'Neuro',
        coordinatorName: 'Coord2',
        vitalsToday: false,
        symptomsToday: false,
        status: 'NO DATA',
      },
    ];

    const req = httpMock.expectOne(
      `${API_BASE_URL}/coordinator/auditor/patients-overview`
    );

    expect(req.request.method).toBe('GET');

    req.flush(mockData);

    expect((component as any).allRows.length).toBe(2);
    expect(component.services.length).toBe(2);
    expect(component.loading).toBeFalse();
  });

  it('should update search text', () => {
    const event = {
      target: { value: 'Ahmed' },
    } as unknown as Event;

    component.onSearch(event);

    expect(component.searchText).toBe('Ahmed');
  });

  it('should return correct status colors', () => {
    expect(component.statusColor('OK')).toBe('#00b894');
    expect(component.statusColor('INCOMPLETE')).toBe('#fdcb6e');
    expect(component.statusColor('NO DATA')).toBe('#d63031');
  });

  it('should calculate status counts correctly', () => {
    (component as any).allRows = [
      { status: 'OK' },
      { status: 'OK' },
      { status: 'INCOMPLETE' },
      { status: 'NO DATA' },
    ] as any;

    expect(component.okCount).toBe(2);
    expect(component.incompleteCount).toBe(1);
    expect(component.noDataCount).toBe(1);
  });

  it('should apply filters without error', () => {
    (component as any).allRows = [
      {
        _id: '1',
        name: 'Ahmed',
        email: 'a@test.com',
        mrn: '123',
        department: 'Cardio',
        service: 'Cardio',
        coordinatorName: 'C1',
        vitalsToday: true,
        symptomsToday: true,
        status: 'OK',
      },
    ] as any;

    component.applyFilters();

    expect(component.dataSource.data.length).toBe(1);
  });
});