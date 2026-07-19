import { Track, TrackProcessor } from 'livekit-client';

export class RNNoiseTrackProcessor implements TrackProcessor<Track.Kind.Audio> {
  name = 'rnnoise-voice-isolation';
  
  private audioContext?: AudioContext;
  private sourceNode?: MediaStreamAudioSourceNode;
  private workletNode?: AudioWorkletNode;
  private destinationNode?: MediaStreamAudioDestinationNode;
  private track?: MediaStreamTrack;
  private onMetricsCallback?: (metrics: { 
    vad: number; 
    reductionRatio: number;
    rawRMS: number;
    procRMS: number;
  }) => void;
  private enabled = true;

  processedTrack?: MediaStreamTrack;

  constructor(onMetrics?: (metrics: { 
    vad: number; 
    reductionRatio: number;
    rawRMS: number;
    procRMS: number;
  }) => void) {
    this.onMetricsCallback = onMetrics;
  }

  async init(opts: any): Promise<void> {
    this.audioContext = opts.audioContext;
    this.track = opts.track;

    if (!this.audioContext || !this.track) {
      throw new Error('AudioContext or MediaStreamTrack missing from processor options');
    }

    // 1. Create MediaStreamSource from the raw track
    const sourceStream = new MediaStream([this.track]);
    this.sourceNode = this.audioContext.createMediaStreamSource(sourceStream);

    // 2. Add AudioWorklet module
    // Next.js serves the public folder directly from the root path
    await this.audioContext.audioWorklet.addModule('/worklets/rnnoise-worklet.js');

    // 3. Create the AudioWorkletNode
    this.workletNode = new AudioWorkletNode(this.audioContext, 'rnnoise-worklet-processor');
    this.workletNode.port.onmessage = (event) => {
      if (event.data.type === 'metrics') {
        if (this.onMetricsCallback) {
          this.onMetricsCallback({
            vad: event.data.vad,
            reductionRatio: event.data.reductionRatio,
            rawRMS: event.data.rawRMS,
            procRMS: event.data.procRMS
          });
        }
      }
    };

    // Send the current enabled state to the worklet
    this.workletNode.port.postMessage({ type: 'toggle', enabled: this.enabled });

    // 4. Create MediaStreamDestination to output the processed audio
    this.destinationNode = this.audioContext.createMediaStreamDestination();

    // 5. Connect nodes: Source -> RNNoise Worklet -> Destination
    this.sourceNode.connect(this.workletNode);
    this.workletNode.connect(this.destinationNode);

    // 6. Save the output track for LiveKit
    this.processedTrack = this.destinationNode.stream.getAudioTracks()[0];
  }

  async restart(opts: any): Promise<void> {
    await this.destroy();
    await this.init(opts);
  }

  async destroy(): Promise<void> {
    this.sourceNode?.disconnect();
    this.workletNode?.disconnect();
    this.destinationNode?.disconnect();

    if (this.processedTrack) {
      this.processedTrack.stop();
    }

    this.sourceNode = undefined;
    this.workletNode = undefined;
    this.destinationNode = undefined;
    this.processedTrack = undefined;
    this.track = undefined;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'toggle', enabled });
    }
  }

  isEnabled() {
    return this.enabled;
  }
}
