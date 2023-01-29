export interface Storage {
  chunkSize: number;
  get: (x: number, y: number, z: number) => Uint32Array;
  save: (x: number, y: number, z: number) => void;
}

export class MemoryStorage implements Storage {
  public readonly chunkSize: number;
  private readonly data: Map<string, Uint32Array>;

  constructor(chunkSize: number = 32) {
    this.chunkSize = chunkSize;
    this.data = new Map();
  }

  get(x: number, y: number, z: number): Uint32Array {
    const { chunkSize } = this;
    const key: string = `${x}:${y}:${z}`;
    let data = this.data.get(key);
    if (!data) {
      data = new Uint32Array(chunkSize * chunkSize * chunkSize);
      this.data.set(key, data);
    }
    return data;
  }

  save() {

  }
}
