const Icon = (paths: any[], width: number = 24, height: number = 24, x: number = 0, y: number = 0) => () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
  paths.forEach((attributes) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    Object.keys(attributes).forEach((attribute) => (
      path.setAttribute(attribute, attributes[attribute])
    ));
    svg.appendChild(path);
  });
  return svg;
};

export const Download = Icon(
  [
    {
      d: 'M17 12L12 17M12 17L7 12M12 17V4M17 20H7',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    },
  ],
);

export const Surface = Icon(
  [
    {
      d: `M 34,39.1716L 34,22.4583L 28,28.0833L 28,22.5833L 36,15.0833L 44,22.5833L 44,28.0833L 38,22.4583L 38,38L 54.625,38L 49,32L 54.5,32L 62,40L 54.5,48L 49,48L 54.625,42L 36.8284,42L 25.8284,53L 34,53L 30,57L 19,57L 19,46L 23,42L 23,50.1716L 34,39.1716 Z`,
      fill: 'currentColor',
      strokeLinejoin: 'round',
    },
  ],
  60, 60, 8, 8
);

export const Camera = Icon(
  [
    {
      d: 'M17 11V8.5C17 7.67157 16.3284 7 15.5 7H5.5C4.67157 7 4 7.67157 4 8.5V16.5C4 17.3284 4.67157 18 5.5 18H15.5C16.3284 18 17 17.3284 17 16.5V14.5',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
    },
    {
      d: 'M17 11L20.2764 9.3618C20.6088 9.19558 21 9.43733 21 9.80902V15.2785C21 15.6276 20.6513 15.8692 20.3244 15.7467L17 14.5',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
    },
  ],
);

export const Snapshot = Icon(
  [
    {
      d: 'M15.0858 3.58579C14.7107 3.21071 14.202 3 13.6716 3H10.3284C9.79799 3 9.28929 3.21071 8.91421 3.58579L8.08579 4.41421C7.71071 4.78929 7.20201 5 6.67157 5H5C3.89543 5 3 5.89543 3 7L3 17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H17.3284C16.798 5 16.2893 4.78929 15.9142 4.41421L15.0858 3.58579Z',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
    {
      d: 'M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      fillRule: 'evenodd',
      clipRule: 'evenodd',
    },
  ],
);
