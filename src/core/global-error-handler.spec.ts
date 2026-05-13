import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalErrorService } from '../services/global-error.service';
import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles normal Error instances without throwing', () => {
    TestBed.configureTestingModule({ providers: [GlobalErrorHandler, GlobalErrorService] });
    const handler = TestBed.inject(GlobalErrorHandler);
    const service = TestBed.inject(GlobalErrorService);

    expect(() => handler.handleError(new Error('boom'))).not.toThrow();

    expect(service.error()?.message).toBe('boom');
    expect(error).toHaveBeenCalledWith('CRITICAL ERROR :', expect.any(Error));
  });

  it('handles non-Error thrown values without throwing', () => {
    TestBed.configureTestingModule({ providers: [GlobalErrorHandler, GlobalErrorService] });
    const handler = TestBed.inject(GlobalErrorHandler);
    const service = TestBed.inject(GlobalErrorService);

    expect(() => handler.handleError('plain failure')).not.toThrow();

    expect(service.error()?.message).toBe('plain failure');
    expect(error).toHaveBeenCalledWith('CRITICAL ERROR :', 'plain failure');
  });

  it('logs when the error service itself fails', () => {
    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler,
        {
          provide: GlobalErrorService,
          useValue: {
            handleError: vi.fn(() => {
              throw new Error('handler failed');
            }),
          },
        },
        { provide: NgZone, useValue: { run: (callback: () => void) => callback() } },
      ],
    });
    const handler = TestBed.inject(GlobalErrorHandler);

    expect(() => handler.handleError(new Error('original'))).not.toThrow();
    expect(error).toHaveBeenCalledWith('Error handling failed', expect.any(Error));
    expect(error).toHaveBeenCalledWith('CRITICAL ERROR :', expect.any(Error));
  });
});
