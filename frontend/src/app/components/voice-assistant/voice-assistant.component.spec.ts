import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { VoiceAssistantComponent } from './voice-assistant.component';

describe('VoiceAssistantComponent', () => {
  let component: VoiceAssistantComponent;
  let fixture: ComponentFixture<VoiceAssistantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VoiceAssistantComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VoiceAssistantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
