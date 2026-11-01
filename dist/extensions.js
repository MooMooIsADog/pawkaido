import catalog from './extensions/catalog.js';
import {createExtensionHost} from './extension-host.js';

export const extensionLoadErrors=[];
const packs=[];
for(const item of catalog) {
  try {
    if(!/^\.\/[a-z0-9-]+\/index\.js$/.test(item.entry)) throw Error('扩展入口必须在本地扩展目录中');
    const {default:pack}=await import(new URL(item.entry,new URL('./extensions/catalog.js',import.meta.url)).href);
    if(pack.manifest?.id!==item.id) throw Error('扩展编号与清单不一致');
    createExtensionHost([...packs,pack]);
    packs.push(pack);
  } catch(error) {
    extensionLoadErrors.push(`扩展「${item.id}」未能加载：${error.message}`);
  }
}
export const extensions=createExtensionHost(packs);
