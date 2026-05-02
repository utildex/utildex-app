import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  signal,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  NgZone,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

/* ── Brain graph data ── */

interface BrainNode {
  x: number;
  y: number;
  color: string;
  size: number;
}

interface Impulse {
  from: number;
  to: number;
  progress: number;
  speed: number;
  color: string;
  trail: { x: number; y: number; alpha: number }[];
}

const COLORS = {
  cyan: '#22d3ee',
  teal: '#2dd4bf',
  sky: '#38bdf8',
  indigo: '#818cf8',
  violet: '#a78bfa',
  slate: '#94a3b8',
};

const COLOR_LIST = Object.values(COLORS);

/**
 * Node positions forming a brain profile (facing right).
 * Coordinate space: 200 × 160 viewBox.
 */
function buildBrainNodes(): BrainNode[] {
  const contour: [number, number][] = [
    /* ── Frontal lobe outline ── */
    [30, 84], [28, 70], [32, 56], [40, 44], [50, 34],
    /* ── Parietal lobe (top) ── */
    [62, 24], [76, 18], [92, 14], [108, 16], [122, 22],
    /* ── Occipital lobe (back) ── */
    [135, 32], [144, 44], [150, 58], [152, 72], [148, 84],
    /* ── Cerebellum ── */
    [150, 93], [154, 103], [150, 112], [140, 118],
    /* ── Brain stem ── */
    [135, 126], [130, 135], [122, 135], [120, 126],
    /* ── Temporal lobe (bottom contour) ── */
    [130, 112], [118, 108], [104, 110], [88, 112],
    [72, 110], [58, 104], [45, 96], [34, 90]
  ];

  const isInside = (pt: [number, number], vs: [number, number][]) => {
    const x = pt[0], y = pt[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1];
      const xj = vs[j][0], yj = vs[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const raw: [number, number][] = [...contour];
  const pointsToGenerate = 180;
  let added = 0;
  let attempts = 0;
  
  while (added < pointsToGenerate && attempts < 3000) {
    const x = 20 + Math.random() * 140;
    const y = 10 + Math.random() * 130;
    // Add some random noise so it doesn't perfectly hug the border
    if (isInside([x, y], contour)) {
      raw.push([x, y]);
      added++;
    }
    attempts++;
  }

  return raw.map(([x, y]) => ({
    x,
    y,
    color: COLOR_LIST[Math.floor(Math.random() * COLOR_LIST.length)],
    size: 0.8 + Math.random() * 1.4,
  }));
}

/**
 * Build edges by connecting nodes within a distance threshold.
 */
function buildEdges(nodes: BrainNode[], threshold: number): [number, number][] {
  const edges: [number, number][] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      if (Math.sqrt(dx * dx + dy * dy) <= threshold) {
        edges.push([i, j]);
      }
    }
  }
  return edges;
}

/**
 * Build adjacency list from edges.
 */
function buildAdjacency(
  nodeCount: number,
  edges: [number, number][],
): Map<number, number[]> {
  const adj = new Map<number, number[]>();
  for (let i = 0; i < nodeCount; i++) adj.set(i, []);
  for (const [a, b] of edges) {
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  }
  return adj;
}

@Component({
  selector: 'app-synedex-welcome',
  standalone: true,
  imports: [CommonModule],
  providers: [
    provideTranslation({
      en: () => en,
      fr: () => fr,
      es: () => es,
      zh: () => zh,
    }),
  ],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        width: 100%;
        min-height: 0;
        flex: 1 1 0%;
        overflow: hidden;
      }

      .syn-welcome {
        position: relative;
        width: 100%;
        flex: 1 1 0%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0;
        overflow: hidden;
        padding: 0.5rem 1rem 1rem;
      }

      /* ── Brain SVG container ── */

      .syn-brain-wrap {
        position: relative;
        flex: 1 1 0%;
        min-height: 0;
        width: 100%;
        max-width: min(calc(100% - 2rem), calc(60vh * 1.25));
        aspect-ratio: 200 / 160;
        max-height: 60vh;
        margin-bottom: 8vh;
        /* Hardware acceleration to isolate SVG repaints from the background transition */
        transform: translateZ(0);
        will-change: transform;
      }

      @media (max-width: 640px) {
        .syn-brain-wrap {
          max-width: min(calc(100% - 1rem), calc(65vh * 1.25));
          max-height: 65vh;
        }
      }

      .syn-brain-svg {
        width: 100%;
        height: 100%;
      }

      /* ── Edge lines ── */

      .syn-edge {
        stroke-width: 0.6;
        opacity: 0.12;
        /* No transition here. Toggling 500+ concurrent transitions crashes layout performance. */
      }

      :host-context(.dark) .syn-edge {
        opacity: 0.08;
      }

      /* ── Nodes ── */

      .syn-node {
        transition: none;
      }

      /* ── Logotype ── */

      .syn-logotype {
        flex-shrink: 0;
        margin-bottom: 0.5rem;
        font-size: 1.15rem;
        font-weight: 600;
        letter-spacing: 0.5em;
        text-transform: uppercase;
        color: transparent;
        background: linear-gradient(135deg, #334155 0%, #94a3b8 100%);
        -webkit-background-clip: text;
        background-clip: text;
        opacity: 0;
        animation: syn-cta-enter 600ms ease 0.6s forwards;
      }

      :host-context(.dark) .syn-logotype {
        background: linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%);
        -webkit-background-clip: text;
        background-clip: text;
      }

      /* ── CTA ── */

      .syn-welcome {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        padding: 2rem 1rem;
      }

      .syn-cta-area {
        position: absolute;
        bottom: 18%;
        display: flex;
        flex-direction: column;
        align-items: center;
        z-index: 10;
        opacity: 0;
        animation: syn-cta-enter-absolute 700ms cubic-bezier(0.22, 1, 0.36, 1) 1.0s forwards;
      }

      @keyframes syn-cta-enter {
        to {
          opacity: 1;
        }
      }

      @keyframes syn-cta-enter-absolute {
        0% {
          opacity: 0;
          transform: translateY(20px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .syn-cta {
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1.1rem 2.5rem;
        border-radius: 32px 8px 32px 8px; /* Asymmetrical shape */
        font-size: 1.05rem;
        font-weight: 500;
        letter-spacing: 0.05em;
        color: #0f172a;
        background: linear-gradient(120deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 100%);
        backdrop-filter: blur(16px) saturate(140%);
        -webkit-backdrop-filter: blur(16px) saturate(140%);
        border: 1px solid rgba(255, 255, 255, 0.5);
        border-left: 1px solid rgba(255, 255, 255, 0.8);
        border-top: 1px solid rgba(255, 255, 255, 0.8);
        box-shadow: 
          0 8px 32px -8px rgba(14, 154, 167, 0.25),
          inset 0 0 20px rgba(255, 255, 255, 0.3);
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
        text-decoration: none;
        position: relative;
        overflow: hidden;
      }

      /* Inner animated sheen for moving effect on hover */
      .syn-cta::before {
        content: '';
        position: absolute;
        top: 0;
        left: -150%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
        transform: skewX(-20deg);
        transition: none;
        z-index: 0;
      }

      .syn-cta:hover {
        transform: translateY(-3px);
        box-shadow: 
          0 12px 40px -8px rgba(14, 154, 167, 0.4),
          inset 0 0 30px rgba(255, 255, 255, 0.6);
        border-radius: 8px 32px 8px 32px; /* Invert asymmetry on hover */
      }

      .syn-cta:hover::before {
        left: 150%;
        transition: left 0.7s ease-in-out;
      }

      .syn-cta span {
        position: relative;
        z-index: 1;
      }

      .syn-cta:active {
        transform: translateY(0);
      }

      .syn-tagline {
        margin-bottom: 1rem;
        font-size: 0.95rem;
        font-weight: 500;
        letter-spacing: 0.02em;
        text-align: center;
        color: #64748b;
      }

      :host-context(.dark) .syn-cta {
        color: #ffffff;
        background: linear-gradient(120deg, rgba(15, 23, 42, 0.6) 0%, rgba(15, 23, 42, 0.2) 100%);
        border-color: rgba(255, 255, 255, 0.1);
        border-left: 1px solid rgba(255, 255, 255, 0.25);
        border-top: 1px solid rgba(255, 255, 255, 0.25);
        box-shadow: 
          0 8px 32px -8px rgba(56, 189, 248, 0.2),
          inset 0 0 20px rgba(14, 154, 167, 0.1);
      }

      :host-context(.dark) .syn-cta::before {
        background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.4), transparent);
      }

      :host-context(.dark) .syn-cta:hover {
        box-shadow: 
          0 12px 40px -8px rgba(56, 189, 248, 0.4),
          inset 0 0 30px rgba(14, 154, 167, 0.3),
          0 0 15px rgba(56, 189, 248, 0.2);
      }

      :host-context(.dark) .syn-tagline {
        color: #94a3b8;
      }

      .syn-cta .material-symbols-outlined {
        font-size: 20px;
        transition: transform 0.2s ease;
      }

      .syn-cta:hover .material-symbols-outlined {
        transform: translateX(3px);
      }

      /* ── Reduced motion ── */

      @media (prefers-reduced-motion: reduce) {
        .syn-node,
        .syn-cta-area,
        .syn-logotype {
          animation: none !important;
          opacity: 1;
          transform: none;
        }

        .syn-flicker {
          animation: none !important;
          opacity: 0.7;
        }
      }
    `,
  ],
  template: `
    <div class="syn-welcome">
      <!-- Logotype — sits above the graph, small and unobtrusive -->
      <p class="syn-logotype font-utx-sans">Synedex</p>

      <!-- Brain neural graph — dominates the viewport -->
      <div class="syn-brain-wrap">
        <svg
          #brainSvg
          class="syn-brain-svg"
          viewBox="0 0 200 160"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <!-- Edges -->
          <g>
            @for (edge of edges; track $index) {
              <line
                class="syn-edge"
                [attr.x1]="nodes[edge[0]].x"
                [attr.y1]="nodes[edge[0]].y"
                [attr.x2]="nodes[edge[1]].x"
                [attr.y2]="nodes[edge[1]].y"
                [attr.stroke]="nodes[edge[0]].color"
              />
            }
          </g>

          <!-- Nodes -->
          <g #nodesGroup>
            @for (node of nodes; track $index) {
              <circle
                class="syn-node"
                [attr.cx]="node.x"
                [attr.cy]="node.y"
                [attr.r]="node.size"
                [attr.fill]="node.color"
                opacity="0.25"
              />
            }
          </g>

          <!-- Impulse dots (managed via RAF) -->
          <g #impulseGroup></g>
        </svg>
      </div>

      <!-- CTA -->
      <div class="syn-cta-area">
        <p class="syn-tagline font-utx-sans">{{ t.map()['WELCOME_TAGLINE'] }}</p>
        <button class="syn-cta font-utx-sans" type="button">
          {{ t.map()['CTA'] }}
          <span class="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </div>
  `,
})
export class SynedexWelcomeComponent implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly zone = inject(NgZone);
  protected readonly t = inject(ScopedTranslationService);
  protected readonly lang = signal(this.route.snapshot.paramMap.get('lang') ?? 'en');

  @ViewChild('brainSvg') private brainSvgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('impulseGroup') private impulseGroupRef!: ElementRef<SVGGElement>;
  @ViewChild('nodesGroup') private nodesGroupRef!: ElementRef<SVGGElement>;

  readonly nodes: BrainNode[] = buildBrainNodes();
  readonly edges: [number, number][] = buildEdges(this.nodes, 14);
  private readonly adjacency = buildAdjacency(this.nodes.length, this.edges);

  private nodeEls: SVGCircleElement[] = [];
  private nodeOpacities: number[] = [];

  private impulses: Impulse[] = [];
  private impulseHalos: SVGCircleElement[] = [];
  private impulseEls: SVGCircleElement[] = [];
  private trailEls: SVGCircleElement[][] = [];
  private animId = 0;
  private readonly IMPULSE_COUNT = 5;
  private readonly TRAIL_LENGTH = 6;
  private readonly SVG_NS = 'http://www.w3.org/2000/svg';

  ngAfterViewInit(): void {
    this.nodeEls = Array.from(this.nodesGroupRef.nativeElement.querySelectorAll('.syn-node')) as SVGCircleElement[];
    this.nodeOpacities = new Array(this.nodes.length).fill(0.25);

    this.initImpulses();
    this.createImpulseElements();
    this.zone.runOutsideAngular(() => this.tick());
  }

  ngOnDestroy(): void {
    if (this.animId) cancelAnimationFrame(this.animId);
  }

  /** Seed impulse signals at random positions in the graph. */
  private initImpulses(): void {
    for (let i = 0; i < this.IMPULSE_COUNT; i++) {
      const startNode = Math.floor(Math.random() * this.nodes.length);
      const neighbors = this.adjacency.get(startNode) ?? [];
      const toNode =
        neighbors.length > 0
          ? neighbors[Math.floor(Math.random() * neighbors.length)]
          : (startNode + 1) % this.nodes.length;

      this.impulses.push({
        from: startNode,
        to: toNode,
        progress: 0,
        speed: 0.004 + Math.random() * 0.004,
        color: COLOR_LIST[i % COLOR_LIST.length],
        trail: [],
      });

      // Light up the initial nodes
      if (this.nodeEls[startNode]) {
        this.nodeOpacities[startNode] = 1.0;
        this.nodeEls[startNode].setAttribute('opacity', '1.0');
      }
    }
  }

  /** Create SVG circle elements for impulses + trails (outside Angular). */
  private createImpulseElements(): void {
    const g = this.impulseGroupRef.nativeElement;

    for (let i = 0; i < this.IMPULSE_COUNT; i++) {
      // Trail circles (rendered first so they appear behind the head)
      const trails: SVGCircleElement[] = [];
      for (let t = 0; t < this.TRAIL_LENGTH; t++) {
        const trail = document.createElementNS(this.SVG_NS, 'circle');
        trail.setAttribute('r', '0.6');
        trail.setAttribute('fill', this.impulses[i].color);
        trail.setAttribute('opacity', '0');
        g.appendChild(trail);
        trails.push(trail);
      }
      this.trailEls.push(trails);

      // Head halo (highly performant fake glow)
      const halo = document.createElementNS(this.SVG_NS, 'circle');
      halo.setAttribute('r', '2.5');
      halo.setAttribute('fill', this.impulses[i].color);
      halo.setAttribute('opacity', '0.25');
      g.appendChild(halo);
      this.impulseHalos.push(halo);

      // Head circle
      const el = document.createElementNS(this.SVG_NS, 'circle');
      el.setAttribute('r', '1.2');
      el.setAttribute('fill', this.impulses[i].color);
      el.setAttribute('opacity', '0.9');
      g.appendChild(el);
      this.impulseEls.push(el);
    }
  }

  /** Animation loop — runs outside Angular zone for performance. */
  private tick(): void {
    for (let i = 0; i < this.impulses.length; i++) {
      const imp = this.impulses[i];

      // Advance
      imp.progress += imp.speed;

      // Interpolate position
      const from = this.nodes[imp.from];
      const to = this.nodes[imp.to];
      const x = from.x + (to.x - from.x) * imp.progress;
      const y = from.y + (to.y - from.y) * imp.progress;

      // Update trail
      imp.trail.unshift({ x, y, alpha: 0.7 });
      if (imp.trail.length > this.TRAIL_LENGTH) imp.trail.pop();

      // Render trail
      for (let t = 0; t < this.trailEls[i].length; t++) {
        if (t < imp.trail.length) {
          const tp = imp.trail[t];
          const alpha = tp.alpha * (1 - t / this.TRAIL_LENGTH) * 0.5;
          this.trailEls[i][t].setAttribute('cx', tp.x.toFixed(1));
          this.trailEls[i][t].setAttribute('cy', tp.y.toFixed(1));
          this.trailEls[i][t].setAttribute('opacity', alpha.toFixed(2));
        }
      }

      // Render head + halo
      const hxStr = x.toFixed(1);
      const hyStr = y.toFixed(1);
      
      this.impulseHalos[i].setAttribute('cx', hxStr);
      this.impulseHalos[i].setAttribute('cy', hyStr);
      
      this.impulseEls[i].setAttribute('cx', hxStr);
      this.impulseEls[i].setAttribute('cy', hyStr);

      // Arrived at destination — pick next node
      if (imp.progress >= 1) {
        // Light up the destination node
        if (this.nodeEls[imp.to]) {
          this.nodeOpacities[imp.to] = 1.0;
          this.nodeEls[imp.to].setAttribute('opacity', '1.0');
        }

        const neighbors = this.adjacency.get(imp.to) ?? [];
        // Prefer not going back to where we came from
        const filtered = neighbors.filter((n) => n !== imp.from);
        const candidates = filtered.length > 0 ? filtered : neighbors;
        const next =
          candidates.length > 0
            ? candidates[Math.floor(Math.random() * candidates.length)]
            : 0;

        imp.from = imp.to;
        imp.to = next;
        imp.progress = 0;
      }
    }

    // Decay node opacities
    for (let i = 0; i < this.nodeOpacities.length; i++) {
      if (this.nodeOpacities[i] > 0.25) {
        this.nodeOpacities[i] -= 0.015; // Decay rate
        if (this.nodeOpacities[i] <= 0.25) {
          this.nodeOpacities[i] = 0.25;
        }
        this.nodeEls[i].setAttribute('opacity', this.nodeOpacities[i].toFixed(2));
      }
    }

    this.animId = requestAnimationFrame(() => this.tick());
  }
}
