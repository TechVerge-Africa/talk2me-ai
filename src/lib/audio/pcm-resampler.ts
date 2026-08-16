/**
 * Web Audio PCM Resampler & Audio Processor for AssemblyAI Realtime.
 * Converts browser MediaStream (e.g. 48kHz float32 mono/stereo) to 16kHz 16-bit PCM LE mono chunks.
 */

export class PCMResampler {
  private audioContext: AudioContext | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private onPCMDataCallback: ((pcmBuffer: ArrayBuffer) => void) | null = null;
  private targetSampleRate = 16000;
  private isProcessing = false;

  constructor(onPCMData: (pcmBuffer: ArrayBuffer) => void) {
    this.onPCMDataCallback = onPCMData;
  }

  /**
   * Starts processing the provided MediaStream.
   */
  public async start(stream: MediaStream): Promise<void> {
    if (this.isProcessing) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
      
      // Use 4096 buffer size for optimal chunk frequency (~85ms latency)
      const bufferSize = 4096;
      this.scriptNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.scriptNode.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!this.isProcessing) return;

        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0); // Mono channel
        const inputSampleRate = inputBuffer.sampleRate;

        const resampledData = this.resampleTo16kHz(inputData, inputSampleRate, this.targetSampleRate);
        const pcm16 = this.float32ToPCM16(resampledData);

        if (pcm16.byteLength > 0 && this.onPCMDataCallback) {
          this.onPCMDataCallback(pcm16.buffer.slice(0) as ArrayBuffer);
        }

      };

      this.mediaStreamSource.connect(this.scriptNode);
      this.scriptNode.connect(this.audioContext.destination);

      this.isProcessing = true;
    } catch (err) {
      console.error('[PCMResampler] Failed to start resampler:', err);
      this.stop();
    }
  }

  /**
   * Stops audio processing and cleans up audio context nodes.
   */
  public stop(): void {
    this.isProcessing = false;

    if (this.scriptNode) {
      try {
        this.scriptNode.onaudioprocess = null;
        this.scriptNode.disconnect();
      } catch {}
      this.scriptNode = null;
    }

    if (this.mediaStreamSource) {
      try {
        this.mediaStreamSource.disconnect();
      } catch {}
      this.mediaStreamSource = null;
    }

    if (this.audioContext) {
      try {
        if (this.audioContext.state !== 'closed') {
          this.audioContext.close();
        }
      } catch {}
      this.audioContext = null;
    }
  }

  /**
   * Resamples float32 PCM samples from original rate down to 16,000 Hz linear interpolation.
   */
  private resampleTo16kHz(inputSamples: Float32Array, inputRate: number, outputRate: number): Float32Array {
    if (inputRate === outputRate) return inputSamples;

    const compressionRatio = inputRate / outputRate;
    const outputLength = Math.round(inputSamples.length / compressionRatio);
    const result = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const originalIndex = i * compressionRatio;
      const indexFloor = Math.floor(originalIndex);
      const indexCeil = Math.min(inputSamples.length - 1, Math.ceil(originalIndex));
      const fraction = originalIndex - indexFloor;

      result[i] = inputSamples[indexFloor] * (1 - fraction) + inputSamples[indexCeil] * fraction;
    }

    return result;
  }

  /**
   * Converts Float32Array samples (-1.0 to +1.0) into Int16Array (16-bit PCM Signed LE).
   */
  private float32ToPCM16(floatSamples: Float32Array): Int16Array {
    const pcm16 = new Int16Array(floatSamples.length);

    for (let i = 0; i < floatSamples.length; i++) {
      const s = Math.max(-1, Math.min(1, floatSamples[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return pcm16;
  }
}
