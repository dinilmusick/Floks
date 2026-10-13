export * from './types';
import { PredictiveGhostNodeCardProps } from './types';

import React from 'react';
import { Zap } from 'lucide-react';
import { PredictiveGhostNode } from '@kloks/state-graph';
import { getNodeSockets } from '@kloks/state-graph';
import { getSocketLocalOffset } from '../../graph-2d/socketCoordinates.js';
import { renderSpriteIcon } from '../../graph-2d/Node2DBase.js';
import { NodeAssetRegistry } from '@kloks/state-graph';
import { RecorderNode, ContainerNode, ButtonNode, TriggerNode } from '@kloks/state-graph';


export const PredictiveGhostNodeCard: React.FC<PredictiveGhostNodeCardProps> = ({
  ghost,
  screenPos,
  zoom,
  onSolidify,
  isHovered = false,
  onHoverChange,
}) => {
  const node = ghost.prototypeNode;
  const { inputs, outputs } = getNodeSockets(node);
  const sprite = NodeAssetRegistry.get2DSpriteSetting(node);

  const isRetroRecorder = node.type === 'recorder' && (node as RecorderNode).recordingMode === 'retrospective';
  const isStandardRecorder = node.type === 'recorder' && !isRetroRecorder;
  const isContainer = node.type === 'container';
  const isButton = node.type === 'button';
  const isTrigger = node.type === 'trigger';
  const isTriggerFractions = isTrigger && (node as TriggerNode).triggerType === 'beat_fractions';
  const isStringNode = node.type === 'primitive_string';
  const isNumberNode = node.type === 'primitive_number';
  const isBooleanNode = node.type === 'primitive_boolean';
  const isObjectNode = node.type === 'primitive_object';
  const isFolderPathNode = node.type === 'folder_path';

  const triggerWidth = isTriggerFractions ? 'w-[260px]' : 'w-[170px]';
  const cardWidthClass = isTrigger
    ? triggerWidth
    : isRetroRecorder
    ? 'w-[200px]'
    : isStandardRecorder
    ? 'w-[165px]'
    : isContainer
    ? 'w-[190px]'
    : isFolderPathNode || isObjectNode
    ? 'w-[180px]'
    : isStringNode
    ? 'w-[165px]'
    : isNumberNode
    ? 'w-[145px]'
    : isBooleanNode
    ? 'w-[130px]'
    : isButton
    ? 'w-[100px] h-[100px]'
    : 'w-[130px]';

  const maxSockets = Math.max(inputs.length, outputs.length);
  const dynamicMinHeight = isButton ? '100px' : maxSockets > 1 ? `${Math.max(64, maxSockets * 32 + 10)}px` : '64px';

  return (
    <div
      style={{
        position: 'absolute',
        left: `${screenPos.x}px`,
        top: `${screenPos.y}px`,
        transform: `translate(-50%, -50%) scale(${Math.max(0.65, Math.min(1.15, zoom))})`,
        transformOrigin: 'center center',
      }}
      className="pointer-events-auto z-30 select-none transition-transform"
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      {/* Ghost Node Card Shell - Semi-transparent with bluish hue & dashed cyan border */}
      <div
        className={`relative ${cardWidthClass} rounded-lg bg-slate-950/65 backdrop-blur-md border-2 border-dashed border-cyan-400/70 p-2 flex flex-col items-center justify-center transition-all duration-200 ${
          isHovered
            ? 'border-cyan-300 bg-slate-950/80 shadow-[0_0_30px_rgba(56,189,248,0.5)] scale-105'
            : 'shadow-[0_0_18px_rgba(56,189,248,0.25)]'
        }`}
        style={{ minHeight: dynamicMinHeight }}
      >
        {/* Holographic Header Tag */}
        <div className="w-full flex items-center justify-between pb-1 border-b border-cyan-500/20 text-[8px] font-mono tracking-wider text-cyan-300/80">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-extrabold uppercase truncate max-w-[90px]">{node.name || ghost.label}</span>
          </div>
          <span className="text-cyan-400/60 font-bold">[{ghost.candidateIndex + 1}/{ghost.totalCandidates}]</span>
        </div>

        {/* Real Node Body Display Preview */}
        {isContainer ? (
          <div className="w-full py-1.5 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              {renderSpriteIcon(sprite.iconName, '#38bdf8', 'w-4 h-4')}
              <span className="text-[10px] font-mono font-bold text-cyan-200">
                {(node as ContainerNode).containerType?.toUpperCase()} CONTAINER
              </span>
            </div>
            <div className="w-full h-4 rounded bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-around px-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-1.5 rounded-sm bg-cyan-400/40" style={{ height: `${30 + (i % 3) * 30}%` }} />
              ))}
            </div>
          </div>
        ) : isStandardRecorder || isRetroRecorder ? (
          <div className="w-full py-1.5 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              {renderSpriteIcon(sprite.iconName, '#f43f5e', 'w-4 h-4')}
              <span className="text-[9px] font-mono font-bold text-rose-300">
                {isRetroRecorder ? 'RETRO RECORDER' : 'LIVE RECORDER'}
              </span>
            </div>
            <div className="w-full h-3 rounded bg-rose-950/30 border border-rose-500/20 flex items-center px-1">
              <div className="w-2/3 h-1.5 rounded-sm bg-rose-500/50 animate-pulse" />
            </div>
          </div>
        ) : isTrigger ? (
          <div className="w-full py-1 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              {renderSpriteIcon(sprite.iconName, '#eab308', 'w-3.5 h-3.5')}
              <span className="text-[9px] font-mono font-bold text-amber-300">STEP SEQUENCER</span>
            </div>
            <div className="flex gap-1">
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-sm border ${i % 2 === 0 ? 'bg-amber-400/60 border-amber-300' : 'bg-slate-900 border-amber-500/30'}`} />
              ))}
            </div>
          </div>
        ) : isButton ? (
          <div className="flex flex-col items-center justify-center my-auto">
            <div className="w-8 h-8 rounded-full border border-emerald-400/60 bg-emerald-950/30 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-emerald-400/80 animate-pulse" />
            </div>
          </div>
        ) : isStringNode || isNumberNode || isBooleanNode || isObjectNode || isFolderPathNode ? (
          <div className="w-full py-1 flex flex-col items-center gap-0.5 text-center">
            <span className="text-[10px] font-mono font-bold text-cyan-200 truncate">{ghost.label}</span>
            <span className="text-[8px] font-mono text-cyan-400/60">{ghost.badge}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-1.5 text-center">
            {renderSpriteIcon(sprite.iconName, sprite.accentColor || '#38bdf8', 'w-6 h-6')}
            <span className="text-[9px] font-mono font-bold text-cyan-200 mt-1 truncate max-w-[110px]">
              {node.name || ghost.label}
            </span>
          </div>
        )}

        {/* Input Sockets - Real positioning */}
        {inputs.map((socket, idx) => {
          const localPos = getSocketLocalOffset(node, socket.socketId, false, idx, inputs.length);
          const isTargetMatching = ghost.matchingSocketId === socket.socketId;
          return (
            <div
              key={socket.socketId}
              style={{
                position: 'absolute',
                left: `calc(50% + ${localPos.x}px)`,
                top: `calc(50% + ${localPos.y}px)`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`w-2.5 h-2.5 rounded-full border ${
                isTargetMatching
                  ? 'bg-cyan-400 border-white shadow-[0_0_10px_#38bdf8] scale-125'
                  : 'bg-cyan-950 border-cyan-500/60'
              }`}
              title={`Input: ${socket.label}`}
            />
          );
        })}

        {/* Output Sockets - Real positioning */}
        {outputs.map((socket, idx) => {
          const localPos = getSocketLocalOffset(node, socket.socketId, true, idx, outputs.length);
          const isTargetMatching = ghost.matchingSocketId === socket.socketId;
          return (
            <div
              key={socket.socketId}
              style={{
                position: 'absolute',
                left: `calc(50% + ${localPos.x}px)`,
                top: `calc(50% + ${localPos.y}px)`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`w-2.5 h-2.5 rounded-full border ${
                isTargetMatching
                  ? 'bg-cyan-400 border-white shadow-[0_0_10px_#38bdf8] scale-125'
                  : 'bg-cyan-950 border-cyan-500/60'
              }`}
              title={`Output: ${socket.label}`}
            />
          );
        })}

        {/* Icon-Only Solidify Button */}
        <button
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onSolidify(ghost);
          }}
          className="absolute -top-3 -right-3 z-40 w-7 h-7 rounded-full bg-slate-950/95 border-2 border-cyan-400 text-cyan-300 hover:bg-cyan-900 hover:text-white hover:border-cyan-200 hover:scale-125 shadow-[0_0_15px_rgba(6,182,212,0.8)] flex items-center justify-center transition-all cursor-pointer group/btn"
          title={`Solidify ${node.name || ghost.label} & wire connection`}
        >
          <Zap className="w-3.5 h-3.5 text-cyan-300 group-hover/btn:scale-110" />
        </button>
      </div>
    </div>
  );
};