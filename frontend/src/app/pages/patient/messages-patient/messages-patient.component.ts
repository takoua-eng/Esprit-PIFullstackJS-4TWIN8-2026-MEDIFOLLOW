import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MessagesPatientDoctorService } from 'src/app/services/messages-patient-doctor.service';

@Component({
  selector: 'app-messages-patient',
  imports: [CommonModule, FormsModule, DatePipe, MatIconModule],
  templateUrl: './messages-patient.component.html',
  styleUrl: './messages-patient.component.scss',
})
export class MessagesPatientComponent implements OnInit, AfterViewChecked {

  private doctors: any[] = [];
  unreadMap: Record<string, number> = {};
  selectedContact: any = null;
  messages: any[] = [];
  newMessage = '';
  searchQuery = '';
  loading = false;
  currentUserId: string | null = null;

  @ViewChild('msgEnd') private msgEnd!: ElementRef;

  constructor(private msgService: MessagesPatientDoctorService) {}

  ngOnInit() {
    this.currentUserId = this.msgService.getCurrentUserId();
    this.loadDoctors();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  get filteredDoctors(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    // annotate and sort: unread first then name
    const list = this.doctors.map(d => ({ ...d, unreadCount: this.unreadMap[d._id?.toString()] || 0 }));
    list.sort((a: any, b: any) => {
      const ua = (a.unreadCount || 0) > 0 ? 1 : 0;
      const ub = (b.unreadCount || 0) > 0 ? 1 : 0;
      if (ua !== ub) return ub - ua;
      const na = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nb = `${b.firstName} ${b.lastName}`.toLowerCase();
      return na.localeCompare(nb);
    });
    if (!q) return list;
    return list.filter(d => `${d.firstName} ${d.lastName}`.toLowerCase().includes(q));
  }

  loadDoctors() {
    this.msgService.getDoctors().subscribe({
      next: (docs) => { this.doctors = docs || []; this.updateUnreadCounts(); },
      error: () => {}
    });
  }

  private updateUnreadCounts() {
    const uid = this.currentUserId || this.msgService.getCurrentUserId();
    if (!uid) return;
    this.msgService.getInbox().subscribe({
      next: (msgs: any[]) => {
        const map: Record<string, number> = {};
        for (const m of msgs || []) {
          const from = m.fromUserId?._id ? m.fromUserId._id.toString() : (m.fromUserId || '').toString();
          if (!from) continue;
          if (!m.isRead) map[from] = (map[from] || 0) + 1;
        }
        this.unreadMap = map;
      },
      error: () => {}
    });
  }

  selectContact(doc: any) {
    this.selectedContact = doc;
    this.loadMessages();
    this.msgService.markAsRead(doc._id).subscribe({ next: () => this.updateUnreadCounts(), error: () => this.updateUnreadCounts() });
  }

  loadMessages() {
    if (!this.selectedContact) return;
    this.loading = true;
    this.msgService.getConversationBetween(this.currentUserId, this.selectedContact._id).subscribe({
      next: (msgs) => { this.messages = msgs; this.loading = false; },
      error: (err) => { console.error('loadMessages', err); this.loading = false; }
    });
  }

  send() {
    if (!this.newMessage.trim() || !this.selectedContact) return;
    if (!this.currentUserId) { console.error('send: missing currentUserId'); this.currentUserId = this.msgService.getCurrentUserId(); if (!this.currentUserId) return; }
    this.msgService.sendMessage(this.selectedContact._id, this.newMessage).subscribe({
      next: () => { this.newMessage = ''; this.loadMessages(); },
      error: (err) => { console.error('send error', err); }
    });
  }

  isMine(msg: any): boolean {
    const id = this.currentUserId;
    return (
      msg.fromUserId === id ||
      msg.fromUserId?._id === id ||
      msg.fromUserId?.toString() === id
    );
  }

  initials(user: any): string {
    if (!user) return '?';
    return ((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase();
  }

  private scrollToBottom() {
    try { this.msgEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' }); } catch {}
  }
}

