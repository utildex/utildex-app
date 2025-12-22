import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-full max-w-sm pointer-events-none px-4">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="pointer-events-auto bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-slide-up"
        >
          <span class="material-symbols-outlined text-xl" [class.text-green-400]="toast.type === 'success'" [class.text-red-400]="toast.type === 'error'">
            {{ getIcon(toast.type) }}
          </span>
          <span class="text-sm font-medium">{{ toast.message }}</span>
          <button (click)="toastService.remove(toast.id)" class="ml-auto opacity-70 hover:opacity-100">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      }
    </div>
  `
})
export class ToastComponent {
  toastService = inject(ToastService);

  getIcon(type: string): string {
    switch(type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      default: return 'info';
    }
  }
}