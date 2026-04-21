import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MessagesPatientDoctorService } from 'src/app/services/messages-patient-doctor.service';
import { UsersApiService } from 'src/app/services/users-api.service';

@Component({
  selector: 'app-messages-doctor',
  imports: [CommonModule, FormsModule, DatePipe, MatIconModule],
  templateUrl: './messages-doctor.component.html',
  styleUrl: './messages-doctor.component.scss',
})
export class MessagesDoctorComponent implements OnInit, AfterViewChecked {

  contacts: any[] = [];
  unreadMap: Record<string, number> = {};
  selectedContact: any = null;
  messages: any[] = [];
  newMessage = '';
  loading = false;
  currentUserId: string | null = null;
  patients: any[] = [];
  searchQuery = '';

  @ViewChild('msgEnd') private msgEnd!: ElementRef;

  constructor(
    private msgService: MessagesPatientDoctorService,
    private usersApi: UsersApiService,
  ) {}

  ngOnInit() {
    this.currentUserId = this.msgService.getCurrentUserId();
    this.loadContacts();
    this.loadPatients();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  loadContacts() {
    this.msgService.getContacts().subscribe({
      next: (contacts) => { this.contacts = contacts || []; this.updateUnreadCounts(); },
      error: () => {}
    });
  }

  loadPatients() {
    this.usersApi.getPatients().subscribe({
      next: (pats) => { this.patients = pats || []; this.updateUnreadCounts(); },
      error: () => {},
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
        // annotate contacts and patients
        this.contacts = this.contacts.map(c => ({ ...c, unreadCount: map[c._id?.toString()] || 0 }));
        this.patients = this.patients.map(p => ({ ...p, unreadCount: map[p._id?.toString()] || 0 }));
      },
      error: () => {}
    });
  }

  get displayedList(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    // merge contacts and patients: start with contacts, then add patients not present
    const seen = new Set(this.contacts.map((c: any) => c._id?.toString()));
    const merged = [...this.contacts];
    for (const p of this.patients) {
      const id = p._id?.toString();
      if (!seen.has(id)) merged.push(p);
    }
    // sort: unread first, then by lastMessage timestamp if available, else name
    merged.sort((a: any, b: any) => {
      const ua = (a.unreadCount || 0) > 0 ? 1 : 0;
      const ub = (b.unreadCount || 0) > 0 ? 1 : 0;
      if (ua !== ub) return ub - ua;
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      if (ta !== tb) return tb - ta;
      const na = ((a.firstName||'') + ' ' + (a.lastName||'')).toLowerCase();
      const nb = ((b.firstName||'') + ' ' + (b.lastName||'')).toLowerCase();
      return na.localeCompare(nb);
    });

    if (!q) return merged;
    return merged.filter((u: any) => ((u.firstName||'') + ' ' + (u.lastName||'')).toLowerCase().includes(q));
  }

  selectContact(patient: any) {
    this.selectedContact = patient;
    this.loadMessages();
    this.msgService.markAsRead(patient._id).subscribe({ next: () => this.updateUnreadCounts(), error: () => this.updateUnreadCounts() });
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
      next: () => {
        this.newMessage = '';
        this.loadMessages();
        this.loadContacts();
      },
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

