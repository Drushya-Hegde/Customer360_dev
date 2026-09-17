import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule, MatIconModule],
  template: `
    <div class="login-page">
      <mat-card class="login-card">
        <div class="brand-block">
          <div class="brand-mark">L</div>
          <div>
            <p class="eyebrow">LEDGER</p>
            <h1>Customer 360</h1>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="full-width" *ngIf="isSignup">
            <mat-label>Full name</mat-label>
            <input matInput formControlName="name" placeholder="Rohan Mehta" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ isSignup ? 'Email or username' : 'Username' }}</mat-label>
            <input matInput formControlName="username" placeholder="r.mehta" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password" placeholder="admin123" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" *ngIf="isSignup">
            <mat-label>Confirm password</mat-label>
            <input matInput type="password" formControlName="confirmPassword" />
          </mat-form-field>

          <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>

          <button mat-flat-button color="primary" class="submit-btn" type="submit" [disabled]="form.invalid || loading">
            {{ loading ? (isSignup ? 'Creating account...' : 'Signing in...') : (isSignup ? 'Create account' : 'Login') }}
          </button>
          <button mat-button type="button" class="mode-toggle" (click)="toggleMode()">
            {{ isSignup ? 'Already have an account? Login' : 'New here? Create an account' }}
          </button>
        </form>
      </mat-card>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .login-page {
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #0f1d22 0%, #18363f 42%, #e5e8dd 100%);
      padding: 24px;
    }
    .login-card {
      width: min(420px, 100%);
      padding: 28px 26px 22px;
      border-radius: 20px;
      box-shadow: 0 24px 60px rgba(7, 20, 23, 0.25);
      background: rgba(255,255,255,0.96);
    }
    .brand-block {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    .brand-mark {
      display: grid;
      place-items: center;
      width: 50px;
      height: 50px;
      border-radius: 14px;
      background: linear-gradient(135deg, #d98d5d, #b25f2c);
      color: #fff;
      font-size: 27px;
      font-weight: 700;
    }
    .eyebrow {
      margin: 0 0 6px;
      font-size: 11px;
      letter-spacing: 0.18em;
      color: #7d8f92;
      font-weight: 700;
    }
    h1 {
      margin: 0;
      font-size: 30px;
      color: #17343b;
    }
    .full-width {
      width: 100%;
      display: block;
      margin-bottom: 8px;
    }
    .submit-btn {
      width: 100%;
      margin-top: 10px;
      height: 48px;
      font-weight: 700;
    }
    .error {
      margin: 8px 0 0;
      min-height: 20px;
      color: #b42318;
      font-size: 13px;
    }
    .mode-toggle { width: 100%; margin-top: 8px; color: #28756d; }
  `]
})
export class LoginComponent {
  @Output() loggedIn = new EventEmitter<void>();

  readonly form = this.fb.group({
    name: [''],
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    confirmPassword: [''],
  });

  loading = false;
  errorMessage = '';
  isSignup = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, password } = this.form.getRawValue();
    const { name, confirmPassword } = this.form.getRawValue();
    if (this.isSignup && (!name?.trim() || password !== confirmPassword)) {
      this.errorMessage = !name?.trim() ? 'Please enter your full name.' : 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const request$ = this.isSignup
      ? this.authService.signup(name ?? '', username ?? '', password ?? '')
      : this.authService.login(username ?? '', password ?? '');

    request$.subscribe({
      next: (ok) => {
        this.loading = false;
        if (ok) {
          this.loggedIn.emit();
          return;
        }

        this.errorMessage = this.isSignup ? 'That username is already registered.' : 'Invalid username or password.';
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to sign in right now. Please try again.';
      },
    });
  }

  toggleMode(): void {
    this.isSignup = !this.isSignup;
    this.errorMessage = '';
    this.form.reset({ username: '', password: '', name: '', confirmPassword: '' });
  }
}
