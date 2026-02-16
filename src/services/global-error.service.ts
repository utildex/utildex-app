import { Injectable, signal } from '@angular/core';

export interface AppError {
  message: string;
  stack?: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorService {
  error = signal<AppError | null>(null);

  handleError(error: unknown) {
    console.error('Global Error Caught:', error);
    
    let message = 'An unexpected error occurred.';
    let stack = '';

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack || '';
    } else if (typeof error === 'string') {
      message = error;
    }

    this.error.set({
      message,
      stack,
      timestamp: Date.now()
    });
  }

  clear() {
    this.error.set(null);
  }
}