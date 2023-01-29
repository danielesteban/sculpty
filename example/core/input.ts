import { EventDispatcher, Vector2 } from 'three';

export type Pointer = {
  id: number;
  button: number;
  position: Vector2;
};

class Input extends EventDispatcher {
  private readonly pointer: Pointer;

  constructor(target: HTMLElement) {
    super();

    this.pointer = {
      id: -1,
      button: -1,
      position: new Vector2()
    };

    this.pointerdown = this.pointerdown.bind(this);
    this.pointermove = this.pointermove.bind(this);
    this.pointerup = this.pointerup.bind(this);

    target.addEventListener('pointerdown', this.pointerdown);
    target.addEventListener('pointermove', this.pointermove);
    target.addEventListener('pointerup', this.pointerup);
  }

  private getPointer({ buttons, clientX, clientY, pointerId }: PointerEvent) {
    this.pointer.id = pointerId;
    this.pointer.button = buttons;
    this.pointer.position.set(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
    return this.pointer;
  }

  pointerdown(e: PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (this.pointer.id === -1) {
      const pointer = this.getPointer(e);
      this.dispatchEvent({ type: 'dragstart', pointer, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey });
    }
  }

  pointermove(e: PointerEvent) {
    if (e.pointerId !== this.pointer.id) {
      return;
    }
    (('getCoalescedEvents' in e) ? e.getCoalescedEvents() : [e]).forEach((e) => {
      const pointer = this.getPointer(e);
      this.dispatchEvent({ type: 'dragmove', pointer });
    });
  }

  pointerup(e: PointerEvent) {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (e.pointerId === this.pointer.id) {
      const pointer = this.getPointer(e);
      this.dispatchEvent({ type: 'dragend', pointer });
      this.pointer.id = -1;
    }
  }
}

export default Input;
