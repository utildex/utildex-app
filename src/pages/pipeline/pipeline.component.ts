import {
  Component,
  inject,
  signal,
  ElementRef,
  viewChild,
  HostListener,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { PipelineService } from '../../core/pipeline/pipeline.service';
import { PipelineNode, PipelineConnection } from '../../core/pipeline/engine';
import { NODE_REGISTRY } from '../../core/pipeline/node-registry';
import { IO_META, IO_META_MAP } from '../../core/pipeline/io-nodes';
import { TOOL_REGISTRY } from '../../data/tool-registry';
import { I18nService } from '../../services/i18n.service';
import { DbService } from '../../services/db.service';
import { ToastService } from '../../services/toast.service';
import { STORAGE_KEYS } from '../../core/storage-keys';
import { AppComponent } from '../../app.component';
import {
  PipelineNodeComponent,
  NodePortRow,
} from '../../components/pipeline-node/pipeline-node.component';
import { PipelineInputModalComponent } from '../../components/pipeline-input-modal/pipeline-input-modal.component';
import dagre from 'dagre';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

/* ── Layout constants (must match PipelineNodeComponent CSS) ── */
const NODE_W = 240;
const NODE_H = 120; // Standard node height for alignment
const IO_NODE_W = 56; // w-14 (visual circle width, wrapper is NODE_H)
const BRIDGE_NODE_W = 40; // w-10 (visual circle width, wrapper is NODE_H)
// Unified port Y offset for horizontal alignment (matches tool node first port)
const PORT_Y = 76; // accent(6) + header(48) + border(1) + port-pad(6) + half-row(15)
const PORT_ROW_H = 30;

interface PendingConn {
  sourceNodeId: string;
  sourcePortId: string;
  sourceToolId: string;
  startX: number;
  startY: number;
  curX: number;
  curY: number;
}

const TOOL_META = new Map(TOOL_REGISTRY.map((t) => [t.id, t]));

const EMPTY_SET = new Set<string>();

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [PipelineNodeComponent, PipelineInputModalComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <!-- ═══ Mobile gate ═══ -->
    <div
      class="flex h-[80dvh] flex-col items-center justify-center gap-4 px-6 text-center md:hidden"
    >
      <span class="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600"
        >desktop_windows</span
      >
      <h2 class="text-xl font-bold text-slate-700 dark:text-slate-200">
        {{ t.map()['MOBILE_TITLE'] }}
      </h2>
      <p class="max-w-xs text-sm text-slate-500">{{ t.map()['MOBILE_HINT'] }}</p>
    </div>

    <!-- ═══ Desktop editor ═══ -->
    <div class="relative hidden h-full w-full md:block" style="height:calc(100dvh - 4rem)">
      <!-- ─── Canvas ─── -->
      <div
        class="absolute inset-0 cursor-grab overflow-hidden"
        [class.cursor-grabbing]="isPanning()"
        #canvasEl
        (mousedown)="onCanvasMouse($event)"
        (wheel)="onWheel($event)"
        (contextmenu)="$event.preventDefault()"
      >
        <!-- Dot grid -->
        <div
          class="pointer-events-none absolute inset-0"
          [style.background-image]="'radial-gradient(circle, rgba(100,116,139,0.12) 1px, transparent 1px)'"
          [style.background-position]="panX() + 'px ' + panY() + 'px'"
          [style.background-size]="20 * zoom() + 'px ' + 20 * zoom() + 'px'"
        ></div>

        <!-- Empty state -->
        @if (pipeline.nodes().length === 0) {
          <div
            class="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
          >
            <span
              class="material-symbols-outlined text-6xl text-slate-300/60 dark:text-slate-600/40"
              >account_tree</span
            >
            <h3 class="text-lg font-semibold text-slate-400 dark:text-slate-500">
              {{ t.map()['EMPTY_TITLE'] }}
            </h3>
            <p class="max-w-sm text-center text-sm text-slate-400/80 dark:text-slate-600">
              {{ t.map()['EMPTY_HINT'] }}
            </p>
          </div>
        }

        <!-- ─── World (pan + zoom) ─── -->
        <div
          class="absolute top-0 left-0 origin-top-left"
          [style.transform]="'translate(' + panX() + 'px,' + panY() + 'px) scale(' + zoom() + ')'"
        >
          <!-- SVG connections -->
          <svg
            class="pointer-events-none absolute top-0 left-0"
            style="overflow:visible;width:1px;height:1px"
          >
            <defs>
              <!-- Default arrow -->
              <marker
                id="pipe-arrow"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto"
              >
                <path d="M 0 1 L 9 5 L 0 9 Z" fill="#94a3b8" opacity="0.6" />
              </marker>
              <!-- Flow arrow (animated lines) -->
              <marker
                id="pipe-arrow-flow"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto"
              >
                <path d="M 0 1 L 9 5 L 0 9 Z" fill="#94a3b8" opacity="0.9" />
              </marker>
            </defs>
            @for (conn of pipeline.connections(); track conn.id) {
              <g class="conn-group pointer-events-auto" (click)="inspectConnection(conn.id)">
                <path class="conn-bg" [attr.d]="connPath(conn)" />
                <path
                  class="conn-line"
                  [attr.d]="connPath(conn)"
                  marker-end="url(#pipe-arrow)"
                  [class.conn-flow]="pipeline.isRunning()"
                  [style.stroke]="inspectedConnId() === conn.id ? 'rgb(var(--color-primary))' : ''"
                  [style.opacity]="inspectedConnId() === conn.id ? '1' : ''"
                />
                <path class="conn-hit" [attr.d]="connPath(conn)" />
                
                <!-- Delete button -->
                <g (click)="pipeline.removeConnection(conn.id); $event.stopPropagation()">
                  <circle
                    class="conn-del-bg"
                    [attr.cx]="connMid(conn).x"
                    [attr.cy]="connMid(conn).y"
                    r="8"
                  />
                  <text
                    class="conn-del-icon"
                    [attr.x]="connMid(conn).x"
                    [attr.y]="connMid(conn).y"
                    text-anchor="middle"
                    dominant-baseline="central"
                    font-size="11"
                  >
                    &#xd7;
                  </text>
                </g>

                <!-- Inspection Overlay -->
                @if (inspectedConnId() === conn.id) {
                  <foreignObject
                    [attr.x]="connMid(conn).x - 80"
                    [attr.y]="connMid(conn).y - 50"
                    width="160"
                    height="40"
                    style="overflow:visible; pointer-events:none;"
                  >
                    <div xmlns="http://www.w3.org/1999/xhtml" class="flex justify-center">
                      <div class="px-2 py-1 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-90 whitespace-nowrap">
                        {{ getInspectedDetails(conn.id) }}
                      </div>
                    </div>
                  </foreignObject>
                }
              </g>
            }
            @if (pending()) {
              <path class="pending-line" [attr.d]="pendingPath()" />
            }
          </svg>

          <!-- ─── Nodes ─── -->
          @for (node of pipeline.nodes(); track node.id) {
            <app-pipeline-node
              style="position:absolute;will-change:transform"
              [style.transform]="'translate(' + node.x + 'px,' + node.y + 'px)'"
              [nodeId]="node.id"
              [toolId]="node.toolId"
              [color]="getColor(node.toolId)"
              [icon]="getIcon(node.toolId)"
              [name]="getName(node.toolId)"
              [portRows]="getPortRows(node.toolId, node)"
              [state]="pipeline.getNodeState(node.id)"
              [isInput]="isInputNode(node.toolId)"
              [isOutput]="isOutputNode(node.toolId)"
              [isBridge]="isBridgeNode(node.toolId)"
              [hasData]="hasInputData(node)"
              [dataLabel]="getDataLabel(node)"
              [compatiblePortIds]="dragCompatible().get(node.id) ?? emptySet"
              [isSelected]="pipeline.isNodeSelected(node.id)"
              [snappedPortId]="snapTarget()?.nodeId === node.id ? snapTarget()!.portId : ''"
              [portSide]="getIOPortSide(node)"
              [showLabel]="showLabels()"
              (grab)="onNodeGrab($event, node.id)"
              (portDrag)="onPortDragStart($event)"
              (portDrop)="onPortDropEnd($event)"
              (configure)="openModal(node)"
              (download)="downloadOutput(node.id)"
            />
          }
        </div>
      </div>

      <!-- ─── Floating Palette ─── -->
      <div
        class="absolute z-20 transition-shadow duration-300"
        [style.left.px]="paletteX()"
        [style.top.px]="paletteY()"
        [class.shadow-2xl]="isPaletteDragging()"
        [class.w-52]="paletteOpen()"
        [class.w-auto]="!paletteOpen()"
      >
        <div class="palette-panel glass-panel rounded-2xl flex flex-col overflow-hidden">
          <div 
             class="flex items-center justify-between p-2 cursor-grab active:cursor-grabbing border-b border-slate-200/50 bg-slate-50/50 dark:border-slate-700/50 dark:bg-slate-900/20"
             (mousedown)="startPaletteDrag($event)"
          >
             <div class="flex items-center gap-2 px-1">
                <span class="material-symbols-outlined text-lg text-slate-500">inventory_2</span>
                @if(paletteOpen()) {
                  <span class="text-xs font-bold text-slate-500 uppercase tracking-wide select-none">Toolbox</span>
                }
             </div>
             <button class="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 dark:hover:text-slate-200 transition-colors" 
                (mousedown)="$event.stopPropagation()"
                (click)="togglePalette()">
                <span class="material-symbols-outlined text-lg">
                  {{ paletteOpen() ? 'expand_less' : 'expand_more' }}
                </span>
             </button>
          </div>

          @if (paletteOpen()) {
            <div class="px-3 pt-2 pb-3 max-h-[60vh] overflow-y-auto custom-scrollbar">

              <!-- IO Nodes section -->
              <p
                class="mb-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500"
              >
                {{ t.map()['IO_SECTION'] }}
              </p>
              <div class="flex flex-col gap-1.5">
                @for (io of ioNodes; track io.toolId) {
                  <button
                    (click)="addNodeAtCenter(io.toolId)"
                    class="palette-item"
                    [style.--tool-color]="io.color"
                    [title]="getName(io.toolId)"
                  >
                    <div class="palette-accent" [style.background]="io.color"></div>
                    <span class="material-symbols-outlined text-base" style="margin-left:4px">{{
                      io.icon
                    }}</span>
                    <span class="flex-1 truncate text-sm font-medium">{{
                      getName(io.toolId)
                    }}</span>
                    <span class="material-symbols-outlined text-sm text-slate-400">add</span>
                  </button>
                }
              </div>

              <!-- Divider -->
              <div class="my-3 h-px bg-slate-200 dark:bg-slate-700"></div>

              <!-- Utility Nodes section -->
              <p
                class="mb-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500"
              >
                {{ t.map()['UTILITY_SECTION'] }}
              </p>
              <div class="flex flex-col gap-1.5">
                @for (util of utilityNodes; track util.toolId) {
                  <button
                    (click)="addNodeAtCenter(util.toolId)"
                    class="palette-item"
                    [style.--tool-color]="util.color"
                    [title]="getName(util.toolId)"
                  >
                    <div class="palette-accent" [style.background]="util.color"></div>
                    <span class="material-symbols-outlined text-base" style="margin-left:4px">{{
                      util.icon
                    }}</span>
                    <span class="flex-1 truncate text-sm font-medium">{{
                      getName(util.toolId)
                    }}</span>
                    <span class="material-symbols-outlined text-sm text-slate-400">add</span>
                  </button>
                }
              </div>

              <!-- Divider -->
              <div class="my-3 h-px bg-slate-200 dark:bg-slate-700"></div>

              <!-- Tool Nodes section -->
              <p
                class="mb-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500"
              >
                {{ t.map()['TOOLS_SECTION'] }}
              </p>
              <div class="flex flex-col gap-1.5">
                @for (toolId of toolNodeIds; track toolId) {
                  <button
                    (click)="addNodeAtCenter(toolId)"
                    class="palette-item"
                    [style.--tool-color]="getColor(toolId)"
                    [title]="getName(toolId)"
                  >
                    <div class="palette-accent" [style.background]="getColor(toolId)"></div>
                    <span class="material-symbols-outlined text-base" style="margin-left:4px">{{
                      getIcon(toolId)
                    }}</span>
                    <span class="flex-1 truncate text-sm font-medium">{{ getName(toolId) }}</span>
                    <span class="material-symbols-outlined text-sm text-slate-400">add</span>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- ─── Floating Toolbar (top-right) ─── -->
      <div class="absolute top-3 right-3 z-20">
        <div class="glass-panel flex items-center gap-2 rounded-2xl px-3 py-2">
          @if (pipeline.isRunning()) {
            <button
              (click)="pipeline.cancel()"
              class="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
            >
              <span class="material-symbols-outlined text-base">stop</span>
              {{ t.map()['BTN_CANCEL'] }}
            </button>
          } @else {
            <button
              (click)="runPipeline()"
              [disabled]="pipeline.nodes().length === 0"
              class="bg-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span class="material-symbols-outlined text-base">play_arrow</span>
              {{ t.map()['BTN_RUN'] }}
            </button>
          }
          <button
            (click)="pipeline.deleteSelection()"
            [disabled]="pipeline.selection().size === 0"
            class="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
            [title]="t.map()['BTN_DELETE_SEL'] || 'Delete Selected'"
          >
            <span class="material-symbols-outlined text-lg">delete</span>
          </button>
          <div class="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700"></div>
          <button
            (click)="pipeline.clear()"
            [disabled]="pipeline.nodes().length === 0"
            class="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
            [title]="t.map()['BTN_CLEAR']"
          >
            <span class="material-symbols-outlined text-lg">delete_sweep</span>
          </button>
          <button
            (click)="pipeline.resetStates()"
            [disabled]="pipeline.nodes().length === 0"
            class="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
            [title]="t.map()['BTN_RESET']"
          >
            <span class="material-symbols-outlined text-lg">restart_alt</span>
          </button>
          <button
            (click)="autoLayout()"
            [disabled]="pipeline.nodes().length === 0"
            class="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
            title="Auto Layout"
          >
            <span class="material-symbols-outlined text-lg">auto_graph</span>
          </button>
          <button
            (click)="resetZoom()"
            class="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            [title]="t.map()['ZOOM_RESET']"
          >
            <span class="material-symbols-outlined text-lg">fit_screen</span>
          </button>
          <span class="ml-1 min-w-[3ch] text-right font-mono text-xs text-slate-400">
            {{ (zoom() * 100).toFixed(0) }}%
          </span>
        </div>
      </div>

      <!-- ─── Floating Settings (bottom-left) ─── -->
      <div class="absolute bottom-3 left-3 z-20">
        <div class="glass-panel rounded-2xl">
          <button
            class="flex items-center gap-1.5 px-3 py-2 text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
            (click)="toggleSettings()"
          >
            <span class="material-symbols-outlined text-lg">settings</span>
            @if (settingsOpen()) {
              <span class="text-xs font-semibold tracking-wide uppercase">{{ t.map()['SETTINGS_TITLE'] }}</span>
            }
          </button>

          @if (settingsOpen()) {
            <div class="px-3 pb-3">
              <!-- Link style -->
              <div class="mb-3">
                <p class="mb-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  {{ t.map()['SETTINGS_LINK_STYLE'] }}
                </p>
                <div class="flex gap-1">
                  <button
                    class="settings-btn"
                    [class.settings-btn-active]="linkStyle() === 'bezier'"
                    (click)="setLinkStyle('bezier')"
                  >
                    <span class="material-symbols-outlined text-sm">conversion_path</span>
                    {{ t.map()['LINK_BEZIER'] }}
                  </button>
                  <button
                    class="settings-btn"
                    [class.settings-btn-active]="linkStyle() === 'straight'"
                    (click)="setLinkStyle('straight')"
                  >
                    <span class="material-symbols-outlined text-sm">trending_flat</span>
                    {{ t.map()['LINK_STRAIGHT'] }}
                  </button>
                  <button
                    class="settings-btn"
                    [class.settings-btn-active]="linkStyle() === 'step'"
                    (click)="setLinkStyle('step')"
                  >
                    <span class="material-symbols-outlined text-sm">stairs</span>
                    Step
                  </button>
                </div>
              </div>

              <!-- Show Labels -->
              <div class="mb-3">
                <label class="flex cursor-pointer items-center gap-2">
                  <div class="settings-toggle" [class.settings-toggle-on]="showLabels()" (click)="toggleShowLabels()">
                    <div class="settings-toggle-dot"></div>
                  </div>
                  <span class="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Show Node Labels
                  </span>
                </label>
              </div>

              <!-- Grid snap -->
              <div>
                <label class="flex cursor-pointer items-center gap-2">
                  <div class="settings-toggle" [class.settings-toggle-on]="gridSnap()" (click)="toggleGridSnap()">
                    <div class="settings-toggle-dot"></div>
                  </div>
                  <span class="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {{ t.map()['SETTINGS_GRID_SNAP'] }}
                  </span>
                </label>
              </div>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- ═══ Input Modal ═══ -->
    @if (modalNode()) {
      <app-pipeline-input-modal
        [mode]="modalMode()"
        [title]="getName(modalNode()!.toolId)"
        [icon]="getIcon(modalNode()!.toolId)"
        [color]="getColor(modalNode()!.toolId)"
        [initialText]="getInitialText()"
        [initialFiles]="getInitialFiles()"
        (saveText)="onSaveText($event)"
        (saveFiles)="onSaveFiles($event)"
        (close)="closeModal()"
      />
    }

    <!-- ═══ Download Modal ═══ -->
    @if (downloadModal(); as blobs) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        (click)="downloadModal.set(null)"
      >
        <div
          class="glass-panel w-full max-w-sm rounded-[2rem] p-6 shadow-2xl"
          (click)="$event.stopPropagation()"
        >
          <h3 class="mb-4 text-lg font-bold text-slate-700 dark:text-slate-200">
            Download Options
          </h3>
          <p class="mb-6 text-sm text-slate-500">
            You have {{ blobs.length }} files to download.
          </p>
          <div class="flex flex-col gap-3">
            <button
              (click)="downloadIndividual()"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-200 active:scale-[0.98] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <span class="material-symbols-outlined">file_copy</span>
              Download Individually
            </button>
            <button
              (click)="downloadZip()"
              class="bg-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <span class="material-symbols-outlined">folder_zip</span>
              Download as ZIP
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      /* ── SVG connections ── */
      .conn-bg {
        fill: none;
        stroke: rgba(255, 255, 255, 0.4);
        stroke-width: 4;
      }
      :host-context(.dark) .conn-bg {
        stroke: rgba(255, 255, 255, 0.04);
      }

      .conn-line {
        fill: none;
        stroke: #94a3b8;
        stroke-width: 2;
        opacity: 0.5;
        transition:
          stroke 0.2s,
          opacity 0.2s;
      }
      :host-context(.dark) .conn-line {
        stroke: #64748b;
      }
      .conn-group:hover .conn-line {
        stroke: rgb(var(--color-primary) / 1);
        opacity: 1;
        stroke-width: 2.5;
      }

      .conn-flow {
        stroke-dasharray: 8 4;
        animation: flow 0.6s linear infinite;
      }
      @keyframes flow {
        to {
          stroke-dashoffset: -12;
        }
      }

      .conn-hit {
        fill: none;
        stroke: transparent;
        stroke-width: 18;
        cursor: pointer;
      }

      .conn-del-bg {
        fill: #ef4444;
        opacity: 0;
        transition: opacity 0.15s;
      }
      .conn-group:hover .conn-del-bg {
        opacity: 1;
      }

      .conn-del-icon {
        fill: white;
        opacity: 0;
        font-weight: bold;
        pointer-events: none;
        transition: opacity 0.15s;
      }
      .conn-group:hover .conn-del-icon {
        opacity: 1;
      }

      .pending-line {
        fill: none;
        stroke: rgb(var(--color-primary) / 0.6);
        stroke-width: 2;
        stroke-dasharray: 6 4;
      }

      /* ── Floating Palette ── */
      .palette-panel {
        max-height: calc(100dvh - 8rem);
        overflow-y: auto;
      }
      .palette-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: 8px;
        color: #64748b;
        transition: color 0.15s;
      }
      .palette-toggle:hover {
        color: #1e293b;
      }
      :host-context(.dark) .palette-toggle:hover {
        color: #e2e8f0;
      }

      /* Palette item — mini version of the tool-card glass */
      .palette-item {
        position: relative;
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
        padding: 6px 8px;
        border-radius: 10px;
        color: #334155;
        transition: all 0.15s;
        overflow: hidden;
        text-align: left;
        background: rgba(255, 255, 255, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
      :host-context(.dark) .palette-item {
        background: rgba(15, 23, 42, 0.35);
        border-color: rgba(255, 255, 255, 0.06);
        color: #e2e8f0;
      }
      .palette-item:hover {
        transform: translateX(2px);
        border-color: color-mix(in srgb, var(--tool-color) 45%, transparent);
        box-shadow: 0 4px 12px -4px color-mix(in srgb, var(--tool-color) 20%, transparent);
      }

      .palette-accent {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        border-radius: 10px 0 0 10px;
      }

      /* ── Settings panel ── */
      .settings-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 600;
        color: #64748b;
        background: rgba(100, 116, 139, 0.06);
        border: 1px solid transparent;
        transition: all 0.15s;
        cursor: pointer;
      }
      .settings-btn:hover {
        background: rgba(100, 116, 139, 0.12);
      }
      .settings-btn-active {
        background: rgb(var(--color-primary) / 0.1) !important;
        color: rgb(var(--color-primary) / 1);
        border-color: rgb(var(--color-primary) / 0.3);
      }
      :host-context(.dark) .settings-btn {
        color: #94a3b8;
        background: rgba(148, 163, 184, 0.06);
      }
      :host-context(.dark) .settings-btn:hover {
        background: rgba(148, 163, 184, 0.12);
      }

      /* Custom toggle */
      .settings-toggle {
        width: 32px;
        height: 18px;
        border-radius: 9px;
        background: #cbd5e1;
        cursor: pointer;
        position: relative;
        transition: background 0.2s;
        flex-shrink: 0;
      }
      .settings-toggle-on {
        background: rgb(var(--color-primary) / 1);
      }
      :host-context(.dark) .settings-toggle {
        background: #475569;
      }
      :host-context(.dark) .settings-toggle-on {
        background: rgb(var(--color-primary) / 1);
      }
      .settings-toggle-dot {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: white;
        transition: transform 0.2s;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
      .settings-toggle-on .settings-toggle-dot {
        transform: translateX(14px);
      }
    `,
  ],
})
export class PipelineComponent implements OnInit, OnDestroy {
    toggleShowLabels() {
      this.showLabels.update((v) => !v);
    }
  readonly pipeline = inject(PipelineService);
  readonly t = inject(ScopedTranslationService);
  readonly i18n = inject(I18nService);
  private app = inject(AppComponent);
  private db = inject(DbService);
  private toast = inject(ToastService);
  readonly canvasEl = viewChild.required<ElementRef<HTMLDivElement>>('canvasEl');

  /* ── Shared constant ── */
  readonly emptySet = EMPTY_SET;

  /* ── Palette data ── */
  readonly ioNodes = IO_META.filter((m) => m.category === 'input' || m.category === 'output');
  readonly utilityNodes = IO_META.filter((m) => m.category === 'utility');
  readonly toolNodeIds = Array.from(NODE_REGISTRY.keys()).filter((id) => !id.startsWith('__'));

  /* ── Canvas state ── */
  panX = signal(0);
  panY = signal(0);
  zoom = signal(1);
  inspectedConnId = signal<string | null>(null);

  isPanning = signal(false);
  private panStart = { mx: 0, my: 0, px: 0, py: 0 };

  /* ── Node drag ── */
  private dragStartWorld: { x: number; y: number } | null = null;
  private dragNodeStarts = new Map<string, { x: number; y: number }>();

  /* ── Connection drag ── */
  pending = signal<PendingConn | null>(null);
  dragCompatible = signal(new Map<string, Set<string>>());

  /** Magnetic snap: the port we're hovering near during a connection drag */
  snapTarget = signal<{ nodeId: string; portId: string } | null>(null);
  private readonly SNAP_RADIUS = 40; // world-space px

  /* ── Palette state ── */
  paletteOpen = signal(true);
  paletteX = signal(16);
  paletteY = signal(16);
  isPaletteDragging = signal(false);
  private paletteDragStart = { mx: 0, my: 0, px: 0, py: 0 };

  togglePalette() {
    this.paletteOpen.update((v) => !v);
  }

  startPaletteDrag(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isPaletteDragging.set(true);
    this.paletteDragStart = {
      mx: e.clientX,
      my: e.clientY,
      px: this.paletteX(),
      py: this.paletteY(),
    };
  }

  /* ── Settings ── */
  settingsOpen = signal(false);
  linkStyle = signal<'bezier' | 'straight' | 'step'>('bezier');
  showLabels = signal(true); // User wants toggle

  gridSnap = signal(false);
  readonly GRID_SIZE = 20;

  toggleSettings() {
    this.settingsOpen.update((v) => !v);
  }

  toggleGridSnap() {
    this.gridSnap.update((v) => !v);
    this.persistSettings();
  }

  setLinkStyle(style: 'bezier' | 'straight' | 'step') {
    this.linkStyle.set(style);
    this.persistSettings();
  }

  private persistSettings() {
    this.db.config.write(STORAGE_KEYS.PIPELINE_SETTINGS, JSON.stringify({
      linkStyle: this.linkStyle(),
      gridSnap: this.gridSnap(),
    }));
  }

  private hydrateSettings() {
    this.db.config.read(STORAGE_KEYS.PIPELINE_SETTINGS).then((stored) => {
      if (!stored) return;
      try {
        const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
        if (parsed.linkStyle) this.linkStyle.set(parsed.linkStyle);
        if (parsed.gridSnap != null) this.gridSnap.set(parsed.gridSnap);
      } catch { /* ignore */ }
    });
  }

  private addCounter = 0;

  /* ── Input modal ── */
  modalNode = signal<PipelineNode | null>(null);
  modalMode = signal<'text' | 'file'>('text');

  /* ── Transient file storage (not persisted) ── */
  fileStore = signal(new Map<string, File[]>());

  /* ── Port row cache ── */
  private portRowsCache = new Map<string, NodePortRow[]>();

  /* ── Lifecycle ── */

  ngOnInit() {
    this.app.fullscreenLayout.set(true);
    this.hydrateSettings();
  }

  ngOnDestroy() {
    this.app.fullscreenLayout.set(false);
  }

  /* ═══════════════════════════════════════════════
   *  Metadata helpers (unified for IO + tool nodes)
   * ═══════════════════════════════════════════════ */

  getName(toolId: string): string {
    const io = IO_META_MAP.get(toolId);
    if (io) return this.i18n.resolve(io.name);
    const meta = TOOL_META.get(toolId);
    if (meta) return this.i18n.resolve(meta.name);
    return toolId;
  }

  getIcon(toolId: string): string {
    return IO_META_MAP.get(toolId)?.icon ?? TOOL_META.get(toolId)?.icon ?? 'settings';
  }

  getColor(toolId: string): string {
    return IO_META_MAP.get(toolId)?.color ?? TOOL_META.get(toolId)?.color ?? '#94a3b8';
  }

  isInputNode(toolId: string): boolean {
    const io = IO_META_MAP.get(toolId);
    return io?.category === 'input';
  }

  isOutputNode(toolId: string): boolean {
    const io = IO_META_MAP.get(toolId);
    return io?.category === 'output';
  }

  isBridgeNode(toolId: string): boolean {
    return toolId === '__bridge__';
  }

  /** Returns true for any node that renders as a small circle (IO or bridge). */
  isSmallNode(toolId: string): boolean {
    return this.isInputNode(toolId) || this.isOutputNode(toolId) || this.isBridgeNode(toolId);
  }

  /* ── Port rows (cached for tools) ── */

  getPortRows(toolId: string, _node?: PipelineNode): NodePortRow[] {
    let rows = this.portRowsCache.get(toolId);
    if (!rows) {
      const def = NODE_REGISTRY.get(toolId);
      if (!def) return [];
      const len = Math.max(def.inputs.length, def.outputs.length);
      rows = Array.from({ length: len }, (_, i) => ({
        input: def.inputs[i] ?? null,
        output: def.outputs[i] ?? null,
      }));
      this.portRowsCache.set(toolId, rows);
    }
    return rows;
  }

  /* ═══════════════════════════════════════════════
   *  Input node helpers
   * ═══════════════════════════════════════════════ */

  hasInputData(node: PipelineNode): boolean {
    if (node.toolId === '__input-text__') return !!(node.config['value'] as string);
    if (node.toolId === '__input-files__') return (this.fileStore().get(node.id)?.length ?? 0) > 0;
    return false;
  }

  getDataLabel(node: PipelineNode): string {
    if (node.toolId === '__input-text__') {
      const v = (node.config['value'] as string) ?? '';
      return v.length > 20 ? v.slice(0, 20) + '\u2026' : v;
    }
    if (node.toolId === '__input-files__') {
      const n = this.fileStore().get(node.id)?.length ?? 0;
      return `${n} file${n !== 1 ? 's' : ''}`;
    }
    return '';
  }

  /* ── Inspection ── */

  inspectConnection(connId: string) {
    if (this.inspectedConnId() === connId) {
      this.inspectedConnId.set(null);
    } else {
      this.inspectedConnId.set(connId);
    }
  }

  getInspectedDetails(connId: string): string | null {
    const conn = this.pipeline.connections().find((c) => c.id === connId);
    if (!conn) return null;

    const state = this.pipeline.states().get(conn.sourceNodeId);
    if (!state) return null;

    if (state.status !== 'done' || !state.outputs) return 'No data (Not run)';

    const key = conn.sourcePortId;
    const val = state.outputs[key];

    if (val === undefined || val === null) return 'null/undefined';

    if (val instanceof Blob) {
      return `[Blob] ${val.type || 'unknown'} (${this.formatBytes(val.size)})`;
    }

    if (Array.isArray(val)) {
      if (val.length === 0) return '[] (Empty Array)';
      const first = val[0];
      const type = first instanceof Blob ? `Blob(${first.type})` : typeof first;
      return `Array(${val.length}) of ${type}`;
    }

    if (typeof val === 'object') {
      try {
        const s = JSON.stringify(val);
        return s.length > 80 ? s.slice(0, 80) + '...' : s;
      } catch {
        return '[Object]';
      }
    }

    const s = String(val);
    return s.length > 80 ? s.slice(0, 80) + '...' : s;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /* ── Modal ── */

  openModal(node: PipelineNode) {
    this.modalNode.set(node);
    this.modalMode.set(node.toolId === '__input-text__' ? 'text' : 'file');
  }

  closeModal() {
    this.modalNode.set(null);
  }

  getInitialText(): string {
    const n = this.modalNode();
    return n ? ((n.config['value'] as string) ?? '') : '';
  }

  getInitialFiles(): File[] {
    const n = this.modalNode();
    return n ? (this.fileStore().get(n.id) ?? []) : [];
  }

  onSaveText(text: string) {
    const n = this.modalNode();
    if (n) this.pipeline.updateNodeConfig(n.id, { ...n.config, value: text });
  }

  onSaveFiles(files: File[]) {
    const n = this.modalNode();
    if (n) {
      this.fileStore.update((m) => {
        const next = new Map(m);
        next.set(n.id, files);
        return next;
      });
    }
  }

  /* ═══════════════════════════════════════════════
   *  Execution
   * ═══════════════════════════════════════════════ */

  runPipeline() {
    const overrides = new Map<string, Record<string, unknown>>();
    for (const [nodeId, files] of this.fileStore().entries()) {
      overrides.set(nodeId, { files });
    }
    this.pipeline.run(overrides);
  }

  /* ── Output download ── */

  downloadModal = signal<Blob[] | null>(null);

  downloadOutput(nodeId: string) {
    const state = this.pipeline.getNodeState(nodeId);
    if (!state?.outputs) return;
    const data = state.outputs['_result'] ?? state.outputs['content'];
    
    const parts = Array.isArray(data) ? data : [data];
    const blobs = parts.filter((p): p is Blob => p instanceof Blob);

    if (blobs.length === 0 && typeof data === 'string') {
      this.downloadBlob(new Blob([data], { type: 'text/plain' }), 'output.txt');
      return;
    }

    if (blobs.length === 1) {
      const b = blobs[0];
      this.downloadBlob(b, (b instanceof File ? b.name : 'output') + this.guessExt(b.type || ''));
    } else if (blobs.length > 1) {
      this.downloadModal.set(blobs);
    }
  }

  downloadIndividual() {
    const blobs = this.downloadModal();
    if (!blobs) return;
    let index = 1;
    for (const b of blobs) {
      if (b instanceof File) {
        this.downloadBlob(b, b.name);
      } else {
        const ext = this.guessExt(b.type || '');
        this.downloadBlob(b, `output-${index}${ext}`);
      }
      index++;
    }
    this.downloadModal.set(null);
  }

  async downloadZip() {
    const blobs = this.downloadModal();
    if (!blobs) return;
    this.downloadModal.set(null);

    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      let index = 1;
      for (const b of blobs) {
        if (b instanceof File) {
          zip.file(b.name, b);
        } else {
          const ext = this.guessExt(b.type || '');
          zip.file(`file-${index}${ext}`, b);
        }
        index++;
      }
      const archive = await zip.generateAsync({ type: 'blob' });
      this.downloadBlob(archive, 'archive.zip');
    } catch (err) {
      console.error('Zip failed', err);
      this.toast.show('Failed to create ZIP', 'error');
    }
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  private guessExt(mime: string): string {
    const map: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/webp': '.webp',
      'text/plain': '.txt',
      'application/json': '.json',
    };
    return map[mime] ?? '';
  }

  /* ═══════════════════════════════════════════════
   *  Port world positions & connection paths
   * ═══════════════════════════════════════════════ */

  /**
   * For IO nodes, determines which side the port sits on based on
   * where the connected tool nodes are (adaptive port positioning).
   */
  getIOPortSide(node: PipelineNode): 'left' | 'right' | 'auto' {
    if (!this.isInputNode(node.toolId) && !this.isOutputNode(node.toolId)) return 'auto';

    const conns = this.pipeline.connections();
    const nodes = this.pipeline.nodes();
    const nodeCx = node.x + IO_NODE_W / 2;

    if (this.isInputNode(node.toolId)) {
      const targetXs = conns
        .filter((c) => c.sourceNodeId === node.id)
        .map((c) => nodes.find((n) => n.id === c.targetNodeId))
        .filter(Boolean)
        .map((n) => n!.x + this.getNodeWidth(n!.toolId) / 2);
      if (targetXs.length === 0) return 'right';
      const avgX = targetXs.reduce((a, b) => a + b, 0) / targetXs.length;
      return avgX >= nodeCx ? 'right' : 'left';
    }

    if (this.isOutputNode(node.toolId)) {
      const sourceXs = conns
        .filter((c) => c.targetNodeId === node.id)
        .map((c) => nodes.find((n) => n.id === c.sourceNodeId))
        .filter(Boolean)
        .map((n) => n!.x + this.getNodeWidth(n!.toolId) / 2);
      if (sourceXs.length === 0) return 'left';
      const avgX = sourceXs.reduce((a, b) => a + b, 0) / sourceXs.length;
      return avgX <= nodeCx ? 'left' : 'right';
    }

    return 'auto';
  }

  /** Returns the pixel width of a node based on its type. */
  private getNodeWidth(toolId: string): number {
    if (this.isBridgeNode(toolId)) return BRIDGE_NODE_W;
    if (this.isInputNode(toolId) || this.isOutputNode(toolId)) return IO_NODE_W;
    return NODE_W;
  }

  private portPos(nodeId: string, portId: string, _isOutput: boolean): { x: number; y: number } {
    const node = this.pipeline.nodes().find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    // Bridge nodes: fixed layout — input always left, output always right
    if (this.isBridgeNode(node.toolId)) {
      const x = _isOutput ? node.x + BRIDGE_NODE_W : node.x;
      const y = node.y + PORT_Y;
      return { x, y };
    }

    // For IO Nodes: port position is driven by getIOPortSide()
    if (this.isInputNode(node.toolId) || this.isOutputNode(node.toolId)) {
      const side = this.getIOPortSide(node);
      // Default: input nodes → right, output nodes → left
      const effectiveSide: 'left' | 'right' =
        side === 'auto' ? (this.isOutputNode(node.toolId) ? 'left' : 'right') : side;
      const x = effectiveSide === 'right' ? node.x + IO_NODE_W : node.x;
      const y = node.y + PORT_Y;
      return { x, y };
    }

    // For Tool Nodes (Cards)
    const def = NODE_REGISTRY.get(node.toolId);
    if (!def) return { x: 0, y: 0 };
    const list = _isOutput ? def.outputs : def.inputs;
    const idx = list.findIndex((p) => p.id === portId);
    if (idx === -1) return { x: 0, y: 0 };
    return {
      x: node.x + (_isOutput ? NODE_W : 0),
      y: node.y + PORT_Y + idx * PORT_ROW_H,
    };
  }

  connPath(c: PipelineConnection): string {
    const s = this.portPos(c.sourceNodeId, c.sourcePortId, true);
    const e = this.portPos(c.targetNodeId, c.targetPortId, false);
    
    const style = this.linkStyle();
    if (style === 'step') {
      const mid = (s.x + e.x) / 2;
      return `M${s.x} ${s.y} L${mid} ${s.y} L${mid} ${e.y} L${e.x} ${e.y}`;
    }
    
    if (style === 'straight') {
      return `M${s.x} ${s.y} L${e.x} ${e.y}`;
    }
    const d = Math.max(Math.abs(e.x - s.x) * 0.45, 60);
    return `M${s.x} ${s.y} C${s.x + d} ${s.y} ${e.x - d} ${e.y} ${e.x} ${e.y}`;
  }

  connMid(c: PipelineConnection): { x: number; y: number } {
    const s = this.portPos(c.sourceNodeId, c.sourcePortId, true);
    const e = this.portPos(c.targetNodeId, c.targetPortId, false);
    
    if (this.linkStyle() === 'step') {
      const mid = (s.x + e.x) / 2;
      return { x: mid, y: (s.y + e.y) / 2 };
    }
    
    return { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
  }

  pendingPath(): string {
    const p = this.pending();
    if (!p) return '';
    
    const style = this.linkStyle();
    if (style === 'step') {
      const mid = (p.startX + p.curX) / 2;
      return `M${p.startX} ${p.startY} L${mid} ${p.startY} L${mid} ${p.curY} L${p.curX} ${p.curY}`;
    }
    
    if (style === 'straight') {
      return `M${p.startX} ${p.startY} L${p.curX} ${p.curY}`;
    }
    const d = Math.max(Math.abs(p.curX - p.startX) * 0.45, 60);
    return `M${p.startX} ${p.startY} C${p.startX + d} ${p.startY} ${p.curX - d} ${p.curY} ${p.curX} ${p.curY}`;
  }

  /* ═══════════════════════════════════════════════
   *  Canvas interactions
   * ═══════════════════════════════════════════════ */

  addNodeAtCenter(toolId: string) {
    const el = this.canvasEl()?.nativeElement;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nw = this.getNodeWidth(toolId);
    let cx = (r.width / 2 - this.panX()) / this.zoom() - nw / 2;
    let cy = (r.height / 2 - this.panY()) / this.zoom() - 60;
    const off = this.addCounter * 30;
    cx = Math.round(cx + off);
    cy = Math.round(cy + off);
    if (this.gridSnap()) {
      cx = Math.round(cx / this.GRID_SIZE) * this.GRID_SIZE;
      cy = Math.round(cy / this.GRID_SIZE) * this.GRID_SIZE;
    }
    this.pipeline.addNode(toolId, cx, cy);
    this.addCounter = (this.addCounter + 1) % 6;
  }

  /** Center the viewport around the bounding box of all nodes. */
  resetZoom() {
    const nodes = this.pipeline.nodes();
    if (nodes.length === 0) {
      this.panX.set(0);
      this.panY.set(0);
      this.zoom.set(1);
      return;
    }

    const el = this.canvasEl()?.nativeElement;
    if (!el) return;
    const r = el.getBoundingClientRect();

    // Compute bounding box of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      const w = this.getNodeWidth(n.toolId);
      // All nodes now have 120px wrapper height (IO/bridge use wrapper, tools have header+ports)
      const h = NODE_H;
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + w);
      maxY = Math.max(maxY, n.y + h);
    }

    const bw = maxX - minX;
    const bh = maxY - minY;
    const padding = 80;

    // Fit the bounding box into the viewport with padding
    const scaleX = (r.width - padding * 2) / bw;
    const scaleY = (r.height - padding * 2) / bh;
    const newZoom = Math.max(0.15, Math.min(1.5, Math.min(scaleX, scaleY)));

    // Center the bounding box
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    this.panX.set(r.width / 2 - cx * newZoom);
    this.panY.set(r.height / 2 - cy * newZoom);
    this.zoom.set(newZoom);
  }

  autoLayout() {
    const nodes = this.pipeline.nodes();
    const conns = this.pipeline.connections();
    if (nodes.length === 0) return;

    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', align: 'UL', ranksep: 120, nodesep: 50 });
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes
    for (const n of nodes) {
      const w = this.getNodeWidth(n.toolId);
      // IO/bridge use NODE_H wrapper, tools add port row heights beyond base
      const h = this.isSmallNode(n.toolId) ? NODE_H : (NODE_H + (this.getPortRows(n.toolId).length * 30));
      g.setNode(n.id, { width: w, height: h });
    }

    for (const c of conns) {
      g.setEdge(c.sourceNodeId, c.targetNodeId);
    }

    dagre.layout(g);

    const updates = new Map<string, { x: number; y: number }>();
    g.nodes().forEach((id) => {
      const n = g.node(id);
      // Convert center to top-left
      // Adjust Y to align the first input port with the center if possible, or just use center.
      // For now, center alignment is the standard graph layout behavior.
      updates.set(id, { x: n.x - n.width / 2, y: n.y - n.height / 2 });
    });

    this.pipeline.moveNodes(updates);
    this.resetZoom();
  }

  private toWorld(cx: number, cy: number) {
    const r = this.canvasEl().nativeElement.getBoundingClientRect();
    return {
      x: (cx - r.left - this.panX()) / this.zoom(),
      y: (cy - r.top - this.panY()) / this.zoom(),
    };
  }

  onCanvasMouse(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('app-pipeline-node')) return;

    // Deselect if clicking on empty canvas (primary click)
    if (e.button === 0) {
      this.pipeline.selectNode(null);
      this.inspectedConnId.set(null);
    }

    if (e.button !== 0) return;
    this.isPanning.set(true);
    this.panStart = { mx: e.clientX, my: e.clientY, px: this.panX(), py: this.panY() };
  }

  onNodeGrab(e: MouseEvent, id: string) {
    e.stopPropagation();
    if (e.button !== 0) return;

    if (e.ctrlKey || e.metaKey) {
      this.pipeline.selectNode(id, true);
    } else {
      if (!this.pipeline.isNodeSelected(id)) {
        this.pipeline.selectNode(id, false);
      }
    }

    // Capture start points for all selected nodes
    const w = this.toWorld(e.clientX, e.clientY);
    this.dragStartWorld = w;
    this.dragNodeStarts.clear();

    const sel = this.pipeline.selection();
    for (const node of this.pipeline.nodes()) {
      if (sel.has(node.id)) {
        this.dragNodeStarts.set(node.id, { x: node.x, y: node.y });
      }
    }
  }

  onPortDragStart(ev: { event: MouseEvent; nodeId: string; portId: string }) {
    ev.event.stopPropagation();
    ev.event.preventDefault();

    const node = this.pipeline.nodes().find((n) => n.id === ev.nodeId);
    if (!node) return;

    const pos = this.portPos(ev.nodeId, ev.portId, true);
    const w = this.toWorld(ev.event.clientX, ev.event.clientY);

    this.pending.set({
      sourceNodeId: ev.nodeId,
      sourcePortId: ev.portId,
      sourceToolId: node.toolId,
      startX: pos.x,
      startY: pos.y,
      curX: w.x,
      curY: w.y,
    });

    // Pre-compute compatible targets
    const compat = new Map<string, Set<string>>();
    for (const n of this.pipeline.nodes()) {
      if (n.id === ev.nodeId) continue;
      const def = NODE_REGISTRY.get(n.toolId);
      if (!def) continue;
      const s = new Set<string>();
      for (const inp of def.inputs) {
        if (this.pipeline.canConnect(node.toolId, ev.portId, n.toolId, inp.id)) {
          s.add(inp.id);
        }
      }
      if (s.size) compat.set(n.id, s);
    }
    this.dragCompatible.set(compat);
  }

  onPortDropEnd(ev: { event: MouseEvent; nodeId: string; portId: string }) {
    ev.event.stopPropagation();
    const pc = this.pending();
    if (pc) {
      const reason = this.pipeline.addConnection(pc.sourceNodeId, pc.sourcePortId, ev.nodeId, ev.portId);
      if (reason) this.showConnectionError(reason);
      this.pending.set(null);
      this.dragCompatible.set(new Map());
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMove(e: MouseEvent) {
    if (this.isPaletteDragging()) {
      const dx = e.clientX - this.paletteDragStart.mx;
      const dy = e.clientY - this.paletteDragStart.my;
      this.paletteX.set(Math.max(0, this.paletteDragStart.px + dx));
      this.paletteY.set(Math.max(0, this.paletteDragStart.py + dy));
      return;
    }

    if (this.isPanning()) {
      this.panX.set(this.panStart.px + e.clientX - this.panStart.mx);
      this.panY.set(this.panStart.py + e.clientY - this.panStart.my);
      return;
    }

    if (this.dragStartWorld) {
      const w = this.toWorld(e.clientX, e.clientY);
      const dx = Math.round(w.x - this.dragStartWorld.x);
      const dy = Math.round(w.y - this.dragStartWorld.y);

      const snap = this.gridSnap();
      const gs = this.GRID_SIZE;
      const updates = new Map<string, { x: number; y: number }>();
      for (const [id, start] of this.dragNodeStarts) {
        let nx = start.x + dx;
        let ny = start.y + dy;
        if (snap) {
          nx = Math.round(nx / gs) * gs;
          ny = Math.round(ny / gs) * gs;
        }
        updates.set(id, { x: nx, y: ny });
      }
      this.pipeline.moveNodes(updates);
      return;
    }

    if (this.pending()) {
      const w = this.toWorld(e.clientX, e.clientY);
      this.pending.update((p) => (p ? { ...p, curX: w.x, curY: w.y } : null));

      // Magnetic snap: find closest compatible port within SNAP_RADIUS
      const compat = this.dragCompatible();
      let best: { nodeId: string; portId: string; dist: number } | null = null;

      for (const [nodeId, portIds] of compat) {
        for (const portId of portIds) {
          const pos = this.portPos(nodeId, portId, false);
          const dist = Math.hypot(w.x - pos.x, w.y - pos.y);
          if (dist < this.SNAP_RADIUS && (!best || dist < best.dist)) {
            best = { nodeId, portId, dist };
          }
        }
      }

      if (best) {
        const snapPos = this.portPos(best.nodeId, best.portId, false);
        this.pending.update((p) => (p ? { ...p, curX: snapPos.x, curY: snapPos.y } : null));
        this.snapTarget.set({ nodeId: best.nodeId, portId: best.portId });
      } else {
        this.snapTarget.set(null);
      }
    }
  }

  @HostListener('document:mouseup')
  onUp() {
    this.isPaletteDragging.set(false);
    this.isPanning.set(false);
    this.dragStartWorld = null;
    this.dragNodeStarts.clear();

    if (this.pending()) {
      // If snapped to a compatible port, auto-connect
      const snap = this.snapTarget();
      const pc = this.pending()!;
      if (snap) {
        const reason = this.pipeline.addConnection(pc.sourceNodeId, pc.sourcePortId, snap.nodeId, snap.portId);
        if (reason) this.showConnectionError(reason);
      }
      this.pending.set(null);
      this.dragCompatible.set(new Map());
      this.snapTarget.set(null);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.onEsc();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;
      if (!isInput && !this.modalNode()) {
        this.pipeline.deleteSelection();
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.pending.set(null);
    this.dragCompatible.set(new Map());
    this.closeModal();
    this.pipeline.selectNode(null);
  }

  onWheel(e: WheelEvent) {
    e.preventDefault();
    const r = this.canvasEl().nativeElement.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const old = this.zoom();
    const next = Math.max(0.15, Math.min(3, old + (e.deltaY > 0 ? -0.08 : 0.08)));
    const wx = (mx - this.panX()) / old;
    const wy = (my - this.panY()) / old;
    this.panX.set(mx - wx * next);
    this.panY.set(my - wy * next);
    this.zoom.set(next);
  }

  private showConnectionError(reason: string) {
    const key = 'ERR_CONN_' + reason.toUpperCase();
    const msg = this.t.map()[key] ?? this.t.map()['ERR_CONN_GENERIC'] ?? 'Cannot connect';
    this.toast.show(msg, 'error', 2500);
  }
}
