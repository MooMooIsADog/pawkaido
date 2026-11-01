export default {
  id:'dog-wishes',
  name:'狗狗心愿',
  version:'1.0.0',
  coreApi:1,
  edition:{id:'wishes',name:'狗狗能力扩展版',description:'保留旅行能力，再加每只狗的专属喜好'},
  // Preserve v1.0.0 field names so existing saves need no destructive migration.
  playerKeys:['wish'],
  scoreCategories:['wishes'],
  compatibleSaveVersions:[]
};
