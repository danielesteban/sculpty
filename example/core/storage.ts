// @ts-ignore
import FastNoise from 'fastnoise-lite';
import { deflate, inflateSync } from 'fflate';
import { Storage } from 'sculpty';

class LocalStorage implements Storage {
  public readonly chunkSize: number;
  private readonly data: Map<string, Uint32Array>;
  private readonly noise: FastNoise;
  private readonly queue: Map<string, { aborted: boolean; timer: number; }>;

  constructor({ chunkSize }: {
    chunkSize: number;
  }) {
    this.chunkSize = chunkSize;
    this.data = new Map();
    this.noise = new FastNoise();
    this.noise.SetFrequency(0.03);
    this.noise.SetFractalType(FastNoise.FractalType.FBm);
    this.queue = new Map();
  }

  private generate(cx: number, cy: number, cz: number): Uint32Array {
    const { chunkSize, noise } = this;
    const data = new Uint32Array(chunkSize * chunkSize * chunkSize);
    for (let i = 0, z = 0; z < chunkSize; z++) {
      for (let y = 0; y < chunkSize; y++) {
        for (let x = 0; x < chunkSize; x++, i++) {
          const vx = cx * chunkSize + x;
          const vy = cy * chunkSize + y;
          const vz = cz * chunkSize + z;
          if (
            vy < -8
            || (
              vy < 8
              && vy < noise.GetNoise(vx, vy, vz) * Math.sqrt(vx * vx + vz * vz) * 0.1
            )
          ) {
            const l = Math.floor(255 - Math.random() * 64);
            data[i] = (
              ((l / 2) << 24)
              ^ (l << 16)
              ^ (l << 8)
              ^ (32 + Math.floor(Math.random() * 128)) 
            );
          }
        }
      }
    }
    return data;
  }

  get(cx: number, cy: number, cz: number): Uint32Array {
    const key: string = `${cx}:${cy}:${cz}`;
    let data = this.data.get(key);
    if (!data) {
      const stored = localStorage.getItem(`chunk:${key}`);
      if (stored) {
        data = new Uint32Array(
          inflateSync(new Uint8Array(atob(stored).split('').map((c) => c.charCodeAt(0)))).buffer
        );
      } else {
        data = this.generate(cx, cy, cz);
      }
      this.data.set(key, data);
    }
    return data;
  }

  save(cx: number, cy: number, cz: number) {
    const { queue } = this;
    const key: string = `${cx}:${cy}:${cz}`;
    const data = this.data.get(key);
    if (!data) {
      return;
    }
    const queued = queue.get(key);
    if (queued) {
      queued.aborted = true;
      clearTimeout(queued.timer);
    }
    const request = {
      aborted: false,
      timer: setTimeout(() => (
        deflate(new Uint8Array(data.buffer), (err, data) => {
          if (err || request.aborted) {
            return;
          }
          localStorage.setItem(
            `chunk:${key}`,
            btoa([...data].map((c) => String.fromCharCode(c)).join(''))
          );
        })
      ), 1000),
    };
    queue.set(key, request);
  }

  listStored() {
    return Object.keys(localStorage)
      .filter((key) => key.slice(0, 6) === 'chunk:')
      .map((key) => {
        const [x, y, z] = key.slice(6).split(':');
        return { x: parseInt(x, 10), y: parseInt(y, 10), z: parseInt(z, 10) };
      });
  }
}

export default LocalStorage;
