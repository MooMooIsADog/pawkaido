// Small, deterministic extension API. Packs own their state; the host owns score effects.
export const CORE_API_VERSION = 1;
const classic = {id:'classic', name:'经典版', description:'原有旅行规则与十种能力'};
const baseScores = new Set(['pano','gifts','meals','springs','donations','encounters','talent','awards','templeFinal']);

export function createExtensionHost(packs = []) {
  const byId = new Map(), byEdition = new Map(), categories = new Set(baseScores), playerKeys = new Set();
  for (const pack of packs) {
    const m = pack.manifest;
    if (!m || !/^[a-z][a-z0-9-]*$/.test(m.id) || !/^\d+\.\d+\.\d+$/.test(m.version) || m.coreApi !== CORE_API_VERSION)
      throw Error('扩展清单或核心接口版本不兼容');
    if (!m.edition?.id || m.edition.id === 'classic' || byId.has(m.id) || byEdition.has(m.edition.id))
      throw Error('扩展或旅行版本重复');
    if (!Array.isArray(m.playerKeys) || !Array.isArray(m.scoreCategories)) throw Error('扩展必须声明存档字段与计分类别');
    for (const key of m.playerKeys) {
      if (playerKeys.has(key) || ['id','human','role','draft','cash','score','pos','lane','gifts','meals','springs','encounters','pano','donations','awards','ledger'].includes(key)) throw Error('扩展存档字段冲突');
      playerKeys.add(key);
    }
    for (const key of m.scoreCategories) {
      if (categories.has(key)) throw Error('扩展计分类别冲突');
      categories.add(key);
    }
    byId.set(m.id, pack); byEdition.set(m.edition.id, pack);
  }
  function selected(edition = 'classic') {
    if (edition === 'classic') return [];
    const pack = byEdition.get(edition);
    if (!pack) throw Error(`找不到旅行版本「${edition}」，请安装对应扩展后再读取存档。`);
    return [pack];
  }
  function references(edition) { return selected(edition).map(p=>({id:p.manifest.id,version:p.manifest.version})); }
  function compatibilityError(s) {
    try {
      if (!s || typeof s !== 'object') return '旅行记录格式不正确。';
      const expected = selected(s.edition);
      // v1.0.0 saves did not have an extensions field. Their rules live in pack state.
      if (s.extensions === undefined) return null;
      if (!Array.isArray(s.extensions) || s.extensions.length !== expected.length) return '存档的扩展清单与旅行版本不一致。';
      for (let i=0;i<expected.length;i++) {
        const ref=s.extensions[i], pack=expected[i];
        if (!ref || ref.id!==pack.manifest.id) return '存档的扩展清单与旅行版本不一致。';
        if (ref.version!==pack.manifest.version && !pack.manifest.compatibleSaveVersions?.includes(ref.version))
          return `这局旅行需要 ${pack.manifest.name} ${ref.version}，当前安装的版本不兼容。`;
      }
      return null;
    } catch (error) { return error.message; }
  }
  function active(s) {
    const error=compatibilityError(s); if(error) throw Error(error);
    return selected(s.edition);
  }
  return {
    packs,
    editions:()=>[classic,...packs.map(p=>p.manifest.edition)],
    editionName:edition=>edition===undefined||edition==='classic'?classic.name:selected(edition)[0].manifest.edition.name,
    references,
    compatibilityError,
    initialize(s) { s.extensions=references(s.edition); for(const pack of active(s)) for(const p of s.players) pack.initializePlayer?.(p); },
    emit(s,event) { for(const pack of active(s)) pack.onEvent?.(s,event); },
    settle(s) {
      for(const pack of active(s)) for(const effect of pack.afterAction?.(s)||[]) {
        const p=s.players[effect.playerId];
        if(effect.type!=='score' || !p || !Number.isInteger(effect.points) || effect.points<0 || !pack.manifest.scoreCategories.includes(effect.category)) throw Error('无效的扩展计分效果');
        p.score+=effect.points; p.ledger[effect.category]=(p.ledger[effect.category]||0)+effect.points;
        if(p.id===s.current && effect.note) s.notes.push(effect.note);
      }
    },
    moveValue:(s,p,type)=>active(s).reduce((sum,pack)=>sum+(pack.ai?.moveValue?.(s,p,type)||0),0),
    reserve:(s,p,base)=>active(s).reduce((value,pack)=>Math.max(value,pack.ai?.reserve?.(s,p)??base),base),
    validate(s) {
      try {
        const enabled=new Set(active(s));
        return packs.every(pack=>enabled.has(pack)?pack.validate?.(s)!==false:s.players.every(p=>
          pack.manifest.playerKeys.every(key=>p[key]===undefined) && pack.manifest.scoreCategories.every(key=>!p.ledger?.[key])));
      } catch { return false; }
    },
    // Presentation hooks return HTML for the existing slots; no DOM/global game access.
    preview:edition=>selected(edition).map(p=>p.ui?.preview?.()||'').join(''),
    render:(slot,p,context={})=>packs.map(pack=>pack.ui?.[slot]?.(p,context)||'').join(''),
    rulePages:()=>packs.flatMap(pack=>pack.ui?.rulePages||[]),
    scoreLabels:()=>Object.assign({},...packs.map(pack=>pack.scoreLabels||{})),
    scoreRows:(p,players)=>packs.flatMap(pack=>pack.scoreRows?.(p,players)||[])
  };
}
