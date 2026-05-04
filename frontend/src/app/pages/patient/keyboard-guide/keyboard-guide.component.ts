import { Component, OnInit, OnDestroy } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { KeyboardAccessibilityService } from 'src/app/services/keyboard-accessibility.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-keyboard-guide',
  standalone: true,
  imports: [CommonModule, MaterialModule, TablerIconComponent],
  templateUrl: './keyboard-guide.component.html',
  styleUrls: ['./keyboard-guide.component.scss'],
})
export class KeyboardGuideComponent implements OnInit, OnDestroy {
  visible = false;
  private sub = Subscription.EMPTY;

  shortcuts = [
    { key: '? or F1', description: 'Show/hide this guide', category: 'General' },
    { key: 'Tab', description: 'Move to next focusable element', category: 'General' },
    { key: 'Shift + Tab', description: 'Move to previous focusable element', category: 'General' },
    { key: 'Enter / Space', description: 'Activate button or link', category: 'General' },
    { key: 'Escape', description: 'Close dialog or this guide', category: 'General' },
    { key: 'Alt + H', description: 'Dashboard (Home)', category: 'Navigation' },
    { key: 'Alt + V', description: 'Vital Parameters', category: 'Navigation' },
    { key: 'Alt + S', description: 'Symptoms', category: 'Navigation' },
    { key: 'Alt + Q', description: 'Questionnaires', category: 'Navigation' },
    { key: 'Alt + A', description: 'Alerts', category: 'Navigation' },
    { key: 'Alt + R', description: 'History', category: 'Navigation' },
    { key: 'Alt + P', description: 'Profile', category: 'Navigation' },
    { key: 'Alt + M', description: 'Messages', category: 'Navigation' },
    { key: 'Arrow keys', description: 'Navigate within lists and menus', category: 'Interaction' },
    { key: 'Enter', description: 'Submit form / confirm', category: 'Interaction' },
  ];

  generalShortcuts = this.shortcuts.filter(s => s.category === 'General');
  navShortcuts = this.shortcuts.filter(s => s.category === 'Navigation');
  interactionShortcuts = this.shortcuts.filter(s => s.category === 'Interaction');

  constructor(private kbService: KeyboardAccessibilityService) {}

  ngOnInit(): void {
    this.sub = this.kbService.shortcutsGuide$.subscribe(v => (this.visible = v));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  close(): void {
    this.kbService.hideGuide();
  }
}
