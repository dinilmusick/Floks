'use client';
import React, { useState } from 'react';
import { BaseButton } from '../base/BaseButton.js';

export interface MidiUiDevice {
  id:string; name:string; origin:'physical'|'logical'; state:'connected'|'disconnected';
  direction:'input'|'output'|'duplex'; capabilities:{input:boolean;output:boolean;virtualDeviceCreation:boolean};
}
export interface MidiUiMessage { type:string; channel?:number; noteOrController?:number; value?:number; }
export interface MidiServicePanelProps {
  devices:MidiUiDevice[]; messages:MidiUiMessage[];
  onRefresh:()=>void; onConnect:(id:string,direction:'input'|'output')=>void;
  onDisconnect:(id:string)=>void; onSend:(id:string,message:MidiUiMessage)=>void;
  onCreateLogicalDevice:(name:string)=>void;
}
export function MidiServicePanel({devices,messages,onRefresh,onConnect,onDisconnect,onSend,onCreateLogicalDevice}:MidiServicePanelProps){
  const [name,setName]=useState('Internal MIDI');
  const [selected,setSelected]=useState('');
  const [note,setNote]=useState(60);
  const [velocity,setVelocity]=useState(100);
  const selectedDevice=devices.find(device=>device.id===selected);
  return <section className="floks-service-panel floks-midi-panel" aria-label="MIDI Service">
    <header><h3>MIDI Devices</h3><BaseButton onClick={onRefresh}>Discover devices</BaseButton></header>
    <p>Physical devices are discovered from the runtime. Logical endpoints are in-process routes and are not OS virtual MIDI ports.</p>
    <ul>{devices.map(device=><li key={device.id}>
      <label><input type="radio" name="midi-device" checked={selected===device.id} onChange={()=>setSelected(device.id)}/>{device.name}</label>
      <span>{device.origin} · {device.state} · {device.direction}</span>
      <span>{device.capabilities.input?'Input ':''}{device.capabilities.output?'Output':''}</span>
      {device.origin==='physical'&&device.state==='disconnected'&&device.capabilities.input&&<BaseButton onClick={()=>onConnect(device.id,'input')}>Connect input</BaseButton>}
      {device.origin==='physical'&&device.state==='disconnected'&&device.capabilities.output&&<BaseButton onClick={()=>onConnect(device.id,'output')}>Connect output</BaseButton>}
      {device.state==='connected'&&<BaseButton onClick={()=>onDisconnect(device.id)}>Disconnect</BaseButton>}
    </li>)}</ul>
    <form onSubmit={event=>{event.preventDefault();onCreateLogicalDevice(name);}}>
      <label>Create logical endpoint<input value={name} onChange={event=>setName(event.currentTarget.value)} /></label>
      <BaseButton type="submit">Create logical MIDI endpoint</BaseButton>
    </form>
    <div><h4>Send note</h4><label>Note<input type="number" min="0" max="127" value={note} onChange={event=>setNote(Number(event.currentTarget.value))}/></label>
      <label>Velocity<input type="number" min="0" max="127" value={velocity} onChange={event=>setVelocity(Number(event.currentTarget.value))}/></label>
      <BaseButton disabled={!selectedDevice?.capabilities.output} onClick={()=>selected&&onSend(selected,{type:'noteOn',channel:0,noteOrController:note,value:velocity})}>Send Note On</BaseButton>
      <BaseButton disabled={!selectedDevice?.capabilities.output} onClick={()=>selected&&onSend(selected,{type:'noteOff',channel:0,noteOrController:note,value:0})}>Send Note Off</BaseButton>
    </div>
    <div aria-label="MIDI receive monitor"><h4>Received MIDI</h4><ol>{messages.slice(-20).map((message,index)=><li key={index}>{message.type} · ch {message.channel??'—'} · {message.noteOrController??''} · {message.value??''}</li>)}</ol></div>
  </section>;
}
