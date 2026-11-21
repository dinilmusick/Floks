import {describe,expect,it} from 'vitest';
import {authorizedRemoteCategories,filteredCapabilityPicker,remoteCapabilityCategory} from './remoteCapabilityPicker.js';
const remote=(appId:string,category:string,workspace='w')=>({
  type:`remote.${appId}.${category}`,category,metadata:{appId,targetWorkspaceId:workspace,surface:category},
});
describe('permission-filtered app/category picker',()=>{
 it('lists categories only for the selected authorized target',()=>{
   const definitions=[remote('app-a','raw.backend'),remote('app-a','agent.workflow'),remote('app-b','raw.frontend.session')];
   expect(authorizedRemoteCategories(definitions,{appId:'app-a'})).toEqual(['agent.workflow','raw.backend']);
   expect(authorizedRemoteCategories(definitions,{appId:'app-b',workspaceId:'private'})).toEqual([]);
 });
 it('keeps local nodes and filters remote app, workspace and category',()=>{
   const local=[{type:'local.add',category:'local'}];
   const definitions=[remote('app-a','raw.backend'),remote('app-a','agent.workflow'),remote('app-b','raw.backend','w2')];
   expect(filteredCapabilityPicker(local,definitions,{appId:'app-a',category:'raw.backend'}).map(d=>d.type))
     .toEqual(['local.add','remote.app-a.raw.backend']);
   expect(filteredCapabilityPicker(local,definitions,{appId:'app-b',workspaceId:'w'})).toEqual(local);
 });
 it('uses descriptor category if the surface metadata is absent',()=>{
   expect(remoteCapabilityCategory({type:'remote.a.x',category:'backend-api',metadata:{appId:'a'}})).toBe('backend-api');
 });
});
