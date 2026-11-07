import React from 'react';
import {describe,expect,it,vi} from 'vitest';
import {fireEvent,render,screen} from '@testing-library/react';
import {ClockServicePanel,MidiServicePanel,OscServicePanel} from '@ultrst-armada/floks/ui/services';
describe('independent service UI surfaces',()=>{
 it('renders clock position and dispatches timing controls',()=>{
  const start=vi.fn(),tempo=vi.fn();
  render(<ClockServicePanel snapshot={{state:'stopped',tempo:120,beat:0,bar:1,beatInBar:1,tick:0,subdivision:0,elapsedMs:0,resolution:24}} onStart={start} onStop={()=>{}} onPause={()=>{}} onResume={()=>{}} onReset={()=>{}} onTempoChange={tempo}/>);
  fireEvent.click(screen.getByRole('button',{name:'Start'}));expect(start).toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Tempo BPM'),{target:{value:'128'}});expect(tempo).toHaveBeenCalledWith(128);
 });
 it('distinguishes physical MIDI hardware from logical endpoints',()=>{
  const create=vi.fn();
  render(<MidiServicePanel devices={[{id:'physical',name:'Keyboard',origin:'physical',state:'connected',direction:'input',capabilities:{input:true,output:false,virtualDeviceCreation:false}}]} messages={[]} onRefresh={()=>{}} onConnect={()=>{}} onDisconnect={()=>{}} onSend={()=>{}} onCreateLogicalDevice={create}/>);
  expect(screen.getByText(/physical · connected/)).toBeInTheDocument();
  expect(screen.getByText(/not OS virtual MIDI ports/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Create logical MIDI endpoint'}));expect(create).toHaveBeenCalled();
 });
 it('configures OSC endpoints and sends JSON arguments',()=>{
  const send=vi.fn();
  render(<OscServicePanel clients={[{id:'out',host:'127.0.0.1',port:9000,transport:'udp'}]} servers={[]} messages={[]} onAddClient={()=>{}} onStartServer={()=>{}} onStopServer={()=>{}} onSend={send}/>);
  fireEvent.click(screen.getByRole('button',{name:'Select'}));
  fireEvent.change(screen.getByLabelText('Address'),{target:{value:'/lights/1'}});
  fireEvent.click(screen.getByRole('button',{name:'Send message'}));expect(send).toHaveBeenCalledWith('out',{address:'/lights/1',args:[]});
 });
});
