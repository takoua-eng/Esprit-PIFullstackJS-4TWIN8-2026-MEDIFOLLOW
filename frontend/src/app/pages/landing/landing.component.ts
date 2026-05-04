import { Component } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterModule, MaterialModule, TablerIconComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent {}


