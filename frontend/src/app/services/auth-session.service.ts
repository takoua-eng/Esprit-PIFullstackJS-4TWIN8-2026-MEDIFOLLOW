import { environment } from "src/environments/environment";
import { Injectable } from '@angular/core';

const ROLE_KEY = 'medi_follow_user_role';
const USER_DATA_KEY = 'medi_follow_user_data';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  setRole(role: string): void {
    localStorage.setItem(ROLE_KEY, role);
  }

  getRole(): string | null {
    return localStorage.getItem(ROLE_KEY);
  }

  setUser(user: any): void {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  }

  getUser(): any {
    const data = localStorage.getItem(USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
  }

  clearSession(): void {
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USER_DATA_KEY);
  }
}
