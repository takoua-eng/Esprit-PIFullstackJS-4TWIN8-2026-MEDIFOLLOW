?import { Component, OnInit } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { ZoomService } from 'src/app/services/zoom.service';
import { TranslateModule } from '@ngx-translate/core';

/**
 * ZoomControl Component - Enhanced UI
 * Allows users to test accessibility at different zoom levels (100%-200%)
 * WCAG 2.1 Compliance Tool with improved styling and better UX
 */
@Component({
  selector: 'app-zoom-control',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatIconModule,
    MatDividerModule,
    TablerIconComponent,
    TranslateModule,
  ],
  template: `
    <!-- Simple Zoom Button -->
    <button
      mat-icon-button
      [matMenuTriggerFor]="zoomMenu"
      [attr.aria-label]="'Taille du texte: ' + zoom.getCurrentZoomPercentage()"
      [matTooltip]="'Taille du texte: ' + zoom.getCurrentZoomPercentage() + '%'"
      class="zoom-main-btn"
    >
      <i-tabler name="zoom-in" class="zoom-icon"></i-tabler>
      <span class="zoom-value">{{ zoom.getCurrentZoom() }}</span>
    </button>

    <!-- Simplified Zoom Menu for Elderly Users -->
    <mat-menu #zoomMenu="matMenu" class="zoom-menu-simple">
      <!-- Simple Header -->
      <div class="zoom-header-simple">
        <span class="header-text-simple">Taille du Texte</span>
      </div>

      <mat-divider></mat-divider>

      <!-- Big Easy Buttons for Each Zoom Level -->
      <div class="zoom-buttons-simple">
        <button
          *ngFor="let level of zoom.ZOOM_LEVELS"
          (click)="zoom.setZoom(level)"
          class="zoom-btn-simple"
          [class.active]="zoom.getCurrentZoom() === level"
          [attr.aria-label]="getLevelLabel(level) + ' - ' + level + '%'"
        >
          <span class="btn-label">{{ getLevelLabel(level) }}</span>
          <span class="btn-percent">{{ level }}%</span>
          <mat-icon *ngIf="zoom.getCurrentZoom() === level" class="btn-check"
            >check</mat-icon
          >
        </button>
      </div>

      <mat-divider></mat-divider>

      <!-- Simple Action Buttons -->
      <div class="actions-simple">
        <button
          (click)="zoom.zoomOut()"
          [disabled]="!zoom.canZoomOut()"
          class="action-simple"
          aria-label="Réduire la taille"
        >
          <mat-icon>remove_circle</mat-icon>
          <span>Réduire</span>
        </button>
        <button
          (click)="zoom.resetZoom()"
          class="action-simple reset-simple"
          aria-label="Réinitialiser"
        >
          <mat-icon>restart_alt</mat-icon>
          <span>Normal</span>
        </button>
        <button
          (click)="zoom.zoomIn()"
          [disabled]="!zoom.canZoomIn()"
          class="action-simple"
          aria-label="Augmenter la taille"
        >
          <mat-icon>add_circle</mat-icon>
          <span>Augmenter</span>
        </button>
      </div>
    </mat-menu>
  `,
  styles: [
    `
      /* ===== MAIN BUTTON ===== */
      .zoom-main-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px 12px !important;
        min-width: 70px;
        height: 44px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 16px;
        transition: all 0.2s ease;
        color: #667eea;
        border: 2px solid #667eea;

        &:hover {
          background-color: #667eea;
          color: white;
          transform: scale(1.05);
        }
      }

      .zoom-icon {
        font-size: 24px;
        display: flex;
        align-items: center;
      }

      .zoom-value {
        font-size: 16px;
        font-weight: 800;
        min-width: 28px;
        text-align: center;
      }

      /* ===== MENU CONTAINER ===== */
      .zoom-menu-simple {
        min-width: 360px !important;
        border-radius: 12px !important;
      }

      /* ===== HEADER ===== */
      .zoom-header-simple {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        text-align: center;
        border-radius: 12px 12px 0 0;
      }

      .header-text-simple {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 0.5px;
      }

      /* ===== DIVIDER ===== */
      mat-divider {
        margin: 12px 0 !important;
      }

      /* ===== BIG ZOOM BUTTONS ===== */
      .zoom-buttons-simple {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 16px;
      }

      .zoom-btn-simple {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        width: 100% !important;
        padding: 18px 16px !important;
        background: #f5f5f5;
        border: 3px solid #ddd;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 16px;
        font-weight: 600;
        color: #333;

        &:hover {
          background: #efefef;
          border-color: #667eea;
          transform: translateX(4px);
        }

        &.active {
          background: linear-gradient(135deg, #667eea15, #764ba215);
          border-color: #667eea;
          color: #667eea;
          font-weight: 700;
        }

        .btn-label {
          font-size: 18px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
        }

        .btn-percent {
          font-size: 16px;
          font-weight: 800;
          color: #667eea;
          min-width: 55px;
          text-align: right;
        }

        .btn-check {
          margin-left: 12px;
          color: #38a169;
          font-size: 28px !important;
          width: 28px !important;
          height: 28px !important;
        }
      }

      /* ===== SIMPLE ACTION BUTTONS ===== */
      .actions-simple {
        display: flex;
        gap: 10px;
        padding: 16px;
        justify-content: center;
        align-items: center;
      }

      .action-simple {
        display: flex !important;
        flex-direction: column;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px;
        padding: 12px 20px !important;
        background: white;
        border: 2px solid #999;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 13px;
        font-weight: 600;
        color: #333;
        flex: 1;
        min-width: 90px;

        mat-icon {
          font-size: 32px !important;
          width: 32px !important;
          height: 32px !important;
          color: #667eea;
        }

        &:hover:not([disabled]) {
          background: #667eea;
          color: white;
          border-color: #667eea;
          transform: scale(1.08);

          mat-icon {
            color: white;
          }
        }

        &[disabled] {
          opacity: 0.4;
          cursor: not-allowed;
          background: #f0f0f0;
        }

        span {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }

      .reset-simple {
        background: linear-gradient(
          135deg,
          rgba(248, 192, 118, 0.15),
          rgba(249, 115, 116, 0.1)
        );
        border-color: #f8c076;

        mat-icon {
          color: #f8c076;
        }

        &:hover {
          background: linear-gradient(135deg, #f8c076, #f97374);
          border-color: #f8c076;

          mat-icon {
            color: white;
          }
        }
      }

      /* ===== ACCESSIBILITY ===== */
      :host ::ng-deep {
        .mat-mdc-menu-content {
          padding: 0 !important;
        }

        .mat-mdc-menu-panel {
          border-radius: 12px !important;
        }
      }

      /* ===== FOCUS & ACCESSIBILITY ===== */
      .zoom-main-btn,
      .zoom-btn-simple,
      .action-simple {
        &:focus-visible {
          outline: 3px solid #667eea !important;
          outline-offset: 2px;
        }
      }
    `,
  ],
})
export class ZoomControlComponent implements OnInit {
  constructor(readonly zoom: ZoomService) {}

  ngOnInit(): void {
    // Component uses ZoomService signals for full reactivity
    // Zoom level persists in localStorage automatically
  }

  /**
   * Get descriptive label for zoom level
   */
  getLevelLabel(level: number): string {
    const labels: { [key: number]: string } = {
      100: 'Normal',
      125: 'Comfortable',
      150: 'Large',
      175: 'Very Large',
      200: 'Extra Large',
    };
    return labels[level] || 'Custom';
  }
}
