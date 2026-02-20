import { Injectable, signal, inject, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { DbService } from './db.service';
import { I18nService } from './i18n.service';
import { LocalLinkPipe } from '../core/pipes/local-link.pipe';
import { TOUR_STEPS } from '../core/tour.config';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TourService {
  private router = inject(Router);
  private db = inject(DbService);
  private i18n = inject(I18nService);
  private localLink = new LocalLinkPipe();
  readonly steps = inject(TOUR_STEPS);

  private readonly TOUR_DISMISSED_KEY = 'utildex-tour-dismissed';

  isActive = signal(false);
  currentStepIndex = signal(0);
  hasBeenDismissed = signal(true);
  
  private actionSubject = new Subject<string>();
  actionEvents$ = this.actionSubject.asObservable();
  
  private targets = new Map<string, ElementRef<HTMLElement>>();
  currentTargetRect = signal<DOMRect | null>(null);
  currentTargetElement = signal<HTMLElement | null>(null);

  constructor() {
    this.loadDismissedState();
  }

  private async loadDismissedState() {
    try {
      const dismissed = await this.db.config.read(this.TOUR_DISMISSED_KEY);
      this.hasBeenDismissed.set(!!dismissed);
    } catch (e) {
      console.error('Failed to load tour state', e);
    }
  }

  registerTarget(id: string, element: ElementRef<HTMLElement>) {
    this.targets.set(id, element);
    this.updateTargetRect();
  }

  unregisterTarget(id: string) {
    this.targets.delete(id);
    if (this.isActive()) {
      const step = this.steps[this.currentStepIndex()];
      if (step.id === id) {
        this.currentTargetRect.set(null);
        this.currentTargetElement.set(null);
      }
    }
  }

  async startTour() {
    this.isActive.set(true);
    this.currentStepIndex.set(0);
    await this.navigateToCurrentStep();
  }

  async nextStep() {
    if (this.currentStepIndex() < this.steps.length - 1) {
      this.currentStepIndex.update(i => i + 1);
      await this.navigateToCurrentStep();
    } else {
      this.endTour();
    }
  }

  async endTour() {
    this.isActive.set(false);
    this.hasBeenDismissed.set(true);
    await this.db.config.write(this.TOUR_DISMISSED_KEY, true);
    
    const routeCommands = this.localLink.transform('/') as string[];
    await this.router.navigate(routeCommands);
  }

  cancelTour() {
    this.isActive.set(false);
  }

  async dismissTour() {
    this.endTour();
  }

  private async navigateToCurrentStep() {
    const step = this.steps[this.currentStepIndex()];
    
    // Emit action if any
    if (step.action) {
      this.actionSubject.next(step.action);
    }
    
    const routeCommands = this.localLink.transform(step.route) as string[];
    
    const targetUrlTree = this.router.createUrlTree(routeCommands);
    const targetRoute = this.router.serializeUrl(targetUrlTree);

    const currentUrlPath = this.router.url.split('?')[0].replace(/\/$/, '') || '/';
    const normalizedTargetRoute = targetRoute.replace(/\/$/, '') || '/';

    if (currentUrlPath !== normalizedTargetRoute) {
      await this.router.navigate(routeCommands);
    } else {
      setTimeout(() => this.updateTargetRect(), 50);
    }
  }

  updateTargetRect() {
    if (!this.isActive()) return;
    
    const step = this.steps[this.currentStepIndex()];
    if (step.position === 'center') {
      this.currentTargetRect.set(null);
      this.currentTargetElement.set(null);
      return;
    }

    const target = this.targets.get(step.id);
    if (target) {
      this.currentTargetRect.set(target.nativeElement.getBoundingClientRect());
      this.currentTargetElement.set(target.nativeElement);
    } else {
      this.currentTargetRect.set(null);
      this.currentTargetElement.set(null);
    }
  }
}
