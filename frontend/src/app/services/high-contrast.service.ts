import { environment } from "src/environments/environment";
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class HighContrastService {
  private readonly KEY = 'high-contrast';
  isEnabled = signal<boolean>(this.load());

  constructor() {
    this.apply(this.isEnabled());
  }

  toggle(): void {
    const next = !this.isEnabled();
    this.isEnabled.set(next);
    localStorage.setItem(this.KEY, String(next));
    this.apply(next);
  }

  private load(): boolean {
    return localStorage.getItem(this.KEY) === 'true';
  }

  private apply(enabled: boolean): void {
    document.documentElement.classList.toggle('high-contrast', enabled);
  }
}
