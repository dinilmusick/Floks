'use client';
import React from 'react';
import { BaseButton } from '../base/BaseButton.js';

export interface ClockUiSnapshot {
  state:'stopped'|'running'|'paused'; tempo:number; beat:number; bar:number; beatInBar:number;
  tick:number; subdivision:number; elapsedMs:number; resolution:number;
}
export interface ClockServicePanelProps {
  snapshot:ClockUiSnapshot;
  onStart:()=>void; onStop:()=>void; onPause:()=>void; onResume:()=>void; onReset:()=>void;
  onTempoChange:(tempo:number)=>void;
  title?:string;
}
export function ClockServicePanel({snapshot,onStart,onStop,onPause,onResume,onReset,onTempoChange,title='Application Clock'}:ClockServicePanelProps){
  const running=snapshot.state==='running';
  return <section className="floks-service-panel floks-clock-panel" aria-label={title}>
    <header><h3>{title}</h3><span role="status" data-state={snapshot.state}>{snapshot.state}</span></header>
    <div className="floks-clock-position" aria-live="polite">
      <strong>{snapshot.bar}:{snapshot.beatInBar.toFixed(2)}</strong>
      <span>Beat {snapshot.beat.toFixed(3)} · Tick {snapshot.tick}</span>
      <span>{Math.floor(snapshot.elapsedMs/1000)}s elapsed</span>
    </div>
    <label>Tempo (BPM)
      <input aria-label="Tempo BPM" type="number" min="1" max="1000" value={snapshot.tempo}
        onChange={event=>onTempoChange(Number(event.currentTarget.value))}/>
    </label>
    <div className="floks-clock-controls">
      <BaseButton variant="accent" onClick={onStart} disabled={running}>Start</BaseButton>
      <BaseButton onClick={onPause} disabled={!running}>Pause</BaseButton>
      <BaseButton onClick={onResume} disabled={snapshot.state!=='paused'}>Resume</BaseButton>
      <BaseButton onClick={onStop} disabled={snapshot.state==='stopped'}>Stop</BaseButton>
      <BaseButton variant="danger" onClick={onReset}>Reset</BaseButton>
    </div>
    <small>Resolution: {snapshot.resolution} ticks/beat · Subdivision: {snapshot.subdivision}</small>
  </section>;
}
