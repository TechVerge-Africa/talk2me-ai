import { Rnnoise } from './rnnoise.js';

class RingBuffer {
  constructor(capacity = 16384) {
    this.buffer = new Float32Array(capacity);
    this.capacity = capacity;
    this.writeIndex = 0;
    this.readIndex = 0;
    this.available = 0;
  }

  push(value) {
    if (this.available >= this.capacity) {
      // Buffer overflow - advance read pointer to drop oldest sample
      this.readIndex = (this.readIndex + 1) % this.capacity;
      this.available--;
    }
    this.buffer[this.writeIndex] = value;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    this.available++;
  }

  shift() {
    if (this.available <= 0) return 0;
    const value = this.buffer[this.readIndex];
    this.readIndex = (this.readIndex + 1) % this.capacity;
    this.available--;
    return value;
  }

  get length() {
    return this.available;
  }
}

class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.rnnoise = null;
    this.denoiseState = null;
    this.initialized = false;
    this.enabled = true;

    // Pre-allocated ring buffers and frame allocation to eliminate GC churn
    this.inputRingBuffer = new RingBuffer(16384);
    this.outputRingBuffer = new RingBuffer(16384);
    this.frame = new Float32Array(480);

    this.port.onmessage = (event) => {
      if (event.data.type === 'toggle') {
        this.enabled = event.data.enabled;
      }
    };

    this.init();
  }

  async init() {
    try {
      this.rnnoise = await Rnnoise.load();
      this.denoiseState = this.rnnoise.createDenoiseState();
      this.initialized = true;
      this.port.postMessage({ type: 'status', status: 'ready' });
    } catch (e) {
      console.error('Failed to initialize RNNoise in AudioWorklet:', e);
      this.port.postMessage({ type: 'status', status: 'error', error: e.message });
    }
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    // Check if input and output exist and have at least one channel
    if (!input || !input[0] || !output || !output[0]) {
      return true;
    }

    const inputChannel = input[0];
    const outputChannel = output[0];
    const sampleCount = inputChannel.length;

    // 1. Push incoming samples to input queue
    for (let i = 0; i < sampleCount; i++) {
      this.inputRingBuffer.push(inputChannel[i]);
    }

    // 2. Process in blocks of 480 if initialized and enabled
    if (this.initialized && this.enabled) {
      while (this.inputRingBuffer.length >= 480) {
        // Pull 480 samples into reusable frame
        for (let i = 0; i < 480; i++) {
          // Scale to 16-bit float PCM for RNNoise (expects [-32768.0, 32767.0])
          this.frame[i] = this.inputRingBuffer.shift() * 32768.0;
        }

        // Calculate raw energy (RMS) before processing
        let rawSum = 0;
        for (let i = 0; i < 480; i++) {
          rawSum += this.frame[i] * this.frame[i];
        }
        const rawRMS = Math.sqrt(rawSum / 480);

        // Run noise suppression (modifies frame in-place)
        const vad = this.denoiseState.processFrame(this.frame);

        // Scale back to Web Audio float range [-1.0, 1.0] and calculate processed energy
        let procSum = 0;
        for (let i = 0; i < 480; i++) {
          this.frame[i] = this.frame[i] / 32768.0;
          procSum += this.frame[i] * this.frame[i];
        }
        const procRMS = Math.sqrt(procSum / 480) * 32768.0;

        // Calculate noise reduction ratio (if we have sound)
        let reductionRatio = 0;
        if (rawRMS > 1.0) {
          reductionRatio = Math.max(0, 1 - (procRMS / rawRMS));
        }

        // Send metrics back to main thread
        this.port.postMessage({
          type: 'metrics',
          vad,
          reductionRatio,
          rawRMS: rawRMS / 32768.0,
          procRMS: procRMS / 32768.0
        });

        // Push denoised samples to output queue
        for (let i = 0; i < 480; i++) {
          this.outputRingBuffer.push(this.frame[i]);
        }
      }
    } else {
      // If not initialized or disabled, pass input straight to output
      while (this.inputRingBuffer.length > 0) {
        this.outputRingBuffer.push(this.inputRingBuffer.shift());
      }
    }

    // 3. Write from output queue to output channel
    for (let i = 0; i < sampleCount; i++) {
      if (this.outputRingBuffer.length > 0) {
        outputChannel[i] = this.outputRingBuffer.shift();
      } else {
        outputChannel[i] = 0; // fallback if starved
      }
    }

    // Copy mono channel to all other channels if stereo/surround
    for (let c = 1; c < output.length; c++) {
      if (output[c]) {
        output[c].set(outputChannel);
      }
    }

    return true;
  }
}

registerProcessor('rnnoise-worklet-processor', RNNoiseProcessor);

