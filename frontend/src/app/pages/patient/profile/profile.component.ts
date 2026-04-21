import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { TranslateModule } from '@ngx-translate/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { UserService } from 'src/app/services/users.service';
import { MatDialog } from '@angular/material/dialog';
import { EditProfileDialogComponent } from './edit-profile-dialog.component';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, MaterialModule, TranslateModule, TablerIconsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfilComponent implements OnInit {

  profile = {
    name: '',
    email: '',
    role: '',
    phone: '',
    service: '',
    hospital: 'MediFollow Demo Hospital',
    avatar: '/assets/images/profile/user-1.jpg',
  };

  // full user object from backend (includes id)
  currentUser: any = null;

  constructor(private userService: UserService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile() {
    this.userService.getProfile().subscribe({
      next: (user) => {

        this.currentUser = user;

        let avatarUrl = '/assets/images/profile/user-1.jpg';
        if (user.photo && typeof user.photo === 'string' && user.photo !== 'null' && user.photo !== 'undefined' && user.photo !== '') {
          const photoPath = user.photo.replace(/\\/g, '/');
          avatarUrl = photoPath.startsWith('uploads/') || photoPath.startsWith('http')
            ? `http://localhost:3000/${photoPath}`
            : `http://localhost:3000/uploads/${photoPath}`;
        }

        this.profile = {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role?.name || user.role,
          phone: user.phone,
          service: user.service?.name || '—',
          hospital: 'MediFollow Demo Hospital',
          avatar: avatarUrl
        };

      },
      error: (err) => {
        console.error('Erreur chargement profil', err);
      }
    });
  }

  openEditDialog(): void {
    const ref = this.dialog.open(EditProfileDialogComponent, {
      width: '640px',
      data: { user: this.currentUser },
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.loadProfile();
      }
    });
  }

}