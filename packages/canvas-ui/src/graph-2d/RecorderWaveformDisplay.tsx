// ══════════════════════════════════════════════════════════════════════════════════════════
// RECORDER WAVEFORM DISPLAY (Dynamic Node Body Waveform Visualization)
// ══════════════════════════════════════════════════════════════════════════════════════════
// @role component
import React, { useState, useEffect, useRef } from 'react';
import { RecorderNode, SpaceNode, NodeConnection } from '@kloks/state-graph';
import { retrospectiveBufferEngine } from '@kloks/audio-midi';
import { sequencerEngine } from '@kloks/audio-midi';
import { synthEngine } from '@kloks/audio-midi';
import * as GraphConcepts from '@kloks/state-graph';

export interface RecorderWaveformDisplayProps {
  node: RecorderNode;
  connections?: NodeConnection[];
  allNodes?: SpaceNode[];
  width?: number;
}

function buildWaveformPath(peaks: number[], width: number, height: number): string {
  if (!peaks || peaks.length === 0) return `M 0 ${height / 2} L ${width} ${height / 2}`;
  const step = width / Math.max(1, peaks.length - 1);
  const midY = height / 2;
  let topPoints = '';
  let bottomPoints = '';

  for (let i = 0; i < peaks.length; i++) {
    const x = Math.round(i * step * 10) / 10;
    const amp = Math.max(0.08, Math.min(1.0, peaks[i] || 0.08)) * (midY - 2);
    topPoints += `${i === 0 ? 'M' : 'L'} ${x} ${midY - amp} `;
    bottomPoints = `L ${x} ${midY + amp} ` + bottomPoints;
  }
  return `${topPoints} ${bottomPoints} Z`;
}

export const RecorderWaveformDisplay: React.FC<RecorderWaveformDisplayProps> = ({
  node,
  connections = [],
  allNodes = [],
  width = 150,
}) => {
  const [currentBeat, setCurrentBeat] = useState(0);
  const [capturedFlash, setCapturedFlash] = useState(false);
  const [livePeaksL, setLivePeaksL] = useState<number[]>([]);
  const [livePeaksR, setLivePeaksR] = useState<number[]>([]);
  const lastBeatRef = useRef(0);

  const isArmed = !!node.isArmed;
  const isRetrospective = node.recordingMode === 'retrospective';
  const isRecording = !isRetrospective && !!node.isRecording;
  const isStereo = node.recorderType !== 'audio_mono';

  useEffect(() => {
    return retrospectiveBufferEngine.onSnapshotCaptured((recId) => {
      if (recId === node.id) {
        setCapturedFlash(true);
        setTimeout(() => setCapturedFlash(false), 1200);
      }
    });
  }, [node.id]);

  useEffect(() => {
    if (!isArmed) return;
    let animId: number;
    let lastSampleTime = 0;

    const sourceNode = (GraphConcepts as any).findSourceNode?.(node.id, 'stream_in', connections, allNodes);
    const incomingWire = connections.find(
      (c) => c.toNodeId === node.id && (c.toPort === 'stream_in' || c.toSocketIndex === 0 || !c.toPort)
    );

    const tick = (time: number) => {
      const beat = sequencerEngine.currentBeat;
      setCurrentBeat(beat);

      if (time - lastSampleTime >= 40) {
        lastSampleTime = time;
        const gainVal = node.gain ?? 1.0;
        const levels = sourceNode
          ? synthEngine.getWireSignalLevel(sourceNode, incomingWire?.fromPort)
          : { left: 0, right: 0 };

        const pL = Math.min(1.0, levels.left * gainVal);
        const pR = Math.min(1.0, levels.right * gainVal);

        if (isRecording) {
          setLivePeaksL((prev) => [...prev.slice(-63), pL]);
          setLivePeaksR((prev) => [...prev.slice(-63), pR]);
        } else if (isRetrospective) {
          setLivePeaksL((prev) => [...prev.slice(-39), pL]);
          setLivePeaksR((prev) => [...prev.slice(-39), pR]);
        }
      }
      animId = requestAnimationFrame(tick);
    };

    const currentBeatVal = sequencerEngine.currentBeat;
    if (isRecording && Math.abs(currentBeatVal - lastBeatRef.current) > 0.5) {
      setLivePeaksL([]);
      setLivePeaksR([]);
    }
    lastBeatRef.current = currentBeatVal;

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isArmed, isRecording, isRetrospective, node.id, node.gain, connections, allNodes]);

  if (!isArmed) return null;

  const elapsedBeats = isRecording ? Math.max(0, currentBeat - (node.recordingStartBeat || 0)) : 0;
  const bars = Math.floor(elapsedBeats / 4);
  const beatsInBar = (elapsedBeats % 4).toFixed(1);
  const timeText = isRecording
    ? `${bars} BAR${bars === 1 ? '' : 'S'} ${beatsInBar} BEATS`
    : isRetrospective
    ? `${node.bufferLengthBars ?? 4} BARS BUFFER`
    : '1 BAR PREVIEW';

  const isRedState = isRecording || (isRetrospective && capturedFlash);
  const colorStroke = isRedState ? '#f43f5e' : '#94a3b8';
  const colorFill = isRedState ? 'rgba(244, 63, 94, 0.25)' : 'rgba(148, 163, 184, 0.15)';
  const glowShadow = isRedState ? '0 0 8px rgba(244, 63, 94, 0.6)' : 'none';

  const renderPeaksL = isRecording || isRetrospective
    ? livePeaksL.length > 0 ? livePeaksL : [0.15, 0.3, 0.2, 0.4, 0.2, 0.15]
    : [0.15, 0.3, 0.25, 0.5, 0.3, 0.4, 0.2, 0.15];

  const renderPeaksR = isRecording || isRetrospective
    ? livePeaksR.length > 0 ? livePeaksR : [0.12, 0.28, 0.18, 0.38, 0.22, 0.14]
    : [0.12, 0.28, 0.22, 0.45, 0.28, 0.35, 0.18, 0.12];

  const trackHeight = isStereo ? 18 : 36;

  return (
    <div
      className="flex flex-col items-center justify-center w-full px-1 py-1 rounded bg-black/60 border border-slate-800 select-none overflow-hidden"
      style={{ boxShadow: glowShadow }}
    >
      <div className="flex items-center justify-between w-full px-1 mb-0.5 text-[8px] font-mono font-bold tracking-tight">
        <span className={isRedState ? 'text-rose-400 animate-pulse' : 'text-slate-400'}>
          {isRedState ? '● REC' : isRetrospective ? '● BUFFER' : 'ARMED'}
        </span>
        <span className={isRedState ? 'text-rose-300 font-extrabold' : 'text-slate-400'}>
          {timeText}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 w-full">
        <div className={`relative w-full ${isStereo ? 'h-[18px]' : 'h-[36px]'} bg-slate-950/80 rounded border border-slate-800/80 overflow-hidden`}>
          {isStereo && (
            <span className="absolute top-0.5 left-1 text-[7px] font-mono font-bold text-slate-500 z-10">L</span>
          )}
          <svg className="w-full h-full" viewBox={`0 0 ${width} ${trackHeight}`} preserveAspectRatio="none">
            <path d={buildWaveformPath(renderPeaksL, width, trackHeight)} fill={colorFill} stroke={colorStroke} strokeWidth="1.2" />
          </svg>
        </div>
        {isStereo && (
          <div className="relative w-full h-[18px] bg-slate-950/80 rounded border border-slate-800/80 overflow-hidden">
            <span className="absolute top-0.5 left-1 text-[7px] font-mono font-bold text-slate-500 z-10">R</span>
            <svg className="w-full h-full" viewBox={`0 0 ${width} ${trackHeight}`} preserveAspectRatio="none">
              <path d={buildWaveformPath(renderPeaksR, width, trackHeight)} fill={colorFill} stroke={colorStroke} strokeWidth="1.2" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

