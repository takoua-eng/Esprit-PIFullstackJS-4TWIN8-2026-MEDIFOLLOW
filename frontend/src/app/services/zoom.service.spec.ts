import { TestBed } from '@angular/core/testing';
import { ZoomService } from './zoom.service';

describe('ZoomService - WCAG 2.1 Accessibility', () => {
  let service: ZoomService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ZoomService],
    });
    service = TestBed.inject(ZoomService);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with 100% zoom by default', () => {
      expect(service.getCurrentZoom()).toBe(100);
    });

    it('should provide correct zoom levels', () => {
      expect(service.ZOOM_LEVELS).toEqual([100, 125, 150, 175, 200]);
    });
  });

  describe('Zoom Levels', () => {
    it('should set zoom to 125%', () => {
      service.setZoom(125);
      expect(service.getCurrentZoom()).toBe(125);
      expect(service.getCurrentZoomPercentage()).toBe('125%');
    });

    it('should set zoom to 150%', () => {
      service.setZoom(150);
      expect(service.getCurrentZoom()).toBe(150);
    });

    it('should set zoom to 175%', () => {
      service.setZoom(175);
      expect(service.getCurrentZoom()).toBe(175);
    });

    it('should set zoom to 200%', () => {
      service.setZoom(200);
      expect(service.getCurrentZoom()).toBe(200);
      expect(service.getCurrentZoomPercentage()).toBe('200%');
    });

    it('should clamp zoom below minimum to 100%', () => {
      service.setZoom(50);
      expect(service.getCurrentZoom()).toBe(100);
    });

    it('should clamp zoom above maximum to 200%', () => {
      service.setZoom(300);
      expect(service.getCurrentZoom()).toBe(200);
    });
  });

  describe('Zoom Controls', () => {
    it('should zoom in by 25%', () => {
      service.setZoom(100);
      service.zoomIn();
      expect(service.getCurrentZoom()).toBe(125);

      service.zoomIn();
      expect(service.getCurrentZoom()).toBe(150);
    });

    it('should zoom out by 25%', () => {
      service.setZoom(200);
      service.zoomOut();
      expect(service.getCurrentZoom()).toBe(175);

      service.zoomOut();
      expect(service.getCurrentZoom()).toBe(150);
    });

    it('should not zoom in beyond 200%', () => {
      service.setZoom(200);
      service.zoomIn();
      expect(service.getCurrentZoom()).toBe(200);
    });

    it('should not zoom out below 100%', () => {
      service.setZoom(100);
      service.zoomOut();
      expect(service.getCurrentZoom()).toBe(100);
    });

    it('should reset zoom to 100%', () => {
      service.setZoom(200);
      service.resetZoom();
      expect(service.getCurrentZoom()).toBe(100);
    });
  });

  describe('Zoom Checks', () => {
    it('should allow zoom in at 100%', () => {
      service.setZoom(100);
      expect(service.canZoomIn()).toBe(true);
    });

    it('should not allow zoom in at 200%', () => {
      service.setZoom(200);
      expect(service.canZoomIn()).toBe(false);
    });

    it('should not allow zoom out at 100%', () => {
      service.setZoom(100);
      expect(service.canZoomOut()).toBe(false);
    });

    it('should allow zoom out at 200%', () => {
      service.setZoom(200);
      expect(service.canZoomOut()).toBe(true);
    });
  });

  describe('Zoom Calculations', () => {
    it('should return correct zoom ratio for 100%', () => {
      service.setZoom(100);
      expect(service.getZoomRatio()).toBe(1);
    });

    it('should return correct zoom ratio for 150%', () => {
      service.setZoom(150);
      expect(service.getZoomRatio()).toBe(1.5);
    });

    it('should return correct zoom ratio for 200%', () => {
      service.setZoom(200);
      expect(service.getZoomRatio()).toBe(2);
    });

    it('should return correct CSS transform for 100%', () => {
      service.setZoom(100);
      expect(service.getZoomTransform()).toBe('scale(1)');
    });

    it('should return correct CSS transform for 150%', () => {
      service.setZoom(150);
      expect(service.getZoomTransform()).toBe('scale(1.5)');
    });
  });

  describe('Persistence', () => {
    it('should save zoom level to localStorage', () => {
      service.setZoom(175);
      const stored = localStorage.getItem('app-zoom-level');
      expect(stored).toBe('175');
    });

    it('should restore zoom level from localStorage', () => {
      localStorage.setItem('app-zoom-level', '150');
      const newService = TestBed.inject(ZoomService);
      expect(newService.getCurrentZoom()).toBe(150);
    });

    it('should default to 100% if localStorage is empty', () => {
      localStorage.removeItem('app-zoom-level');
      const newService = TestBed.inject(ZoomService);
      expect(newService.getCurrentZoom()).toBe(100);
    });

    it('should ignore invalid stored values', () => {
      localStorage.setItem('app-zoom-level', '999');
      const newService = TestBed.inject(ZoomService);
      expect(newService.getCurrentZoom()).toBe(100);
    });

    it('should clear zoom from localStorage', () => {
      service.setZoom(200);
      service.clearZoom();
      const stored = localStorage.getItem('app-zoom-level');
      expect(stored).toBeNull();
      expect(service.getCurrentZoom()).toBe(100);
    });
  });

  describe('Signal Reactivity', () => {
    it('should update signal when zoom changes', (done) => {
      service.setZoom(100);
      expect(service.zoomLevel()).toBe(100);

      service.setZoom(150);
      expect(service.zoomLevel()).toBe(150);

      done();
    });

    it('should reflect zoom in percentage string', () => {
      service.setZoom(125);
      expect(service.getCurrentZoomPercentage()).toBe('125%');

      service.setZoom(200);
      expect(service.getCurrentZoomPercentage()).toBe('200%');
    });
  });

  describe('CSS Application', () => {
    it('should apply zoom to document root', () => {
      service.setZoom(150);
      const htmlElement = document.documentElement;
      expect(htmlElement.style.zoom).toBe('150%');
    });

    it('should apply zoom to document root for all levels', () => {
      service.ZOOM_LEVELS.forEach((level) => {
        service.setZoom(level);
        const htmlElement = document.documentElement;
        expect(htmlElement.style.zoom).toBe(`${level}%`);
      });
    });
  });

  describe('Custom Events', () => {
    it('should dispatch zoom-changed event', (done) => {
      window.addEventListener('zoom-changed', (event: Event) => {
        const customEvent = event as CustomEvent;
        expect(customEvent.detail.level).toBe(175);
        expect(customEvent.detail.ratio).toBe(1.75);
        done();
      });

      service.setZoom(175);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid zoom changes', () => {
      service.setZoom(100);
      service.zoomIn();
      service.zoomIn();
      service.zoomIn();
      service.zoomIn();
      expect(service.getCurrentZoom()).toBe(200);
    });

    it('should handle mixed operations', () => {
      service.setZoom(100);
      service.zoomIn(); // 125
      service.zoomIn(); // 150
      service.zoomOut(); // 125
      service.setZoom(200); // 200
      service.zoomOut(); // 175
      expect(service.getCurrentZoom()).toBe(175);
    });

    it('should survive localStorage errors gracefully', () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = () => {
        throw new Error('Storage error');
      };

      expect(() => service.setZoom(150)).not.toThrow();

      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('WCAG 2.1 Compliance', () => {
    it('should support zoom up to 200% as per WCAG 2.1', () => {
      service.setZoom(200);
      expect(service.getCurrentZoom()).toBe(200);
      expect(service.getCurrentZoomPercentage()).toBe('200%');
    });

    it('should provide all required zoom levels', () => {
      const levels = [100, 125, 150, 175, 200];
      levels.forEach((level) => {
        service.setZoom(level);
        expect(service.getCurrentZoom()).toBe(level);
      });
    });

    it('should not affect the DOM tree structure at 200%', () => {
      service.setZoom(200);
      const elements = document.querySelectorAll('*');
      const countBefore = elements.length;

      service.zoomOut();
      service.zoomIn();

      const countAfter = document.querySelectorAll('*').length;
      expect(countBefore).toBe(countAfter);
    });
  });
});
