import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatButtonModule
  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;
  resetForm: FormGroup;
  isLoading = false;
  message = '';
  step = 1; // 1 = enter email, 2 = enter code + new password
  userEmail = ''; // To remember for visual or logic

  private backendUrl = 'http://localhost:3000/auth';

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
    this.resetForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(4)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  submit() {
    if (this.forgotForm.valid) {
      this.isLoading = true;
      this.userEmail = this.forgotForm.value.email;

      this.http.post<{ success: boolean; message: string }>(`${this.backendUrl}/forgot-password`, { email: this.userEmail })
        .subscribe({
          next: (res) => {
            this.isLoading = false;
            this.message = '';
            this.step = 2; // Move to enter code
          },
          error: (err) => {
            this.isLoading = false;
            this.message = err.error?.message || 'Something went wrong.';
          }
        });
    }
  }

  submitReset() {
    if (this.resetForm.valid) {
      this.isLoading = true;
      const { code, newPassword } = this.resetForm.value;

      this.http.post<{ message: string }>(`${this.backendUrl}/reset-password`, { token: code, newPassword })
        .subscribe({
          next: (res) => {
            this.isLoading = false;
            this.message = 'Password reset successfully! Redirecting...';
            setTimeout(() => this.router.navigate(['/authentication/login']), 2000);
          },
          error: (err) => {
            this.isLoading = false;
            this.message = err.error?.message || 'Invalid code or something went wrong.';
          }
        });
    }
  }
}