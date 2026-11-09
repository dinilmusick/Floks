export type SocketType = 'input' | 'output';

export interface Socket {
  id: string;
  label: string;
  type: SocketType;
  dataType?: string;
  direction?: string;
  offset?: { x: number; y: number };
  basePosition?: { x: number; y: number };
  connectionMode?: 'SINGLE' | 'MULTI';
  [key: string]: unknown;
}

export interface GraphNode {
  id: string;
  type: string;
  label?: string;
  name?: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  width?: number;
  height?: number;
  inputs?: Socket[];
  outputs?: Socket[];
  handles?: unknown[];
  [key: string]: any;
}

export interface GraphEdge {
  id: string;
  source: string;
  sourceSocket: string;
  target: string;
  targetSocket: string;
  label?: string;
  color?: string;
  wireType?: string;
  locked?: boolean;
  deletable?: boolean;
  [key: string]: any;
}

export interface ViewportState { panX: number; panY: number; zoom: number; }

export interface NodeGraphConfig {
  minZoom?: number; maxZoom?: number; gridSize?: number; snapToGrid?: boolean;
  wireStyle?: 'bezier' | 'straight' | 'step';
  tracingEnabled?: boolean; magneticTracesEnabled?: boolean; autoSolidify?: boolean;
  traceCutoffDistance?: number; ghostRoutingEnabled?: boolean; ghostScenarioCount?: number; ghostDecayMs?: number;
}

export interface NodeDefinition {
  type: string; label: string; description?: string; category?: string;
  inputs?: Array<{id:string; label?:string; dataType?:string; [key:string]:any}>;
  outputs?: Array<{id:string; label?:string; dataType?:string; [key:string]:any}>;
  [key:string]: any;
}

export interface NodeSocketDescriptor extends Socket {
  socketId?: string;
  handleCategory?: string;
  direction?: string;
  [key:string]: any;
}
export interface NodeSocketsResult { inputs: NodeSocketDescriptor[]; outputs: NodeSocketDescriptor[]; [key:string]: any; }

export interface SpaceNode extends GraphNode { name?: string; [key:string]: any; }
export interface ContainerNode extends SpaceNode { containerType?: string; audioFormat?: string; }
export interface ModuleNode extends SpaceNode { innerNodes?: SpaceNode[]; }
export interface TriggerNode extends SpaceNode { intervalBeats?: number; }
export interface EffectNode extends SpaceNode {
  radius?: number; effectType?: string;
  compressorConfig?: any; multibandCompressorConfig?: any; limiterConfig?: any;
  reverbConfig?: any; delayConfig?: any; saturationConfig?: any;
}
export interface RecorderNode extends SpaceNode {
  isArmed?: boolean; recordingMode?: string; isRecording?: boolean; peaks?: number[];
}
export interface Node2DSpriteSetting { spriteName: string; iconName: string; accentColor: string; glowColor: string; [key:string]:any; }

export interface NodeConnection {
  id?: string; fromNodeId: string; toNodeId: string;
  fromSocketId?: string; toSocketId?: string; fromPort?: string; toPort?: string;
  [key:string]: any;
}
export interface SolidConnection extends NodeConnection {}
export interface ViewLink { [key:string]: any; }
export interface Trace {
  id: string; sourceNodeId: string; targetNodeId: string;
  sourceHandleId: string; targetHandleId: string; wireType: string;
  spatialScore: number; [key:string]: any;
}
export interface Landmark { id: string; [key:string]: any; }
export interface MagneticTraceRecord {
  id: string; sourceNodeId: string; sourceSocketId: string; targetNodeId: string; targetSocketId: string;
  wireType: string; color: string; pathD: string; midpoint: {x:number;y:number}; distance:number;
}
export interface GhostNodeRecord { [key:string]: any; }
export interface GhostTraceRecord { [key:string]: any; }
export interface PredictiveGhostNode { [key:string]: any; }
export interface PredictiveTrace { [key:string]: any; }
export interface GraphSettings { [key:string]: any; }
export interface UniversalSocketDefinition { [key:string]: any; }
export interface BaseViewWindow { [key:string]: any; }

export class BaseNode {
  constructor(props: Partial<GraphNode> = {}) { Object.assign(this, props); }
  [key:string]: any;
}
export class GraphNodeParent extends BaseNode {}
export class GraphWireParent { [key:string]: any; constructor(props: Record<string,any>={}) { Object.assign(this,props); } }

export const SIGNAL_TYPES = {
  AUDIO_STEREO:'AUDIO_STEREO', AUDIO_MONO:'AUDIO_MONO', AUDIO_PACKET:'AUDIO_PACKET',
  TRIGGER:'TRIGGER', MIDI_STREAM:'MIDI_STREAM', MIDI_PACKET:'MIDI_PACKET',
  CURVE_STREAM:'CURVE_STREAM', CURVE_PACKET:'CURVE_PACKET', COMPONENT:'COMPONENT',
} as const;

export function canvasToScreen(x:number,y:number,viewport:ViewportState){ return {x:x*viewport.zoom+viewport.panX,y:y*viewport.zoom+viewport.panY}; }
export function zoomAtPoint(mouseX:number,mouseY:number,delta:number,viewport:ViewportState,config:NodeGraphConfig={}) {
  const zoom=Math.max(config.minZoom??0.25,Math.min(config.maxZoom??2.5,viewport.zoom+delta));
  const gx=(mouseX-viewport.panX)/viewport.zoom, gy=(mouseY-viewport.panY)/viewport.zoom;
  return {zoom,panX:mouseX-gx*zoom,panY:mouseY-gy*zoom};
}
export function isNodeInCenterDeadZone(node:GraphNode,viewport:ViewportState,w:number,h:number,ratio=.35){
  const nx=(node.position.x+(node.width??130)/2)*viewport.zoom+viewport.panX;
  const ny=(node.position.y+(node.height??130)/2)*viewport.zoom+viewport.panY;
  return Math.hypot(nx-w/2,ny-h/2)<=Math.min(w,h)*ratio;
}
export function getCenterPanForNode(node:GraphNode,viewport:ViewportState,w:number,h:number){
  return {panX:Math.round(w/2-(node.position.x+(node.width??130)/2)*viewport.zoom),panY:Math.round(h/2-(node.position.y+(node.height??130)/2)*viewport.zoom)};
}
export function getNodesInSelection(sx:number,sy:number,ex:number,ey:nodesType,viewport:ViewportState):string[];
type nodesType=GraphNode[];
export function getNodesInSelection(sx:number,sy:number,ex:number,ey:number,nodes:GraphNode[],viewport:ViewportState):string[] {
  const a=(sx-viewport.panX)/viewport.zoom,b=(sy-viewport.panY)/viewport.zoom,c=(ex-viewport.panX)/viewport.zoom,d=(ey-viewport.panY)/viewport.zoom;
  const minX=Math.min(a,c),maxX=Math.max(a,c),minY=Math.min(b,d),maxY=Math.max(b,d);
  return nodes.filter(n=>n.position.x<maxX&&n.position.x+(n.width??150)>minX&&n.position.y<maxY&&n.position.y+(n.height??100)>minY).map(n=>n.id);
}
export function calculateSocketCoordinates(baseY:number,options:{cardWidth:number;cardHeight?:number;isOutput:boolean;clearance?:number;nudge?:{x:number;y:number}}){
  const clearance=Math.max(12,options.clearance??14), nudge=options.nudge??{x:0,y:0}, half=options.cardWidth/2;
  const baseX=options.isOutput?half+clearance:-half-clearance;
  let x=baseX+nudge.x,y=baseY+nudge.y;
  const hh=(options.cardHeight??80)/2;
  if(x>-half-4&&x<half+4&&y>-hh-4&&y<hh+4)x=options.isOutput?half+Math.max(4,clearance/2):-half-Math.max(4,clearance/2);
  return {baseX,effectiveX:x,effectiveY:y,nudge:{x:x-baseX,y:y-baseY}};
}
export const getBeamPoints=(nudge:{x:number;y:number},baseW=5,headW=1.2)=>{
  const vx=-nudge.x,vy=-nudge.y,d=Math.hypot(vx,vy); if(d<1)return '';
  const px=-vy/d,py=vx/d;
  return `${-px*headW},${-py*headW} ${px*headW},${py*headW} ${vx+px*baseW},${vy+py*baseW} ${vx-px*baseW},${vy-py*baseW}`;
};
export function describeSvgArc(x1:number,y1:number,x2:number,y2:number,radius:number){ const dx=x2-x1,dy=y2-y1; return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`; }

export function getNodeSockets(node:SpaceNode):NodeSocketsResult {
  return {inputs:(node.inputs??[]).map((s:any)=>({...s,socketId:s.socketId??s.id})),outputs:(node.outputs??[]).map((s:any)=>({...s,socketId:s.socketId??s.id}))};
}

export class ConnectionRuleStore {
  private static initialized=false;
  private static definitions=new Map<string,NodeDefinition>();
  static isInitialized(){return this.initialized;}
  static initializeDefaults(){this.initialized=true;}
  static registerNodeType(def:NodeDefinition){this.definitions.set(def.type,def);}
  static getNodeType(type:string){return this.definitions.get(type);}
  static listNodeTypes(){return [...this.definitions.values()];}
  static canConnect(a:any,b:any){
    if(a.direction===b.direction)return false;
    if(a.dataType==='ANY'||b.dataType==='ANY')return true;
    return !a.dataType||!b.dataType||a.dataType===b.dataType;
  }
}

export class MagneticGraphManager {
  constructor(public nodes:SpaceNode[]=[],public connections:NodeConnection[]=[]){}
  getTraces():Trace[]{ return []; }
}

export function computePredictiveGraph(selectedNodes:SpaceNode[],connections:NodeConnection[],scenarioIndex=0):PredictiveGhostNode[]{
  return [];
}
