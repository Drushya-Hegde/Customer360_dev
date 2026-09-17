import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';
import { CurrentUser } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  login(userId: string, _password = ''): Observable<boolean> {
    return this.http.post<{ token: string; user: CurrentUser }>(`${this.baseUrl}/auth/login`, { userId }).pipe(
      tap(({ token, user }) => {
        localStorage.setItem('c360_token', token);
        localStorage.setItem('c360_user', JSON.stringify(user));
      }),
      map(() => true),
    );
  }

  signup(_name: string, _username: string, _password: string): Observable<boolean> {
    return of(false);
  }

  isAuthenticated(): boolean {
    return Boolean(localStorage.getItem('c360_token'));
  }

  currentUser(): CurrentUser | null {
    try {
      return JSON.parse(localStorage.getItem('c360_user') ?? 'null') as CurrentUser | null;
    } catch {
      return null;
    }
  }

  logout(): void {
    localStorage.removeItem('c360_token');
    localStorage.removeItem('c360_user');
  }
}
