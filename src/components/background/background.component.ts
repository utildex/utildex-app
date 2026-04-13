import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-background',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 overflow-hidden" style="z-index: -50;">
      <!-- Deep Space Base -->
      <div class="absolute inset-0 bg-slate-50 transition-colors duration-700 dark:bg-[#020617]">
        <!-- Subtle Dark Gradient Mesh -->
        <div
          class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black opacity-0 transition-opacity duration-700 dark:opacity-100"
        ></div>
        <div
          class="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-950/30 via-transparent to-transparent opacity-0 transition-opacity duration-700 dark:opacity-40"
        ></div>

        <!-- Light Mode Gradient Mesh (Enhanced for visibility) -->
        <div
          class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-white opacity-100 transition-opacity duration-700 dark:opacity-0"
        ></div>
      </div>

      <!-- Animated Colorful Stars (Light Mode) -->
      <div
        class="stars-container stars-container-light opacity-100 mix-blend-multiply transition-opacity duration-700 dark:opacity-0"
      >
        <div class="stars-sm" [style.box-shadow]="starsColorSmall"></div>
        <div class="stars-md" [style.box-shadow]="starsColorMedium"></div>
        <div class="stars-lg" [style.box-shadow]="starsColorLarge"></div>
      </div>

      <!-- Animated Stars (Dark Mode) -->
      <div
        class="stars-container stars-container-dark opacity-0 transition-opacity duration-700 dark:opacity-100"
      >
        <div class="stars-sm" [style.box-shadow]="starsSmall"></div>
        <div class="stars-md" [style.box-shadow]="starsMedium"></div>
        <div class="stars-lg" [style.box-shadow]="starsLarge"></div>
      </div>
    </div>
  `,
  styles: [
    `
      .stars-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }

      .stars-sm,
      .stars-md,
      .stars-lg {
        border-radius: 50%;
        background: transparent;
        position: absolute;
        top: 0;
        left: 0;
      }

      .stars-sm {
        width: 1px;
        height: 1px;
        animation: star-anim 50s linear infinite;
      }
      .stars-md {
        width: 2px;
        height: 2px;
        animation: star-anim 75s linear infinite;
      }
      .stars-lg {
        width: 3px;
        height: 3px;
        animation: star-anim 100s linear infinite;
      }

      .stars-container-light .stars-sm {
        width: 2px;
        height: 2px;
      }
      .stars-container-light .stars-md {
        width: 3px;
        height: 3px;
      }
      .stars-container-light .stars-lg {
        width: 4px;
        height: 4px;
      }

      @keyframes star-anim {
        from {
          transform: translateY(0);
        }
        to {
          transform: translateY(-3000px);
        }
      }
    `,
  ],
  encapsulation: ViewEncapsulation.None,
})
export class BackgroundComponent {
  // Generate static star fields
  starsSmall = this.generateStars(700, '#94a3b8');
  starsMedium = this.generateStars(200, '#cbd5e1');
  starsLarge = this.generateStars(100, '#e2e8f0');

  // Generate colorful stars for light mode (darker/saturated colors for visibility on white)
  starsColorSmall = this.generateColorStars(500, [
    '#2563eb',
    '#7c3aed',
    '#db2777',
    '#059669',
    '#d97706',
  ]);
  starsColorMedium = this.generateColorStars(200, [
    '#1d4ed8',
    '#6d28d9',
    '#be185d',
    '#047857',
    '#b45309',
  ]);
  starsColorLarge = this.generateColorStars(80, [
    '#1e40af',
    '#5b21b6',
    '#9d174d',
    '#065f46',
    '#92400e',
  ]);

  private generateStars(count: number, color: string): string {
    let value = '';
    const rangeX = 4000;
    const rangeY = 2500;
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * rangeX);
      const y = Math.floor(Math.random() * rangeY);
      value += `${x}px ${y}px ${color}, `;
    }
    return value.slice(0, -2);
  }

  private generateColorStars(count: number, colors: string[]): string {
    let value = '';
    const rangeX = 4000;
    const rangeY = 2500;
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * rangeX);
      const y = Math.floor(Math.random() * rangeY);
      const color = colors[Math.floor(Math.random() * colors.length)];
      value += `${x}px ${y}px ${color}, `;
    }
    return value.slice(0, -2);
  }
}
