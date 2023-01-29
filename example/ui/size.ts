class Size {
  private readonly buttons: HTMLButtonElement[];
  public value: number = 0;

  constructor() {
    const container = document.getElementById('brush');
    if (!container) {
      throw new Error('Couldn\'t get UI container');
    }
    const wrapper = document.createElement('div');
    wrapper.id = 'size';
    this.buttons = ['Small', 'Medium', 'Large'].map((size, i) => {
      const action = document.createElement('div');
      action.className = 'action';
      const button = document.createElement('button');
      const circle = document.createElement('span');
      circle.style.height = `${(i + 1) / 3 * 80}%`;
      button.appendChild(circle);
      button.addEventListener('click', () => this.setValue(i));
      action.appendChild(button);
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      tooltip.appendChild(document.createTextNode(`${size} brush`));
      action.appendChild(tooltip);
      wrapper.appendChild(action);
      return button;
    });
    container.appendChild(wrapper);

    this.setValue(0);
  }

  setValue(value: number) {
    const { buttons } = this;
    this.value = value;
    buttons.forEach((button, i) => {
      button.classList.remove('active');
      if (i === value) {
        button.classList.add('active');
      }
    });
    this.value = value;
  }
}

export default Size;
