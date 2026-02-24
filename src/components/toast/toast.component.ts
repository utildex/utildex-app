import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div
      class="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="animate-slide-up pointer-events-auto flex items-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-white shadow-xl dark:bg-white dark:text-slate-900"
        >
          <span
            class="material-symbols-outlined text-xl"
            [class.text-green-400]="toast.type === 'success'"
            [class.text-red-400]="toast.type === 'error'"
          >
            {{ getIcon(toast.type) }}
          </span>
          <span class="text-sm font-medium">{{ toast.message }}</span>
          <button
            (click)="toastService.remove(toast.id)"
            class="ml-auto opacity-70 hover:opacity-100"
          >
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  toastService = inject(ToastService);

  getIcon(type: string): string {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  }
}
