import { environment } from 'src/environments/environment';
?import { Component, OnInit } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { TranslateModule } from '@ngx-translate/core';
import { UserService } from 'src/app/services/users.service';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, MaterialModule, TranslateModule, TablerIconComponent],
  templateUrl: './admin-profile.component.html',
  styleUrls: ['./admin-profile.component.scss'],
})
export class AdminProfileComponent implements OnInit {

  profile = {
    name: '',
    email: '',
    role: '',
    phone: '',
    service: '',
    hospital: 'MediFollow Demo Hospital',
    avatar: '/assets/images/profile/user-1.jpg',
  };

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile() {
    this.userService.getProfile().subscribe({
      next: (user) => {

        const roleName = (user.role?.name || user.role || '').toLowerCase();
        const prefix = roleName === 'doctor' ? 'Dr. ' : '';
        this.profile = {
          name: `${prefix}${user.lastName} ${user.firstName}`,
          email: user.email,
          role: user.role?.name || user.role,
          phone: user.phone,
          service: user.service?.name || '—',
          hospital: 'MediFollow Demo Hospital',
          avatar: (user.photo && typeof user.photo === 'string' && user.photo !== 'null' && user.photo !== 'undefined' && user.photo !== '')
            ? (user.photo.startsWith('uploads/') || user.photo.startsWith('http') 
               ? `${environment.apiUrl}/${user.photo.replace(/\\/g, '/')}` 
               : `${environment.apiUrl}/uploads/${user.photo.replace(/\\/g, '/')}`)
            : '/assets/images/profile/user-1.jpg'
        };

      },
      error: (err) => {
        console.error('Erreur chargement profil', err);
      }
    });
  }

}