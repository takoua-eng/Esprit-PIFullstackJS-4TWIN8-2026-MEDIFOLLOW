import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MessagesPatientDoctorService {

  private API = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  getCurrentUserId(): string | null {
    const direct = localStorage.getItem('userId');
    if (direct) return direct;

    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const id = payload.sub ?? payload._id ?? payload.id ?? null;
      return id && typeof id === 'object' ? (id.toString ? id.toString() : null) : id;
    } catch (e) {
      console.error('getCurrentUserId: failed to parse token', e);
      return null;
    }
  }

  /** Envoyer un message */
  sendMessage(toUserId: string, content: string): Observable<any> {
    const fromUserId = this.getCurrentUserId();
    if (!fromUserId) {
      console.error('sendMessage: missing fromUserId');
      return throwError(() => new Error('Missing fromUserId'));
    }
    return this.http.post(`${this.API}/messages-patient-doctor`, { fromUserId, toUserId, content });
  }

  /** Conversation entre l'utilisateur connecté et un autre */
  getConversation(otherUserId: string): Observable<any[]> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.error('getConversation: missing current userId');
      return throwError(() => new Error('Missing current userId'));
    }
    return this.http.get<any[]>(`${this.API}/messages-patient-doctor/conversation/${userId}/${otherUserId}`);
  }

  /** Explicit conversation between two IDs (avoid null in URL) */
  getConversationBetween(user1Id: string | null | undefined, user2Id: string | null | undefined): Observable<any[]> {
    const u1 = user1Id ? user1Id.toString() : null;
    const u2 = user2Id ? user2Id.toString() : null;
    if (!u1 || !u2) {
      console.error('getConversationBetween: missing id(s)', { u1, u2 });
      return throwError(() => new Error('Missing user id(s)'));
    }
    return this.http.get<any[]>(`${this.API}/messages-patient-doctor/conversation/${u1}/${u2}`);
  }

  /** Tous les utilisateurs avec qui l'utilisateur connecté a échangé des messages */
  getContacts(): Observable<any[]> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.error('getContacts: missing current userId');
      return throwError(() => new Error('Missing current user id'));
    }
    return this.http.get<any[]>(`${this.API}/messages-patient-doctor/contacts/${userId}`);
  }

  /** Marquer les messages d'un expéditeur comme lus */
  markAsRead(senderId: string): Observable<any> {
    const receiverId = this.getCurrentUserId();
    if (!receiverId) {
      console.error('markAsRead: missing receiver id');
      return throwError(() => new Error('Missing receiver id'));
    }
    return this.http.put(`${this.API}/messages-patient-doctor/mark-read/${senderId}/${receiverId}`, {});
  }

  /** Inbox — tous les messages reçus */
  getInbox(): Observable<any[]> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.error('getInbox: missing user id');
      return throwError(() => new Error('Missing user id'));
    }
    return this.http.get<any[]>(`${this.API}/messages-patient-doctor/inbox/${userId}`);
  }

  /** Liste des docteurs disponibles */
  getDoctors(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/users/doctors`);
  }
}
