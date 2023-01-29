import { Camera, Surface } from './icons';

export enum OrientationMode {
  camera = 1,
  surface = 2,
}

const icons = {
  [OrientationMode.camera]: Camera(),
  [OrientationMode.surface]: Surface(),
};
const tooltips = {
  [OrientationMode.camera]: 'Draw paralell to camera',
  [OrientationMode.surface]: 'Draw paralell to surface',
};

class Orientation {
  private readonly button: HTMLButtonElement;
  private readonly tooltip: HTMLDivElement;
  public mode: OrientationMode = OrientationMode.camera;

  constructor() {
    const container = document.getElementById('brush');
    if (!container) {
      throw new Error('Couldn\'t get UI container');
    }
    const action = document.createElement('div');
    action.className = 'action';
    const button = document.createElement('button');
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    button.addEventListener('click', () => this.toggleMode());
    action.appendChild(button);
    container.appendChild(action);
    action.appendChild(tooltip);

    this.button = button;
    this.tooltip = tooltip;
    this.setMode(this.mode);
  }

  setMode(mode: OrientationMode) {
    const { button, tooltip } = this;
    this.mode = mode;
    if (button.firstChild) button.removeChild(button.firstChild);
    button.appendChild(icons[mode]);
    if (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);
    tooltip.appendChild(document.createTextNode(tooltips[this.mode]));
  }

  toggleMode() {
    this.setMode(
      this.mode === OrientationMode.camera ? OrientationMode.surface : OrientationMode.camera
    );
  }
}

export default Orientation;
