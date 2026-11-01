import manifest from './manifest.js';
import {newWish,recordWish,wishProgress,wishExplanation} from './rules.js';
import * as ai from './ai.js';
import * as ui from './presentation.js';
import {validate} from './validation.js';

export default {
  manifest, ai, ui, validate,
  initializePlayer(p) { p.wish=newWish(p.id); },
  onEvent(s,event) {
    const p=s.players[event.playerId];
    switch(event.type) {
      case 'farmHelped': recordWish(p,'farms',event.space); break;
      case 'springEnjoyed': recordWish(p,'springs',event.space); break;
      case 'mealEaten': if([14,27,41].includes(event.space))recordWish(p,'meals',event.space); break;
      case 'panoramaGained': if(p.wish.sceneryIncludesGifts)recordWish(p,'scenery',event.panorama); break;
      case 'panoramaVisited': if(!p.wish.sceneryIncludesGifts)recordWish(p,'scenery',event.panorama); break;
    }
  },
  afterAction(s) {
    const effects=[];
    for(const p of s.players) {
      const w=wishProgress(p);
      if(w.complete&&!w.claimed) {
        p.wish.claimed=true;
        effects.push({type:'score',playerId:p.id,category:'wishes',points:w.points,
          note:`我的「${w.name}」小心愿完成啦！额外获得 ${w.points} 分，汪！`});
      }
    }
    return effects;
  },
  scoreLabels:{wishes:'我的小心愿'},
  scoreRows(p) {
    return p.wish?[{key:'wishes',label:'我的小心愿',value:p.ledger?.wishes||0,
      explanation:wishExplanation(p),featured:true}]:[];
  }
};
