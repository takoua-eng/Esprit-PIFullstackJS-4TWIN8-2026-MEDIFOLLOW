import { Injectable, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

export interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
}

@Injectable({ providedIn: 'root' })
export class KeyboardAccessibilityService {
  private shortcutsGuideVisible = new BehaviorSubject<boolean>(false);
  shortcutsGuide$ = this.shortcutsGuideVisible.asObservable();

  private shortcuts: KeyboardShortcut[] = [];

  constructor(private router: Router) {
    this.initGlobalShortcuts();
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
  }

  private initGlobalShortcuts(): void {
    this.shortcuts = [
      {
        key: '? or F1',
        description: 'Show/hide keyboard shortcuts guide',
        action: () => this.toggleGuide(),
      },
      {
        key: 'Alt + H',
        description: 'Go to Dashboard (Home)',
        action: () => this.router.navigate(['/dashboard/patient/dashboard']),
      },
      {
        key: 'Alt + V',
        description: 'Go to Vital Parameters',
        action: () => this.router.navigate(['/dashboard/patient/parameters']),
      },
      {
        key: 'Alt + S',
        description: 'Go to Symptoms',
        action: () => this.router.navigate(['/dashboard/patient/symptoms']),
      },
      {
        key: 'Alt + Q',
        description: 'Go to Questionnaires',
        action: () => this.router.navigate(['/dashboard/patient/questionnaires']),
      },
      {
        key: 'Alt + A',
        description: 'Go to Alerts',
        action: () => this.router.navigate(['/dashboard/patient/alerts']),
      },
      {
        key: 'Alt + R',
        description: 'Go to History',
        action: () => this.router.navigate(['/dashboard/patient/history']),
      },
      {
        key: 'Alt + P',
        description: 'Go to Profile',
        action: () => this.router.navigate(['/dashboard/patient/profile']),
      },
      {
        key: 'Alt + M',
        description: 'Go to Messages',
        action: () => this.router.navigate(['/dashboard/patient/messages']),
      },
      {
        key: 'Escape',
        description: 'Close dialog / guide',
        action: () => this.shortcutsGuideVisible.next(false),
      },
    ];
  }

  private handleGlobalKeydown(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    const isTyping = ['input', 'textarea', 'select'].includes(tag);

    // ? key — only when not typing
    if (event.key === '?' && !isTyping) {
      event.preventDefault();
      this.toggleGuide();
      return;
    }

    // F1
    if (event.key === 'F1') {
      event.preventDefault();
      this.toggleGuide();
      return;
    }

    // Escape — close guide
    if (event.key === 'Escape') {
      this.shortcutsGuideVisible.next(false);
      return;
    }

    // Ctrl shortcuts — doctor / nurse navigation
    if (event.ctrlKey && !event.altKey && !event.shiftKey && !isTyping) {
      const url = this.router.url;
      if (url.startsWith('/dashboard/doctor')) {
        switch (event.key.toLowerCase()) {
          case 'd': event.preventDefault(); this.router.navigate(['/dashboard/doctor']); break;
          case 'a': event.preventDefault(); this.router.navigate(['/dashboard/doctor/alerts']); break;
          case 'h': event.preventDefault(); this.router.navigate(['/dashboard/doctor/history']); break;
          case 'p': event.preventDefault(); this.router.navigate(['/dashboard/doctor/prescriptions']); break;
          case 'm': event.preventDefault(); this.router.navigate(['/dashboard/doctor/messages']); break;
        }
      } else if (url.startsWith('/dashboard/nurse')) {
        switch (event.key.toLowerCase()) {
          case 'd': event.preventDefault(); this.router.navigate(['/dashboard/nurse']); break;
          case 'a': event.preventDefault(); this.router.navigate(['/dashboard/nurse/alerts']); break;
          case 'r': event.preventDefault(); this.router.navigate(['/dashboard/nurse/reminders']); break;
          case 'm': event.preventDefault(); this.router.navigate(['/dashboard/nurse/medical-file']); break;
          case 'p': event.preventDefault(); this.router.navigate(['/dashboard/profile']); break;
        }
      }
    }

    // Alt shortcuts — navigation
    if (event.altKey) {
      switch (event.key.toLowerCase()) {
        case 'h':
          event.preventDefault();
          this.router.navigate(['/dashboard/patient/dashboard']);
          break;
        case 'v':
          event.preventDefault();
          this.router.navigate(['/dashboard/patient/parameters']);
          break;
        case 's':
          event.preventDefault();
          this.router.navigate(['/dashboard/patient/symptoms']);
          break;
        case 'q':
          event.preventDefault();
          this.router.navigate(['/dashboard/patient/questionnaires']);
          break;
        case 'a':
          event.preventDefault();
          this.router.navigate(['/dashboard/patient/alerts']);
          break;
        case 'r':
          event.preventDefault();
          this.router.navigate(['/dashboard/patient/history']);
          break;
        case 'p':
          event.preventDefault();
          this.router.navigate(['/dashboard/patient/profile']);
          break;
        case 'm':
          event.preventDefault();
          this.router.navigate(['/dashboard/patient/messages']);
          break;
      }
    }
  }

  toggleGuide(): void {
    this.shortcutsGuideVisible.next(!this.shortcutsGuideVisible.value);
  }

  hideGuide(): void {
    this.shortcutsGuideVisible.next(false);
  }

  getShortcuts(): KeyboardShortcut[] {
    return this.shortcuts;
  }
}
   