import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { VoiceAssistantService, VoiceLang } from 'src/app/services/voice-assistant.service';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-voice-assistant',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './voice-assistant.component.html',
  styleUrls: ['./voice-assistant.component.scss'],
})
export class VoiceAssistantComponent implements OnInit, OnDestroy {
  isEnabled = false;
  isListening = false;
  isSpeaking = false;
  assistantText = '';
  userText = '';
  lang: VoiceLang = 'fr';
  showBubble = false;
  isPatientPage = false;

  private subs: Subscription[] = [];

  constructor(
    public va: VoiceAssistantService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Check current route
    this.checkRoute(this.router.url);

    // React to route changes
    this.subs.push(
      this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
        this.checkRoute(e.urlAfterRedirects);
        this.cdr.markForCheck();
      }),
      this.va.isEnabled$.subscribe(v => { this.isEnabled = v; this.cdr.markForCheck(); }),
      this.va.isListening$.subscribe(v => { this.isListening = v; this.cdr.markForCheck(); }),
      this.va.isSpeaking$.subscribe(v => { this.isSpeaking = v; this.cdr.markForCheck(); }),
      this.va.assistantText$.subscribe(v => {
        if (v) { this.assistantText = v; this.showBubble = true; }
        this.cdr.markForCheck();
      }),
      this.va.userText$.subscribe(v => { this.userText = v; this.cdr.markForCheck(); }),
      this.va.lang$.subscribe(v => { this.lang = v; this.cdr.markForCheck(); }),
    );
  }

  private checkRoute(url: string): void {
    this.isPatientPage = url.startsWith('/dashboard/patient');
    // Auto-disable if user navigates away from patient section
    if (!this.isPatientPage && this.va.isEnabled$.value) {
      this.va.disable();
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  onToggle(): void {
    this.va.toggle();
    if (!this.va.isEnabled$.value) {
      this.showBubble = false;
      this.assistantText = '';
      this.userText = '';
    }
  }

  setLang(lang: VoiceLang): void {
    this.va.setLanguage(lang);
  }

  onMicClick(): void {
    if (!this.isEnabled) return;
    if (this.isListening) {
      this.va.stopListening();
    } else {
      this.va.startListening();
    }
  }

  closeBubble(): void {
    this.showBubble = false;
  }
}
