import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MaterialModule } from 'src/app/material.module';
import { API_BASE_URL } from 'src/app/core/api.config';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-force-change-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MaterialModule,
    MatSnackBarModule,
    HttpClientModule,
  ],
  template: `
    <div class="fcp-backdrop">
      <div class="fcp-container">
        <!-- Icon -->
        <div class="fcp-icon-wrapper">
          <mat-icon class="fcp-icon">lock_reset</mat-icon>
        </div>

        <h2 class="fcp-title">Première connexion détectée</h2>
        <p class="fcp-subtitle">
          Pour sécuriser votre compte, vous devez définir un nouveau mot de passe
          avant de continuer.
        </p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="fcp-form">
          <!-- New password -->
          <mat-form-field appearance="outline" class="fcp-field">
            <mat-label>Nouveau mot de passe</mat-label>
            <input
              matInput
              [type]="showNew ? 'text' : 'password'"
              formControlName="newPassword"
              autocomplete="new-password"
            />
            <button mat-icon-button matSuffix type="button" (click)="showNew = !showNew">
              <mat-icon>{{ showNew ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-error *ngIf="f['newPassword'].hasError('required')">Champ requis</mat-error>
            <mat-error *ngIf="f['newPassword'].hasError('minlength')">
              Minimum 8 caractères
            </mat-error>
          </mat-form-field>

          <!-- Confirm password -->
          <mat-form-field appearance="outline" class="fcp-field">
            <mat-label>Confirmer le mot de passe</mat-label>
            <input
              matInput
              [type]="showConfirm ? 'text' : 'password'"
              formControlName="confirmPassword"
              autocomplete="new-password"
            />
            <button mat-icon-button matSuffix type="button" (click)="showConfirm = !showConfirm">
              <mat-icon>{{ showConfirm ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-error *ngIf="form.hasError('mismatch') && f['confirmPassword'].touched">
              Les mots de passe ne correspondent pas
            </mat-error>
          </mat-form-field>

          <!-- Error message -->
          <div class="fcp-error" *ngIf="errorMsg">{{ errorMsg }}</div>

          <!-- Submit -->
          <button
            mat-flat-button
            color="primary"
            type="submit"
            class="fcp-submit"
            [disabled]="loading"
          >
            <mat-spinner diameter="20" *ngIf="loading" style="display:inline-block;margin-right:8px;"></mat-spinner>
            {{ loading ? 'Enregistrement...' : 'Confirmer le mot de passe' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .fcp-backdrop {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
    }
    .fcp-container {
      background: linear-gradient(135deg, #1a1f3c 0%, #212544 100%);
      border-radius: 20px;
      padding: 40px 36px;
      max-width: 460px;
      width: 100%;
      text-align: center;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5);
      border: 1px solid rgba(93, 135, 255, 0.2);
    }
    .fcp-icon-wrapper {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, #5d87ff, #4570ea);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      box-shadow: 0 8px 24px rgba(93, 135, 255, 0.4);
    }
    .fcp-icon {
      color: white;
      font-size: 36px;
      width: 36px;
      height: 36px;
    }
    .fcp-title {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 10px;
    }
    .fcp-subtitle {
      color: rgba(255,255,255,0.65);
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 28px;
    }
    .fcp-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .fcp-field {
      width: 100%;
    }
    .fcp-field ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      color: rgba(255,255,255,0.5);
    }
    .fcp-error {
      background: rgba(250, 137, 107, 0.15);
      border: 1px solid rgba(250, 137, 107, 0.4);
      border-radius: 8px;
      color: #fa896b;
      font-size: 13px;
      padding: 10px 14px;
      margin-top: 4px;
    }
    .fcp-submit {
      height: 48px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      margin-top: 12px;
      background: linear-gradient(135deg, #5d87ff, #4570ea) !important;
      letter-spacing: 0.3px;
    }
    .fcp-submit:disabled {
      opacity: 0.7;
    }
  `],
})
export class ForceChangePasswordComponent {
  form: FormGroup;
  loading = false;
  errorMsg = '';
  showNew = false;
  showConfirm = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ForceChangePasswordComponent>,
    private http: HttpClient,
    private snackBar: MatSnackBar,
  ) {
    this.dialogRef.disableClose = true; // Cannot close without changing password

    this.form = this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordMatchValidator },
    );
  }

  get f() {
    return this.form.controls;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const token = localStorage.getItem('accessToken');

    this.http
      .post(
        `${API_BASE_URL}/auth/first-login-change-password`,
        { newPassword: this.form.value.newPassword },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.snackBar.open('Mot de passe mis à jour avec succès !', 'Fermer', {
            duration: 4000,
            panelClass: ['snack-success'],
          });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          this.errorMsg =
            err?.error?.message || 'Erreur lors de la mise à jour du mot de passe';
        },
      });
  }
}
