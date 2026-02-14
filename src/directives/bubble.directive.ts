import { Directive, ElementRef, HostListener, Input, inject } from '@angular/core';
import { GuideService } from '../services/guide.service';

@Directive({
  selector: '[appBubble]',
  standalone: true
})
export class BubbleDirective {
  @Input('appBubble') messageKey = '';
  @Input() bubblePos: 'top' | 'bottom' | 'best' = 'best';

  private guide = inject(GuideService);
  private el = inject(ElementRef);

  @HostListener('mouseenter')
  onMouseEnter() {
    if (this.messageKey) {
      this.guide.show(this.messageKey, this.el.nativeElement, this.bubblePos);
    }
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    if (this.guide.state().messageKey === this.messageKey && this.guide.state().targetRect) {
      this.guide.hide();
    }
  }
}
