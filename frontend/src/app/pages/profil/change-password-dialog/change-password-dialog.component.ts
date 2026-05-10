import { Component, Inject, OnInit } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TablerIconComponent
  ],
  templateUrl: './change-password-dialog.component.html',
  styleUrls: ['./change-password-dialog.component.scss']
})
export class ChangePasswordDialogComponent implements OnInit {
  form: FormGroup;
  isLoading = false;
  isSendingEmail = true;
  message = '';
  isError = false;

  // Variables pour l'affichage/masquage des mots de passe
  hideCurrent = true;
  hideNew = true;
  hideConfirm = true;

  private backendUrl = `${environment.apiUrl}/auth`;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public dialogRef: MatDialogRef<ChangePasswordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { email: string }
  ) {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(4)]],
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Dès l'ouverture, on envoie le code de vérification
    this.sendVerificationCode();
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('newPassword')?.value;
    const confirm = control.get('confirmPassword')?.value;
    if (password !== confirm) {
      control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  sendVerificationCode() {
    this.isSendingEmail = true;
    this.message = 'Envoi du code en cours...';
    this.isError = false;

    this.http.post<{ success: boolean; message: string }>(`${this.backendUrl}/forgot-password`, { email: this.data.email })
      .subscribe({
        next: () => {
          this.isSendingEmail = false;
          this.message = 'Un code de vérification a été envoyé à votre email.';
          this.isError = false;
        },
        error: (err) => {
          this.isSendingEmail = false;
          this.message = err.error?.message || 'Erreur lors de l\'envoi de l\'email.';
          this.isError = true;
        }
      });
  }

  submit() {
    if (this.form.valid) {
      this.isLoading = true;
      this.message = '';
      this.isError = false;

      const { code, currentPassword, newPassword } = this.form.value;

      this.http.post<{ message: string }>(`${this.backendUrl}/change-password`, {
        email: this.data.email,
        token: code,
        currentPassword,
        newPassword
      }).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.message = 'Mot de passe modifié avec succès !';
          this.isError = false;
          setTimeout(() => this.dialogRef.close(true), 1500);
        },
        error: (err) => {
          this.isLoading = false;
          this.message = err.error?.message || 'Erreur lors de la modification du mot de passe.';
          this.isError = true;
        }
      });
    }
  }

  close() {
    this.dialogRef.close(false);
  }
}
