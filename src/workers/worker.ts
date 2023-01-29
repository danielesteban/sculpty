type Job = {
  buffers: Uint32Array[],
  resolve: (value: any) => void,
};

type Response<Result> = {
  data: {
    buffer: Uint32Array;
    data: Result;
  }
};

class Worker<Result> {
  private instances?: any[];
  private readonly queue: Job[];

  constructor({
    buffer,
    concurrency = navigator.hardwareConcurrency || 1,
    options,
    program,
    script,
  }: {
    buffer: number;
    concurrency?: number;
    options: any;
    program: any;
    script: any;
  }) {
    this.queue = [];
    program().then((program: WebAssembly.Module) => {
      this.instances = Array.from({ length: concurrency }, () => {
        const worker = new script();
        worker.buffer = new Uint32Array(buffer);
        worker.isBusy = true;
        worker.run = ({ buffers, resolve }: Job) => {
          worker.isBusy = true;
          worker.resolve = resolve;
          const stride = buffers[0].length;
          buffers.forEach((buffer: Uint32Array, i: number) => {
            worker.buffer.set(buffer, stride * i)
          });
          worker.postMessage(worker.buffer, [worker.buffer.buffer]);
        };
        const onLoad = () => {
          worker.removeEventListener('message', onLoad);
          worker.addEventListener('message', onData);
          const queued = this.queue.shift();
          if (queued) {
            worker.run(queued);
          } else {
            worker.isBusy = false;
          }
        };
        const onData = ({ data: { buffer, data } }: Response<Result>) => {
          worker.buffer = buffer;
          const { resolve } = worker;
          delete worker.resolve;
          resolve(data);
          const queued = this.queue.shift();
          if (queued) {
            worker.run(queued);
          } else {
            worker.isBusy = false;
          }
        };
        worker.addEventListener('message', onLoad);
        worker.postMessage({ options, program });
        return worker;
      });
    });
  }

  dispose() {
    const { instances } = this;
    if (!instances) {
      return;
    }
    instances.forEach((instance) => instance.terminate());
  }

  run(buffers: Uint32Array[]) {
    const { instances, queue } = this;
    return new Promise<Result>((resolve) => {
      if (!instances) {
        queue.push({ buffers, resolve });
        return;
      }
      let worker;
      for (let i = 0, l = instances.length; i < l; i++) {
        if (!instances[i].isBusy) {
          worker = instances[i];
          break;
        }
      }
      if (!worker) {
        queue.push({ buffers, resolve });
        return;
      }
      worker.run({ buffers, resolve });
    });
  }
}

export default Worker;
