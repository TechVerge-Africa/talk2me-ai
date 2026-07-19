import React, { useEffect, useRef } from 'react';

interface VoiceWaveVisualizerProps {
  audioLevel: number;
  aiOn: boolean;
  isSpeaking: boolean;
}

export function VoiceWaveVisualizer({ audioLevel, aiOn, isSpeaking }: VoiceWaveVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const draw = () => {
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      ctx.clearRect(0, 0, width, height);

      phaseRef.current += 0.08; // wave speed
      const phase = phaseRef.current;

      // Base line height
      const centerY = height / 2;

      // Draw background glow
      if (isSpeaking) {
        const gradient = ctx.createRadialGradient(
          width / 2, centerY, 5,
          width / 2, centerY, width / 2
        );
        if (aiOn) {
          gradient.addColorStop(0, 'rgba(6, 182, 212, 0.08)'); // cyan
          gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
        } else {
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.08)'); // indigo
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw waves
      // Siri-like multi-layered sine waves
      const waveCount = aiOn ? 3 : 5; // more chaotic waves when AI is off
      const colors = aiOn
        ? [
            'rgba(6, 182, 212, 0.8)',   // cyan
            'rgba(59, 130, 246, 0.6)',  // blue
            'rgba(16, 185, 129, 0.4)',  // emerald
          ]
        : [
            'rgba(99, 102, 241, 0.5)',  // indigo (noisy)
            'rgba(168, 85, 247, 0.4)',  // purple
            'rgba(239, 68, 68, 0.3)',   // red (chaos)
            'rgba(156, 163, 175, 0.2)', // gray
          ];

      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        ctx.lineWidth = w === 0 ? 3 : 1.5;
        ctx.strokeStyle = colors[w] || 'rgba(255, 255, 255, 0.1)';

        const progress = w / waveCount;
        const wavePhase = phase + progress * Math.PI * 2;
        
        // Amplitude scales with audio level
        let amplitude = audioLevel * (height * 0.45) * (1 - progress * 0.4);
        
        // Add minimal noise/jitter even when quiet if AI is off
        if (!aiOn && !isSpeaking) {
          amplitude = 1.5 + Math.sin(phase * 2 + progress) * 0.8;
        } else if (!isSpeaking) {
          amplitude = 0; // Flat silent line when AI is active
        }

        for (let x = 0; x < width; x++) {
          // Normalize x to [0, 1]
          const normX = x / width;

          // Envelope curve (smooth curve that starts/ends at 0 so waves don't hit edge)
          const envelope = Math.sin(normX * Math.PI);

          // Wave equation
          let sine = Math.sin(normX * (Math.PI * (2 + w)) - wavePhase);

          // Add jitter/distortion if AI is off (chaotic noise)
          if (!aiOn && isSpeaking) {
            const noise = (Math.sin(normX * 45 + phase * 10) * 0.15) * (Math.cos(normX * 12 - phase * 5) * 0.8);
            sine += noise;
          }

          const y = centerY + sine * amplitude * envelope;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [audioLevel, aiOn, isSpeaking]);

  return (
    <div className="w-full h-20 rounded-2xl bg-[#0f1115]/50 border border-white/5 overflow-hidden relative shadow-inner">
      <canvas ref={canvasRef} className="w-full h-full block" />
      {!isSpeaking && aiOn && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase tracking-widest text-emerald-400/40 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/40 animate-pulse" />
            AI Noise Shield Active • Silence
          </span>
        </div>
      )}
    </div>
  );
}
