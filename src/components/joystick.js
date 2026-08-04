/**
 * 360° Analog Touch Virtual Joystick Component (動態虛擬模擬搖桿)
 * Provides ultra-smooth 360-degree direction vectors & distance for mobile web games.
 */

export class VirtualJoystick {
  constructor(container, options = {}) {
    this.container = container;
    this.maxRadius = options.maxRadius || 50;
    this.onMove = options.onMove || null;
    this.onEnd = options.onEnd || null;

    this.active = false;
    this.touchId = null;

    this.baseX = 0;
    this.baseY = 0;
    this.currentX = 0;
    this.currentY = 0;

    this.vector = { x: 0, y: 0, angle: 0, distance: 0 };

    this._createDOM();
    this._bindEvents();
  }

  _createDOM() {
    this.el = document.createElement('div');
    this.el.className = 'v-joystick-base';
    this.el.style.cssText = `
      position: absolute;
      width: ${this.maxRadius * 2}px;
      height: ${this.maxRadius * 2}px;
      border-radius: 50%;
      background: rgba(255, 117, 68, 0.2);
      border: 2px solid rgba(255, 117, 68, 0.5);
      backdrop-filter: blur(8px);
      display: none;
      pointer-events: none;
      z-index: 1000;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 20px rgba(255, 117, 68, 0.3);
    `;

    this.thumb = document.createElement('div');
    this.thumb.className = 'v-joystick-thumb';
    this.thumb.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: ${this.maxRadius * 0.9}px;
      height: ${this.maxRadius * 0.9}px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff7544, #ff70a6);
      box-shadow: 0 4px 12px rgba(255, 117, 68, 0.6);
      transform: translate(-50%, -50%);
      transition: transform 0.05s ease-out;
    `;

    this.el.appendChild(this.thumb);
    this.container.appendChild(this.el);
  }

  _bindEvents() {
    const onStart = (e) => {
      if (this.active) return;
      const touch = e.changedTouches ? e.changedTouches[0] : e;
      this.touchId = touch.identifier !== undefined ? touch.identifier : 'mouse';
      this.active = true;

      const rect = this.container.getBoundingClientRect();
      this.baseX = touch.clientX - rect.left;
      this.baseY = touch.clientY - rect.top;

      this.el.style.left = `${this.baseX}px`;
      this.el.style.top = `${this.baseY}px`;
      this.el.style.display = 'block';

      this._updatePosition(touch.clientX - rect.left, touch.clientY - rect.top);
    };

    const onMove = (e) => {
      if (!this.active) return;

      let touch = null;
      if (e.changedTouches) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.touchId) {
            touch = e.changedTouches[i];
            break;
          }
        }
      } else {
        touch = e;
      }

      if (!touch) return;

      const rect = this.container.getBoundingClientRect();
      this._updatePosition(touch.clientX - rect.left, touch.clientY - rect.top);
    };

    const onEnd = (e) => {
      if (!this.active) return;

      let ended = false;
      if (e.changedTouches) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.touchId) {
            ended = true;
            break;
          }
        }
      } else {
        ended = true;
      }

      if (ended) {
        this.active = false;
        this.touchId = null;
        this.el.style.display = 'none';
        this.thumb.style.transform = 'translate(-50%, -50%)';
        this.vector = { x: 0, y: 0, angle: 0, distance: 0 };
        if (this.onEnd) this.onEnd();
      }
    };

    this.container.addEventListener('touchstart', onStart, { passive: false });
    this.container.addEventListener('touchmove', onMove, { passive: false });
    this.container.addEventListener('touchend', onEnd, { passive: false });
    this.container.addEventListener('touchcancel', onEnd, { passive: false });
  }

  _updatePosition(x, y) {
    const dx = x - this.baseX;
    const dy = y - this.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const clampedDist = Math.min(dist, this.maxRadius);
    const thumbX = Math.cos(angle) * clampedDist;
    const thumbY = Math.sin(angle) * clampedDist;

    this.thumb.style.transform = `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`;

    const normX = thumbX / this.maxRadius;
    const normY = thumbY / this.maxRadius;

    this.vector = {
      x: normX,
      y: normY,
      angle,
      distance: clampedDist / this.maxRadius,
    };

    if (this.onMove) this.onMove(this.vector);
  }

  destroy() {
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
}
