import { Rnnoise } from './rnnoise.js';

class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.rnnoise = null;
    this.denoiseState = null;
    this.initialized = false;
    this.enabled = true;

    // We use simple arrays as queues for the circular buffer
    this.inputQueue = [];
    this.outputQueue = [];

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
      this.inputQueue.push(inputChannel[i]);
    }

    // 2. Process in blocks of 480 if initialized and enabled
    if (this.initialized && this.enabled) {
      while (this.inputQueue.length >= 480) {
        // Pull 480 samples
        const frame = new Float32Array(480);
        for (let i = 0; i < 480; i++) {
          // Scale to 16-bit float PCM for RNNoise (expects [-32768.0, 32767.0])
          frame[i] = this.inputQueue.shift() * 32768.0;
        }

        // Calculate raw energy (RMS) before processing
        let rawSum = 0;
        for (let i = 0; i < 480; i++) {
          rawSum += frame[i] * frame[i];
        }
        const rawRMS = Math.sqrt(rawSum / 480);

        // Run noise suppression (modifies frame in-place)
        const vad = this.denoiseState.processFrame(frame);

        // Scale back to Web Audio float range [-1.0, 1.0] and calculate processed energy
        let procSum = 0;
        for (let i = 0; i < 480; i++) {
          frame[i] = frame[i] / 32768.0;
          procSum += frame[i] * frame[i];
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
          this.outputQueue.push(frame[i]);
        }
      }
    } else {
      // If not initialized or disabled, pass input straight to output
      while (this.inputQueue.length > 0) {
        this.outputQueue.push(this.inputQueue.shift());
      }
    }

    // 3. Write from output queue to output channel
    for (let i = 0; i < sampleCount; i++) {
      if (this.outputQueue.length > 0) {
        outputChannel[i] = this.outputQueue.shift();
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
