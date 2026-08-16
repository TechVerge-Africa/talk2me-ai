/**
 * Web Audio PCM Resampler & Audio Processor for AssemblyAI Realtime.
 * Converts browser MediaStream (e.g. 48kHz float32 mono/stereo) to 16kHz 16-bit PCM LE mono chunks.
 */

export class PCMResampler {
  private audioContext: AudioContext | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private silenceGain: GainNode | null = null;
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
        const resumeCtx = () => {
          this.audioContext?.resume();
          window.removeEventListener('click', resumeCtx);
          window.removeEventListener('touchstart', resumeCtx);
        };
        window.addEventListener('click', resumeCtx);
        window.addEventListener('touchstart', resumeCtx);
        await this.audioContext.resume().catch(() => {});
      }


      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
      
      // Add Gain Boost node (1.8x multiplier) to make soft/quiet speaker voices significantly more sensitive
      const inputGainNode = this.audioContext.createGain();
      inputGainNode.gain.value = 1.8;

      // Keep frames near AssemblyAI's recommended 50ms audio chunks.
      const bufferSize = 1024;
      this.scriptNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.scriptNode.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!this.isProcessing) return;

        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0); // Mono channel
        const inputSampleRate = inputBuffer.sampleRate;

        const resampledData = this.resampleTo16kHz(inputData, inputSampleRate, this.targetSampleRate);
        const pcm16 = this.float32ToPCM16(resampledData);

        if (pcm16.byteLength > 0 && this.onPCMDataCallback) {
          const slice = pcm16.buffer.slice(
            pcm16.byteOffset,
            pcm16.byteOffset + pcm16.byteLength
          );
          this.onPCMDataCallback(slice as ArrayBuffer);
        }
      };

      // Mute local monitoring to prevent microphone echo in user speakers while keeping audio graph running
      this.silenceGain = this.audioContext.createGain();
      this.silenceGain.gain.value = 0;

      this.mediaStreamSource.connect(inputGainNode);
      inputGainNode.connect(this.scriptNode);
      this.scriptNode.connect(this.silenceGain);
      this.silenceGain.connect(this.audioContext.destination);


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

    if (this.silenceGain) {
      try {
        this.silenceGain.disconnect();
      } catch {}
      this.silenceGain = null;
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
