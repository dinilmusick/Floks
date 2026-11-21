/** Picker is a view of already authorized discovery, never an authorization source. */
export interface RemotePickerNode{type:string;category:string;metadata?:Record<string,unknown>}
export interface RemotePickerFilter{appId?:string;workspaceId?:string;category?:string}
export function remoteCapabilityCategory(node:RemotePickerNode):string{
  const surface=node.metadata?.surface;
  return typeof surface==='string' && surface.trim()?surface:node.category;
}
export function authorizedRemoteCategories<T extends RemotePickerNode>(
  authorized:readonly T[],filter:Pick<RemotePickerFilter,'appId'|'workspaceId'>={}
):string[]{
  return [...new Set(authorized.filter(node=>
    (!filter.appId || node.metadata?.appId===filter.appId) &&
    (!filter.workspaceId || node.metadata?.targetWorkspaceId===filter.workspaceId))
    .map(remoteCapabilityCategory).filter(Boolean))].sort();
}
export function filteredCapabilityPicker<T extends RemotePickerNode>(
  local:readonly T[],authorized:readonly T[],filter:RemotePickerFilter
):T[]{
  return [...local,...authorized.filter(node=>
    (!filter.appId || node.metadata?.appId===filter.appId) &&
    (!filter.workspaceId || node.metadata?.targetWorkspaceId===filter.workspaceId) &&
    (!filter.category || remoteCapabilityCategory(node)===filter.category))];
}
