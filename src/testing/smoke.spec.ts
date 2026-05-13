import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

@Component({
  standalone: true,
  template: '<p>Angular Vitest smoke</p>',
})
class SmokeComponent {}

describe('Angular Vitest smoke setup', () => {
  it('renders a standalone component in jsdom', () => {
    const fixture = TestBed.createComponent(SmokeComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Angular Vitest smoke');
  });
});
