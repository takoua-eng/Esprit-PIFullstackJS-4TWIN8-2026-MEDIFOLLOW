import { environment } from 'src/environments/environment';
import { Component, OnInit } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { TranslateModule } from '@ngx-translate/core';
import { UserService } from 'src/app/services/users.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ChangePasswordDialogComponent } from './change-password-dialog/change-password-dialog.component';
import { EditProfileDialogComponent } from './edit-profile-dialog/edit-profile-dialog.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, MaterialModule, TranslateModule, TablerIconComponent, MatDialogModule],
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.scss'],
})
export class ProfilComponent implements OnInit {

  rawUserData: any = null;

  profile = {
    name: 'Chargement...',
    email: '',
    role: '',
    phone: '',
    service: '',
    hospital: 'MediFollow Demo Hospital',
    avatar: null as string | null,
    initials: '',
  };

  constructor(private userService: UserService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  openChangePasswordDialog(): void {
    if (!this.profile.email) return;
    this.dialog.open(ChangePasswordDialogComponent, {
      width: '450px',
      data: { email: this.profile.email }
    });
  }

  openEditProfileDialog(): void {
    if (!this.rawUserData) return;
    const dialogRef = this.dialog.open(EditProfileDialogComponent, {
      width: '500px',
      data: {
        user: this.rawUserData,
        currentAvatarUrl: this.profile.avatar,
        computedInitials: this.profile.initials
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Reload fresh data from API
        this.loadProfile();
      }
    });
  }

  loadProfile() {
    // 1. Charger imm�diatement depuis le localStorage pour �viter l'effet "vide"
    const localData = localStorage.getItem('medi_follow_user_data');
    if (localData) {
      try {
        const parsedData = JSON.parse(localData);
        this.updateProfileState(parsedData);
      } catch (e) {
        console.error('Erreur parsing localStorage', e);
      }
    }

    // 2. Mettre à jour avec les donn�es fra�ches de l'API
    this.userService.getProfile().subscribe({
      next: (user) => {
        if (user) {
          this.updateProfileState(user);
          // Mettre à jour le cache local si n�cessaire
          localStorage.setItem('medi_follow_user_data', JSON.stringify(user));
        }
      },
      error: (err) => {
        console.error('Erreur chargement profil API, utilisation des donn�es locales', err);
      }
    });
  }

  private updateProfileState(user: any) {
    this.rawUserData = user;
    let avatarUrl: string | null = null;
    
    // G�rer l'URL de la photo
    const photoSource = user.photo || user.image || user.avatar;
    if (photoSource && typeof photoSource === 'string' && photoSource !== 'null' && photoSource !== 'undefined' && photoSource !== '') {
      const photoPath = photoSource.replace(/\\/g, '/');
      if (photoPath.startsWith('http')) {
        avatarUrl = photoPath;
      } else if (photoPath.startsWith('uploads/')) {
        avatarUrl = `http://localhost:3000/${photoPath}`;
      } else {
        avatarUrl = `http://localhost:3000/uploads/${photoPath}`;
      }
    }

    // Construire le nom
    const fName = user.firstName || user.name || '';
    const lName = user.lastName || '';

    // Construire le r�le
    const userRole = user.role?.name || user.role || localStorage.getItem('user_role') || 'User';

    // Ajouter Dr. pour les m�decins
    const isDoctor = userRole.toLowerCase() === 'doctor';
    const prefix = isDoctor ? 'Dr. ' : '';
    const fullName = `${prefix}${lName} ${fName}`.trim() || 'Utilisateur';

    // Calculer les initiales
    let computedInitials = 'U';
    if (fName && lName) {
      computedInitials = (fName.charAt(0) + lName.charAt(0)).toUpperCase();
    } else if (fName) {
      computedInitials = fName.substring(0, 2).toUpperCase();
    } else if (user.email) {
      computedInitials = user.email.substring(0, 2).toUpperCase();
    }

    this.profile = {
      name: fullName,
      email: user.email || 'Non renseign�',
      role: userRole,
      phone: user.phone || user.telephone || 'Non renseign�',
      service: user.service?.name || user.service || 'Non sp�cifi�',
      hospital: 'MediFollow Demo Hospital',
      avatar: avatarUrl,
      initials: computedInitials
    };
  }

}