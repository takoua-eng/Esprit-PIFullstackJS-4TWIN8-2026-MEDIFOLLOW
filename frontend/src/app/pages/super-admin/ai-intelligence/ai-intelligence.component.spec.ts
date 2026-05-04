import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TABLER_TEST_PROVIDERS } from 'src/app/testing/tabler-test-providers';

import { AiIntelligenceComponent } from './ai-intelligence.component';

describe('AiIntelligenceComponent', () => {
  let component: AiIntelligenceComponent;
  let fixture: ComponentFixture<AiIntelligenceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiIntelligenceComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [...TABLER_TEST_PROVIDERS],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AiIntelligenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('should have report types defined', () => {
    expect(component.reportTypes.length).toBeGreaterThan(0);
  });

  it('should start with no result', () => {
    expect(component.result).toBeNull();
    expect(component.loading).toBeFalsy();
  });

  it('should return correct type info', () => {
    const info = component.getTypeInfo('monthly');
    expect(info.key).toBe('monthly');
  });
});
