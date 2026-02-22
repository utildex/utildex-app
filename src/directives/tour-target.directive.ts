import { Directive, ElementRef, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { TourService } from '../services/tour.service';

@Directive({
  selector: '[appTourTarget]',
  standalone: true
})
export class TourTargetDirective implements OnInit, OnDestroy {
  @Input('appTourTarget') targetId!: string;
  
  private el = inject(ElementRef);
  private tourService = inject(TourService);

  ngOnInit() {
    if (this.targetId) {
      this.tourService.registerTarget(this.targetId, this.el);
    }
  }

  ngOnDestroy() {
    if (this.targetId) {
      this.tourService.unregisterTarget(this.targetId);
    }
  }
}
