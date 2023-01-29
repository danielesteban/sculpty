class Color {
  private readonly display: HTMLDivElement;
  private readonly input: HTMLInputElement;
  public readonly value: { r: number; g: number; b: number; };

  constructor() {
    const container = document.getElementById('brush');
    if (!container) {
      throw new Error('Couldn\'t get UI container');
    }
    const color = { r: 0, g: 0, b: 0 };
    const toggle = document.createElement('div');
    toggle.id = 'color';
    toggle.addEventListener('click', () => input.click());
    const display = document.createElement('div');
    toggle.appendChild(display);
    const input = document.createElement('input');
    input.type = 'color';
    input.addEventListener('input', () => {
      const hex = input.value.slice(1);
      if (hex.length === 6) {
        color.r = parseInt(hex.slice(0, 2), 16);
        color.g = parseInt(hex.slice(2, 4), 16);
        color.b = parseInt(hex.slice(4, 6), 16);
        display.style.backgroundColor = input.value;
      }
    });
    toggle.appendChild(input);
    container.appendChild(toggle);

    this.display = display;
    this.input = input;
    this.value = color;
    this.setValue(0xFF, 0xFF, 0x66);
  }

  setValue(r: number, g: number, b: number) {
    const { input, display, value } = this;
    value.r = r;
    value.g = g;
    value.b = b;
    input.value = `#${('000000' + (value.r << 16 ^ value.g << 8 ^ value.b).toString(16)).slice(-6)}`;
    display.style.backgroundColor = input.value;
  }
}

export default Color;
