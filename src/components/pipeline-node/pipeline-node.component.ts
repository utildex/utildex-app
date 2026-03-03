import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { NodeExecutionState } from '../../core/pipeline/engine';
import { Port } from '../../core/pipeline/types';

export interface NodePortRow {
  input: Port | null;
  output: Port | null;
}

export interface PortEvent {
  event: MouseEvent;
  nodeId: string;
  portId: string;
}

@Component({
  selector: 'app-pipeline-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pipeline-node select-none"
      [class.w-[240px]]="!isIO()"
      [class.w-auto]="isIO()"
      [style.--tool-color]="color()"
      (mousedown)="onMouseDown($event)"
      (dragstart)="$event.preventDefault()"
      draggable="false"
      [class.is-selected]="isSelected()"
    >
      <!-- ═══ TOOL NODE (Card) ═══ -->
      @if (!isIO() && !isBridge()) {
        <div
          class="node-body"
          [class.ring-running]="state()?.status === 'running'"
          [class.ring-done]="state()?.status === 'done'"
          [class.ring-error]="state()?.status === 'error'"
        >
          <!-- Accent strip -->
          <div class="node-accent" [style.background]="accentGradient()"></div>

          <!-- Color wash -->
          <div class="node-wash" [style.background]="washGradient()"></div>

          <!-- Header -->
          <div class="node-header">
            <div class="icon-box" [style.background]="iconBg()">
              <span class="material-symbols-outlined text-xl">{{ icon() }}</span>
            </div>
            <!-- Tool node title is always visible (showLabel only affects IO/bridge labels) -->
            <span class="node-title">{{ name() }}</span>

            @if (state()?.status === 'running') {
              <span class="status-dot animate-pulse bg-blue-400"></span>
            } @else if (state()?.status === 'done') {
              <span class="status-dot bg-green-400"></span>
            } @else if (state()?.status === 'error') {
              <span class="status-dot bg-red-400"></span>
            }
          </div>

          <!-- Progress bar -->
          @if (state()?.status === 'running') {
            <div class="h-0.5 w-full bg-slate-200 dark:bg-slate-700">
              <div
                class="bg-primary h-full transition-all"
                [style.width.%]="state()?.progress ?? 0"
              ></div>
            </div>
          }

          <!-- Ports -->
          <div class="node-ports">
            @for (row of portRows(); track $index) {
              <div class="port-row">
                @if (row.input; as inp) {
                  <div class="port-slot port-in">
                    <div
                      class="port-handle"
                      [attr.data-type]="inp.type"
                      [class.port-compat]="compatiblePortIds().has(inp.id)"
                      [class.port-snapped]="snappedPortId() === inp.id"
                      (mouseup)="portDrop.emit({ event: $event, nodeId: nodeId(), portId: inp.id })"
                      (mousedown)="$event.stopPropagation()"
                    ></div>
                    <span class="port-label">{{ inp.label }}</span>
                  </div>
                } @else {
                  <div></div>
                }
                @if (row.output; as out) {
                  <div class="port-slot port-out">
                    <span class="port-label">{{ out.label }}</span>
                    <div
                      class="port-handle"
                      [attr.data-type]="out.type"
                      (mousedown)="
                        portDrag.emit({ event: $event, nodeId: nodeId(), portId: out.id })
                      "
                    ></div>
                  </div>
                } @else {
                  <div></div>
                }
              </div>
            }
          </div>

          <!-- Collector: Add/Remove port buttons -->
          @if (isCollector()) {
            <div
              class="collector-actions relative z-[1] flex items-center justify-center gap-1 border-t border-slate-200/50 px-2 py-1.5 dark:border-white/[0.06]"
            >
              <button
                class="collector-btn"
                [disabled]="!collectorCanRemove()"
                (click)="$event.stopPropagation(); removePort.emit()"
                title="Remove port"
              >
                <span class="material-symbols-outlined text-sm">remove</span>
              </button>
              <button
                class="collector-btn"
                [disabled]="!collectorCanAdd()"
                (click)="$event.stopPropagation(); addPort.emit()"
                title="Add port"
              >
                <span class="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
          }

          <!-- Collector: Download badge when done -->
          @if (isCollector() && state()?.status === 'done') {
            <div
              class="collector-dl relative z-[1] flex items-center justify-center border-t border-green-200/50 bg-green-50/50 py-1.5 dark:border-green-800/30 dark:bg-green-900/20"
            >
              <button
                class="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold text-green-600 transition-colors hover:bg-green-100/60 dark:text-green-400 dark:hover:bg-green-900/40"
                (click)="$event.stopPropagation(); download.emit()"
              >
                <span class="material-symbols-outlined text-base">download</span>
                Download ZIP
              </button>
            </div>
          }

          <!-- Error row -->
          @if (state()?.error) {
            <div class="error-row">{{ state()!.error }}</div>
          }
        </div>
      }

      <!-- ═══ IO NODE (Capsule/Circle) ═══ -->
      @if (isIO() && !isBridge()) {
        <div class="io-wrapper relative" style="width:56px;height:120px;">
          <!-- Circle container - positioned so center is at Y=76 -->
          <div
            class="io-body group absolute left-0 flex h-14 w-14 items-center justify-center rounded-full transition-all"
            style="top:48px;"
          >
            <!-- Hover Tooltip (Text Input Only) -->
            @if (toolId() === '__input-text__' && hasData()) {
              <div
                class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 pb-2 opacity-0 transition-opacity delay-200 duration-200 group-hover:opacity-100"
              >
                <div
                  class="glass-panel rounded-lg border border-slate-200 bg-white/95 p-3 text-xs text-slate-600 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300"
                >
                  {{ dataLabel() }}
                </div>
              </div>
            }

            <!-- Main Circle Button -->
            <button
              class="io-circle relative flex h-full w-full items-center justify-center rounded-full border border-white/50 bg-white/55 shadow-lg backdrop-blur-xl transition-all hover:scale-105 active:scale-95 dark:border-white/10 dark:bg-slate-800/50"
              [class.ring-running]="state()?.status === 'running'"
              [class.ring-done]="state()?.status === 'done'"
              [class.ring-error]="state()?.status === 'error'"
              [style.background]="iconBg()"
              (click)="onIOClick($event)"
            >
              <span class="material-symbols-outlined text-2xl" [style.color]="color()">{{
                icon()
              }}</span>

              <!-- Done/Download Indicator (Output) -->
              @if (isOutput() && state()?.status === 'done') {
                <div
                  class="absolute inset-0 box-border animate-pulse rounded-full ring-2 ring-green-400 ring-offset-2 ring-offset-transparent"
                ></div>
              }
            </button>
          </div>

          <!-- Port for Output Node (receives data) - positioned at Y=76-7=69 -->
          @if (isOutput()) {
            @if (portRows()[0]?.input; as inp) {
              <div
                class="port-handle"
                [style.position]="'absolute'"
                [style.top.px]="69"
                [style.left.px]="effectiveSide() === 'left' ? -7 : null"
                [style.right.px]="effectiveSide() === 'right' ? -7 : null"
                [attr.data-type]="inp.type"
                [class.port-compat]="compatiblePortIds().has(inp.id)"
                [class.port-snapped]="snappedPortId() === inp.id"
                (mouseup)="portDrop.emit({ event: $event, nodeId: nodeId(), portId: inp.id })"
                (mousedown)="$event.stopPropagation()"
              ></div>
            }
          }

          <!-- Port for Input Node (emits data) - positioned at Y=76-7=69 -->
          @if (isInput()) {
            @if (portRows()[0]?.output; as out) {
              <div
                class="port-handle"
                [style.position]="'absolute'"
                [style.top.px]="69"
                [style.left.px]="effectiveSide() === 'left' ? -7 : null"
                [style.right.px]="effectiveSide() === 'right' ? -7 : null"
                [attr.data-type]="out.type"
                (mousedown)="portDrag.emit({ event: $event, nodeId: nodeId(), portId: out.id })"
              ></div>
            }
          }

          <!-- Label below circle -->
          @if (showLabel()) {
            <div
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
              style="top:108px;"
            >
              <span
                class="text-[10px] font-bold tracking-wider text-slate-500/80 uppercase drop-shadow-sm select-none dark:text-slate-400/80"
              >
                {{ name() }}
              </span>
            </div>
          }
        </div>
      }

      <!-- ═══ BRIDGE NODE (Small circle with both ports) ═══ -->
      @if (isBridge()) {
        <div class="bridge-wrapper relative" style="width:40px;height:120px;">
          <!-- Circle container - positioned so center is at Y=76 -->
          <div
            class="io-body group absolute left-0 flex h-10 w-10 items-center justify-center rounded-full transition-all"
            style="top:56px;"
          >
            <!-- Circle -->
            <div
              class="io-circle relative flex h-full w-full items-center justify-center rounded-full border border-white/50 bg-white/55 shadow-lg backdrop-blur-xl transition-all dark:border-white/10 dark:bg-slate-800/50"
              [class.ring-running]="state()?.status === 'running'"
              [class.ring-done]="state()?.status === 'done'"
              [class.ring-error]="state()?.status === 'error'"
              [style.background]="iconBg()"
            >
              <span class="material-symbols-outlined text-lg" [style.color]="color()">{{
                icon()
              }}</span>
            </div>
          </div>

          <!-- Input port (left) - positioned at Y=76-7=69 -->
          @if (portRows()[0]?.input; as inp) {
            <div
              class="port-handle"
              [style.position]="'absolute'"
              [style.top.px]="69"
              [style.left.px]="-7"
              [attr.data-type]="inp.type"
              [class.port-compat]="compatiblePortIds().has(inp.id)"
              [class.port-snapped]="snappedPortId() === inp.id"
              (mouseup)="portDrop.emit({ event: $event, nodeId: nodeId(), portId: inp.id })"
              (mousedown)="$event.stopPropagation()"
            ></div>
          }

          <!-- Output port (right) - positioned at Y=76-7=69 -->
          @if (portRows()[0]?.output; as out) {
            <div
              class="port-handle"
              [style.position]="'absolute'"
              [style.top.px]="69"
              [style.right.px]="-7"
              [attr.data-type]="out.type"
              (mousedown)="portDrag.emit({ event: $event, nodeId: nodeId(), portId: out.id })"
            ></div>
          }

          <!-- Label below circle -->
          @if (showLabel()) {
            <div
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
              style="top:100px;"
            >
              <span
                class="text-[10px] font-bold tracking-wider text-slate-500/80 uppercase drop-shadow-sm select-none dark:text-slate-400/80"
              >
                {{ name() }}
              </span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        pointer-events: auto;
      }

      .pipeline-node {
        position: relative;
        transition: transform 0.1s;
      }

      /* IO/Bridge wrappers: don't block clicks on connections underneath */
      .io-wrapper,
      .bridge-wrapper {
        pointer-events: none;
      }
      /* But enable pointer events on the interactive elements within */
      .io-wrapper .io-body,
      .io-wrapper .port-handle,
      .bridge-wrapper .io-body,
      .bridge-wrapper .port-handle {
        pointer-events: auto;
      }

      /* Selection outline */
      .is-selected .node-body,
      .is-selected .io-circle {
        box-shadow:
          0 0 0 2px #3b82f6,
          0 8px 20px -4px rgba(59, 130, 246, 0.4) !important;
      }

      /* ── Card body (Tool Nodes) ── */
      .node-body {
        position: relative;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.55);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.5);
        box-shadow:
          0 4px 24px -4px rgba(0, 0, 0, 0.07),
          inset 0 0.5px 0 0 rgba(255, 255, 255, 0.8);
        transition:
          border-color 0.2s,
          box-shadow 0.2s;
      }
      :host-context(.dark) .node-body {
        background: rgba(15, 23, 42, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow:
          0 4px 24px -4px rgba(0, 0, 0, 0.35),
          inset 0 0.5px 0 0 rgba(255, 255, 255, 0.04);
      }

      /* Status rings (shared by card body + io-circle) */
      .ring-running {
        box-shadow: 0 0 0 2px #60a5fa !important;
      }
      .ring-done {
        box-shadow: 0 0 0 2px #4ade80 !important;
      }
      .ring-error {
        box-shadow: 0 0 0 2px #f87171 !important;
      }

      /* ── IO Node ── */

      /* The 56×56 wrapper — explicit px so no tailwind conflict */
      .io-node-wrap {
        position: relative;
        width: 56px;
        height: 56px;
      }

      /* Perfect circle button filling the wrapper */
      .io-circle {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        border: 1.5px solid rgba(255, 255, 255, 0.45);
        box-shadow:
          0 4px 16px -4px rgba(0, 0, 0, 0.18),
          inset 0 1px 0 rgba(255, 255, 255, 0.6);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        transition:
          transform 0.15s,
          box-shadow 0.15s;
        cursor: pointer;
        overflow: hidden;
      }
      :host-context(.dark) .io-circle {
        border-color: rgba(255, 255, 255, 0.1);
        box-shadow:
          0 4px 16px -4px rgba(0, 0, 0, 0.45),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }
      .io-circle:hover {
        transform: scale(1.07);
      }
      .io-circle:active {
        transform: scale(0.94);
      }

      /* IO port: absolutely placed, vertically centered on the circle */
      .io-port {
        position: absolute;
        top: 21px; /* (56 - 14) / 2 = 21 — centres 14px handle on 56px circle */
        z-index: 10;
        cursor: crosshair;
      }
      .io-port-left {
        left: -7px;
      } /* half of port-handle width (14/2) */
      .io-port-right {
        right: -7px;
      }

      /* Label beneath the circle */
      .io-label {
        position: absolute;
        top: 62px; /* 56 + 6 gap */
        left: 50%;
        transform: translateX(-50%);
        white-space: nowrap;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(100, 116, 139, 0.8);
        pointer-events: none;
      }
      :host-context(.dark) .io-label {
        color: rgba(148, 163, 184, 0.8);
      }

      /* Tooltip above the IO circle */
      .io-tooltip {
        position: absolute;
        bottom: 62px;
        left: 50%;
        transform: translateX(-50%);
        width: 192px;
        z-index: 50;
        padding-bottom: 8px;
        opacity: 0;
        transition: opacity 0.2s 0.2s;
        pointer-events: none;
      }
      .io-node-wrap:hover .io-tooltip {
        opacity: 1;
      }

      /* ── Accent strip ── */
      .node-accent {
        height: 6px;
        border-radius: 12px 12px 0 0;
      }

      /* ── Color wash ── */
      .node-wash {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 80px;
        border-radius: 12px 12px 0 0;
        opacity: 0.06;
        pointer-events: none;
        transition: opacity 0.3s;
      }

      /* ── Header ── */
      .node-header {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      }
      :host-context(.dark) .node-header {
        border-bottom-color: rgba(255, 255, 255, 0.06);
      }

      .icon-box {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        flex-shrink: 0;
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.25);
      }
      :host-context(.dark) .icon-box {
        border-color: rgba(255, 255, 255, 0.08);
      }

      .node-title {
        position: relative;
        z-index: 1;
        flex: 1;
        font-size: 13px;
        font-weight: 700;
        color: #1e293b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      :host-context(.dark) .node-title {
        color: #f1f5f9;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      /* ── Ports ── */
      .node-ports {
        position: relative;
        z-index: 1;
        padding: 6px 0;
      }
      .port-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 30px;
      }
      .port-slot {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .port-out {
        margin-left: auto;
      }

      .port-label {
        font-size: 11px;
        font-weight: 500;
        color: #64748b;
      }
      :host-context(.dark) .port-label {
        color: #94a3b8;
      }

      /* ── Port Handle ── */
      .port-handle {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2.5px solid;
        flex-shrink: 0;
        cursor: crosshair;
        background: #94a3b8; /* fallback */
        border-color: #64748b;
        transition:
          transform 0.15s,
          box-shadow 0.15s;
        position: relative;
        z-index: 10;
      }

      /* On Regular Nodes */
      .node-body .port-in .port-handle {
        margin-left: -8px;
      }
      .node-body .port-out .port-handle {
        margin-right: -8px;
      }

      .port-handle:hover {
        transform: scale(1.35);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--port-color, #94a3b8) 25%, transparent);
      }
      .port-compat {
        animation: ppulse 1s ease-in-out infinite;
      }
      .port-snapped {
        animation: none !important;
        transform: scale(1.6);
        box-shadow: 0 0 0 6px color-mix(in srgb, var(--port-color, #94a3b8) 35%, transparent),
          0 0 12px 2px color-mix(in srgb, var(--port-color, #94a3b8) 25%, transparent);
      }
      @keyframes ppulse {
        0%,
        100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.4);
          box-shadow: 0 0 0 6px color-mix(in srgb, var(--port-color, #94a3b8) 30%, transparent);
        }
      }

      /* Type map */
      .port-handle[data-type='text'] {
        border-color: #3b82f6;
        background: #dbeafe;
        --port-color: #3b82f6;
      }
      .port-handle[data-type='json'] {
        border-color: #8b5cf6;
        background: #ede9fe;
        --port-color: #8b5cf6;
      }
      .port-handle[data-type='blob'] {
        border-color: #f59e0b;
        background: #fef3c7;
        --port-color: #f59e0b;
      }
      .port-handle[data-type='number'] {
        border-color: #10b981;
        background: #d1fae5;
        --port-color: #10b981;
      }
      .port-handle[data-type='boolean'] {
        border-color: #6b7280;
        background: #f3f4f6;
        --port-color: #6b7280;
      }
      .port-handle[data-type='any'] {
        border-color: #94a3b8;
        background: #f1f5f9;
        --port-color: #94a3b8;
      }

      :host-context(.dark) .port-handle[data-type='text'] {
        background: rgba(59, 130, 246, 0.2);
      }
      :host-context(.dark) .port-handle[data-type='json'] {
        background: rgba(139, 92, 246, 0.2);
      }
      :host-context(.dark) .port-handle[data-type='blob'] {
        background: rgba(245, 158, 11, 0.2);
      }
      :host-context(.dark) .port-handle[data-type='number'] {
        background: rgba(16, 185, 129, 0.2);
      }
      :host-context(.dark) .port-handle[data-type='boolean'] {
        background: rgba(107, 114, 128, 0.2);
      }
      :host-context(.dark) .port-handle[data-type='any'] {
        background: rgba(148, 163, 184, 0.2);
      }

      /* ── Error row ── */
      .error-row {
        position: relative;
        z-index: 1;
        padding: 4px 10px;
        font-size: 11px;
        color: #dc2626;
        border-top: 1px solid rgba(239, 68, 68, 0.15);
        background: rgba(239, 68, 68, 0.05);
        border-radius: 0 0 12px 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      :host-context(.dark) .error-row {
        color: #fca5a5;
        border-top-color: rgba(248, 113, 113, 0.15);
        background: rgba(239, 68, 68, 0.08);
      }

      /* ── Collector buttons ── */
      .collector-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 6px;
        color: #64748b;
        transition: all 0.15s;
      }
      .collector-btn:hover:not(:disabled) {
        background: rgba(100, 116, 139, 0.12);
        color: #334155;
      }
      .collector-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
      :host-context(.dark) .collector-btn {
        color: #94a3b8;
      }
      :host-context(.dark) .collector-btn:hover:not(:disabled) {
        background: rgba(148, 163, 184, 0.12);
        color: #e2e8f0;
      }
    `,
  ],
})
export class PipelineNodeComponent {
  /* ── Inputs ── */
  nodeId = input.required<string>();
  toolId = input.required<string>();
  color = input<string>('#94a3b8');
  icon = input<string>('settings');
  name = input<string>('Node');
  portRows = input<NodePortRow[]>([]);
  state = input<NodeExecutionState | undefined>(undefined);
  isInput = input<boolean>(false);
  isOutput = input<boolean>(false);
  hasData = input<boolean>(false);
  dataLabel = input<string>('');
  compatiblePortIds = input<Set<string>>(new Set());
  isSelected = input<boolean>(false);
  /** 'left' | 'right' | 'auto' — which side the IO port appears on */
  portSide = input<'left' | 'right' | 'auto'>('auto');
  /** Port ID that is currently snapped-to during connection drag */
  snappedPortId = input<string>('');
  /** Collector node flags */
  isCollector = input<boolean>(false);
  collectorCanAdd = input<boolean>(false);
  collectorCanRemove = input<boolean>(false);
  isBridge = input<boolean>(false);
  showLabel = input(true);

  /* ── Outputs ── */
  grab = output<MouseEvent>();
  portDrag = output<PortEvent>();
  portDrop = output<PortEvent>();
  configure = output<void>();
  download = output<void>();
  addPort = output<void>();
  removePort = output<void>();

  /* ── Computed ── */
  isIO = computed(() => (this.isInput() || this.isOutput()) && !this.isBridge());

  /** Resolves the port side, applying defaults when 'auto' */
  effectiveSide = computed<'left' | 'right'>(() => {
    const s = this.portSide();
    if (s !== 'auto') return s;
    return this.isOutput() ? 'left' : 'right';
  });

  accentGradient = computed(() => {
    const c = this.color();
    return `linear-gradient(90deg, ${c}, ${c}66)`;
  });

  washGradient = computed(() => `linear-gradient(180deg, ${this.color()}, transparent)`);

  iconBg = computed(() => `color-mix(in srgb, ${this.color()} 14%, transparent)`);

  private mousedownPos: { x: number; y: number } | null = null;

  onMouseDown(event: MouseEvent) {
    this.mousedownPos = { x: event.clientX, y: event.clientY };
    this.grab.emit(event);
  }

  onIOClick(event: MouseEvent) {
    event.stopPropagation();
    if (this.mousedownPos) {
      const dist = Math.hypot(
        event.clientX - this.mousedownPos.x,
        event.clientY - this.mousedownPos.y,
      );
      if (dist > 5) return; // It was a drag, not a click
    }

    if (this.isInput()) {
      this.configure.emit();
    } else if (this.isOutput() && this.state()?.status === 'done') {
      this.download.emit();
    }
  }
}
