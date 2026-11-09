export type SocketType = 'input' | 'output';
export interface Socket { id:string; label:string; type:SocketType; dataType?:string; direction?:string; offset?:{x:number;y:number}; [key:string]:any; }
export interface GraphNode { id:string; type:string; label?:string; name?:string; position:{x:number;y:number}; width?:number;height?:number;inputs?:Socket[];outputs?:Socket[];[key:string]:any; }
export interface GraphEdge { id:string; source:string;sourceSocket:string;target:string;targetSocket:string;label?:string;color?:string;wireType?:string;locked?:boolean;[key:string]:any; }
export interface ViewportState {panX:number;panY:number;zoom:number}
export interface NodeGraphConfig {minZoom?:number;maxZoom?:number;gridSize?:number;snapToGrid?:boolean;wireStyle?:'bezier'|'straight'|'step';tracingEnabled?:boolean;magneticTracesEnabled?:boolean;autoSolidify?:boolean;traceCutoffDistance?:number;ghostRoutingEnabled?:boolean;ghostScenarioCount?:number;ghostDecayMs?:number}
export interface NodeDefinition {type:string;label:string;description?:string;category?:string;inputs?:Array<{id:string;label?:string;dataType?:string;[key:string]:any}>;outputs?:Array<{id:string;label?:string;dataType?:string;[key:string]:any}>;[key:string]:any}
export interface NodeSocketDescriptor extends Socket {socketId?:string;handleCategory?:string;[key:string]:any}
export interface NodeSocketsResult {inputs:NodeSocketDescriptor[];outputs:NodeSocketDescriptor[];[key:string]:any}
export interface SpaceNode extends GraphNode {}
export interface ContainerNode extends SpaceNode {containerType?:string;audioFormat?:string}
export interface ModuleNode extends SpaceNode {innerNodes?:SpaceNode[]}
export interface TriggerNode extends SpaceNode {intervalBeats?:number}
export interface EffectNode extends SpaceNode {radius?:number;effectType?:string;compressorConfig?:any;multibandCompressorConfig?:any;limiterConfig?:any;reverbConfig?:any;delayConfig?:any;saturationConfig?:any}
export interface RecorderNode extends SpaceNode {isArmed?:boolean;recordingMode?:string;isRecording?:boolean;peaks?:number[]}
export interface Node2DSpriteSetting {spriteName:string;iconName:string;accentColor:string;glowColor:string;[key:string]:any}
export interface NodeConnection {id?:string;fromNodeId:string;toNodeId:string;fromSocketId?:string;toSocketId?:string;fromPort?:string;toPort?:string;[key:string]:any}
export interface SolidConnection extends NodeConnection {}
export interface ViewLink {[key:string]:any}
export interface Trace {id:string;sourceNodeId:string;targetNodeId:string;sourceHandleId:string;targetHandleId:string;wireType:string;spatialScore:number;[key:string]:any}
export interface Landmark {id:string;[key:string]:any}
export interface MagneticTraceRecord {id:string;sourceNodeId:string;sourceSocketId:string;targetNodeId:string;targetSocketId:string;wireType:string;color:string;pathD:string;midpoint:{x:number;y:number};distance:number}
export interface GhostNodeRecord {[key:string]:any}
export interface GhostTraceRecord {[key:string]:any}
export interface PredictiveGhostNode {[key:string]:any}
export interface PredictiveTrace {[key:string]:any}
export interface GraphSettings {[key:string]:any}
export interface UniversalSocketDefinition {[key:string]:any}
export interface BaseViewWindow {[key:string]:any}
export class BaseNode { [key:string]:any; constructor(props:Record<string,any>={}){Object.assign(this,props)} }
export class GraphNodeParent extends BaseNode {}
export class GraphWireParent { [key:string]:any; constructor(props:Record<string,any>={}){Object.assign(this,props)} }
export const SIGNAL_TYPES={AUDIO_STEREO:'AUDIO_STEREO',AUDIO_MONO:'AUDIO_MONO',AUDIO_PACKET:'AUDIO_PACKET',TRIGGER:'TRIGGER',MIDI_STREAM:'MIDI_STREAM',MIDI_PACKET:'MIDI_PACKET',CURVE_STREAM:'CURVE_STREAM',CURVE_PACKET:'CURVE_PACKET',COMPONENT:'COMPONENT'} as const;
export function canvasToScreen(x:number,y:number,v:ViewportState){return{x:x*v.zoom+v.panX,y:y*v.zoom+v.panY}}
export function zoomAtPoint(mx:number,my:number,d:number,v:ViewportState,c:NodeGraphConfig={}){const z=Math.max(c.minZoom??.25,Math.min(c.maxZoom??2.5,v.zoom+d));const gx=(mx-v.panX)/v.zoom,gy=(my-v.panY)/v.zoom;return{zoom:z,panX:mx-gx*z,panY:my-gy*z}}
export function isNodeInCenterDeadZone(n:GraphNode,v:ViewportState,w:number,h:number,r=.35){const x=(n.position.x+(n.width??130)/2)*v.zoom+v.panX,y=(n.position.y+(n.height??130)/2)*v.zoom+v.panY;return Math.hypot(x-w/2,y-h/2)<=Math.min(w,h)*r}
export function getCenterPanForNode(n:GraphNode,v:ViewportState,w:number,h:number){return{panX:Math.round(w/2-(n.position.x+(n.width??130)/2)*v.zoom),panY:Math.round(h/2-(n.position.y+(n.height??130)/2)*v.zoom)}}
export function getNodesInSelection(sx:number,sy:number,ex:number,ey:number,nodes:GraphNode[],v:ViewportState){const a=(sx-v.panX)/v.zoom,b=(sy-v.panY)/v.zoom,c=(ex-v.panX)/v.zoom,d=(ey-v.panY)/v.zoom,minX=Math.min(a,c),maxX=Math.max(a,c),minY=Math.min(b,d),maxY=Math.max(b,d);return nodes.filter(n=>n.position.x<maxX&&n.position.x+(n.width??150)>minX&&n.position.y<maxY&&n.position.y+(n.height??100)>minY).map(n=>n.id)}
export function calculateSocketCoordinates(baseY:number,o:{cardWidth:number;cardHeight?:number;isOutput:boolean;clearance?:number;nudge?:{x:number;y:number}}){const q=Math.max(12,o.clearance??14),n=o.nudge??{x:0,y:0},h=o.cardWidth/2,b=o.isOutput?h+q:-h-q;let x=b+n.x,y=baseY+n.y;const hh=(o.cardHeight??80)/2;if(x>-h-4&&x<h+4&&y>-hh-4&&y<hh+4)x=o.isOutput?h+Math.max(4,q/2):-h-Math.max(4,q/2);return{baseX:b,effectiveX:x,effectiveY:y,nudge:{x:x-b,y:y-baseY}}}
export const getBeamPoints=(n:{x:number;y:number},bw=5,hw=1.2)=>{const vx=-n.x,vy=-n.y,d=Math.hypot(vx,vy);if(d<1)return'';const px=-vy/d,py=vx/d;return`${-px*hw},${-py*hw} ${px*hw},${py*hw} ${vx+px*bw},${vy+py*bw} ${vx-px*bw},${vy-py*bw}`}
export function describeSvgArc(x1:number,y1:number,x2:number,y2:number,r:number){return`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
export function getNodeSockets(n:SpaceNode):NodeSocketsResult{return{inputs:(n.inputs??[]).map((s:any)=>({...s,socketId:s.socketId??s.id})),outputs:(n.outputs??[]).map((s:any)=>({...s,socketId:s.socketId??s.id}))}}
export class ConnectionRuleStore {private static ready=false;private static defs=new Map<string,NodeDefinition>();static isInitialized(){return this.ready}static initializeDefaults(){this.ready=true}static registerNodeType(d:NodeDefinition){this.defs.set(d.type,d)}static getNodeType(t:string){return this.defs.get(t)}static listNodeTypes(){return[...this.defs.values()]}static canConnect(a:any,b:any){if(a.direction===b.direction)return false;if(a.dataType==='ANY'||b.dataType==='ANY')return true;return !a.dataType||!b.dataType||a.dataType===b.dataType}}
export class MagneticGraphManager {constructor(public nodes:SpaceNode[]=[],public connections:NodeConnection[]=[]){ }getTraces():Trace[]{return[]}}
export function computePredictiveGraph(_nodes:SpaceNode[],_connections:NodeConnection[],_scenario=0):PredictiveGhostNode[]{return[]}
