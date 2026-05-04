import { TABLER_TEST_PROVIDERS } from 'src/app/testing/tabler-test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AuditorCoordinatorsComponent } from './auditor-coordinators.component';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { API_BASE_URL } from 'src/app/core/api.config';
describe('AuditorCoordinatorsComponent', () => {
  let component: AuditorCoordinatorsComponent;
  let fixture: ComponentFixture<AuditorCoordinatorsComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditorCoordinatorsComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [...TABLER_TEST_PROVIDERS],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditorCoordinatorsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpMock.verify(); });

  it('should create component', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE_URL}/coordinator/all/performance`).flush([]);
    expect(component).toBeTruthy();
  });

  it('should load coordinators data', () => {
    fixture.detectChanges();
    const mockData = [
      {
        rank: 1,
        _id: '1',
        name: 'Coordinator 1',
        email: 'coord1@test.com',
        patientCount: 10,
        completenessRate: 80,
        remindersSent: 5,
        remindersToday: 2,
        avgResponseMin: 45,
      },
      {
        rank: 2,
        _id: '2',
        name: 'Coordinator 2',
        email: 'coord2@test.com',
        patientCount: 20,
        completenessRate: 60,
        remindersSent: 10,
        remindersToday: 3,
        avgResponseMin: 120,
      },
    ];

    const req = httpMock.expectOne(
      `${API_BASE_URL}/coordinator/all/performance`
    );

    expect(req.request.method).toBe('GET');

    req.flush(mockData);

    expect(component.dataSource.data.length).toBe(2);
    expect(component.totalCoordinators).toBe(2);
    expect(component.avgPatients).toBe(15);
    expect(component.avgCompleteness).toBe(70);
    expect(component.totalRemindersToday).toBe(5);
    expect(component.loading).toBeFalse();
  });

  it('should apply filter', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE_URL}/coordinator/all/performance`).flush([]);
    const event = { target: { value: 'test' } } as unknown as Event;
    component.applyFilter(event);
    expect(component.dataSource.filter).toBe('test');
  });

  it('should return green color for completeness >= 80', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE_URL}/coordinator/all/performance`).flush([]);
    expect(component.completenessColor(90)).toBe('#00b894');
  });

  it('should return yellow color for completeness >= 50', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE_URL}/coordinator/all/performance`).flush([]);
    expect(component.completenessColor(60)).toBe('#fdcb6e');
  });

  it('should return red color for completeness < 50', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE_URL}/coordinator/all/performance`).flush([]);
    expect(component.completenessColor(30)).toBe('#d63031');
  });

  it('should format response label in minutes', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE_URL}/coordinator/all/performance`).flush([]);
    expect(component.responseLabel(45)).toBe('45m');
  });

  it('should format response label in hours and minutes', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE_URL}/coordinator/all/performance`).flush([]);
    expect(component.responseLabel(125)).toBe('2h 5m');
  });

  it('should return dash when response time is null', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE_URL}/coordinator/all/performance`).flush([]);
    expect(component.responseLabel(null)).toBe('—');
  });

  it('should return gold icon for first rank', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE_URL}/coordinator/all/performance`).flush([]);
    expect(component.rankIcon(1)).toBe('🥇');
  });

  it('should return silver icon for second rank', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE_URL}/coordinator/all/performance`).flush([]);
    expect(component.rankIcon(2)).toBe('🥈');
  });

  it('should return bronze icon for third rank', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE_URL}/coordinator/all/performance`).flush([]);
    expect(component.rankIcon(3)).toBe('🥉');
  });

  it('should return normal rank for others', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE_URL}/coordinator/all/performance`).flush([]);
    expect(component.rankIcon(4)).toBe('#4');
  });
});