import { environment } from '../environments/environment';
import { Injectable, signal } from '@angular/core';

/**
 * ZoomService - Gère le zoom de l'application pour l'accessibilité WCAG 2.1
 * Permet de tester la lisibilité à 100%, 125%, 150%, 175%, et 200%
 */
@Injectable({
  providedIn: 'root',
})
export class ZoomService {
  private readonly ZOOM_KEY = 'app-zoom-level';
  private readonly MIN_ZOOM = 100;
  private readonly MAX_ZOOM = 200;
  private readonly ZOOM_STEP = 25;

  // Zoom levels available
  readonly ZOOM_LEVELS = [100, 125, 150, 175, 200];

  // Signal for reactive updates
  zoomLevel = signal<number>(this.getStoredZoomLevel());

  constructor() {
    this.applyZoom(this.zoomLevel());
  }

  /**
   * Get the current zoom level
   */
  getCurrentZoom(): number {
    return this.zoomLevel();
  }

  /**
   * Get the current zoom level as percentage string
   */
  getCurrentZoomPercentage(): string {
    return `${this.zoomLevel()}%`;
  }

  /**
   * Set zoom to a specific level (100-200)
   */
  setZoom(level: number): void {
    // Validate level
    const validLevel = Math.max(this.MIN_ZOOM, Math.min(level, this.MAX_ZOOM));

    // Update signal and storage
    this.zoomLevel.set(validLevel);
    this.saveZoomLevel(validLevel);
    this.applyZoom(validLevel);
  }

  /**
   * Increase zoom by 25%
   */
  zoomIn(): void {
    const currentZoom = this.zoomLevel();
    if (currentZoom < this.MAX_ZOOM) {
      this.setZoom(currentZoom + this.ZOOM_STEP);
    }
  }

  /**
   * Decrease zoom by 25%
   */
  zoomOut(): void {
    const currentZoom = this.zoomLevel();
    if (currentZoom > this.MIN_ZOOM) {
      this.setZoom(currentZoom - this.ZOOM_STEP);
    }
  }

  /**
   * Reset zoom to 100% (normal)
   */
  resetZoom(): void {
    this.setZoom(100);
  }

  /**
   * Check if we can zoom in more
   */
  canZoomIn(): boolean {
    return this.zoomLevel() < this.MAX_ZOOM;
  }

  /**
   * Check if we can zoom out more
   */
  canZoomOut(): boolean {
    return this.zoomLevel() > this.MIN_ZOOM;
  }

  /**
   * Get zoom as ratio (1.0 = 100%, 1.25 = 125%, etc.)
   */
  getZoomRatio(): number {
    return this.zoomLevel() / 100;
  }

  /**
   * Get zoom as CSS transform value
   */
  getZoomTransform(): string {
    return `scale(${this.getZoomRatio()})`;
  }

  /**
   * Apply zoom by setting CSS transform or zoom property
   * Uses both methods for better browser compatibility
   */
  private applyZoom(level: number): void {
    const zoomRatio = level / 100;
    const htmlElement = document.documentElement;

    // Method 1: CSS zoom (simpler, mais peut avoir des limites)
    htmlElement.style.zoom = `${level}%`;

    // Method 2: Transform (pour une meilleure compatibilité)
    // Note: zoom est généralement préféré car il affecte aussi le layout

    // Dispatch custom event for observers
    window.dispatchEvent(
      new CustomEvent('zoom-changed', {
        detail: { level, ratio: zoomRatio },
      }),
    );
  }

  /**
   * Get zoom level from localStorage
   */
  private getStoredZoomLevel(): number {
    try {
      const stored = localStorage.getItem(this.ZOOM_KEY);
      if (stored) {
        const level = parseInt(stored, 10);
        return this.ZOOM_LEVELS.includes(level) ? level : 100;
      }
    } catch (error) {
      console.warn('Could not access localStorage for zoom level', error);
    }
    return 100;
  }

  /**
   * Save zoom level to localStorage
   */
  private saveZoomLevel(level: number): void {
    try {
      localStorage.setItem(this.ZOOM_KEY, level.toString());
    } catch (error) {
      console.warn('Could not save zoom level to localStorage', error);
    }
  }

  /**
   * Clear zoom (reset to 100%)
   */
  clearZoom(): void {
    try {
      localStorage.removeItem(this.ZOOM_KEY);
    } catch (error) {
      console.warn('Could not clear zoom from localStorage', error);
    }
    this.resetZoom();
  }
}
