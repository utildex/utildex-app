export interface Pet {
  /** Unique identifier (auto-incremented integer managed by VirtualPetsComponent) */
  id: number;
  type: string;
  name?: string;
  x: number;
  y: number;
  direction: 'left' | 'right';
  state: 'walk' | 'idle' | 'fall' | 'climb' | 'dying';
  speed: number;
  flipped: boolean;
  climbing: boolean;
  vy: number;
  vx: number;
  jumpStartY: number;
}
