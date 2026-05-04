import { Component, OnInit } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from 'src/app/material.module';
import {
  ReminderDto,
  RemindersApiService,
} from 'src/app/services/reminders-api.service';

@Component({
  selector: 'app-nurse-reminders',
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    TablerIconComponent,
    TranslateModule,
  ],
  templateUrl: './nurse-reminders.component.html',
  styleUrls: ['./nurse-reminders.component.scss'],
})
export class NurseRemindersComponent implements OnInit {
  loading = true;
  error: string | null = null;
  reminders: ReminderDto[] = [];

  displayedColumns: string[] = [
    'patientName',
    'type',
    'message',
    'status',
    'sentAt',
  ];

  constructor(private readonly remindersApi: RemindersApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.remindersApi.getReminders().subscribe({
      next: (rows) => {
        this.reminders = rows;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load reminders', err);
        const status = err?.status ? `HTTP ${err.status}` : 'Network/API error';
        this.error = status;
        this.loading = false;
      },
    });
  }
}
