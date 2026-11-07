import {vanillaPack} from './data/vanilla.mjs';
import {createRegistry,seasons} from './registry.mjs';
export const crops=createRegistry([vanillaPack]);
export const defaults={season:'spring',year:1,day:1,horizon:1,plots:20,budget:2000,quality:1,tiller:false,artisan:false,special:false,water:false,potato:true,environment:'field',mature:false,quest:false};
export function dateAt(day,s){const a=seasons.indexOf(s.season)*28+day-1;return {day:a%28+1,season:seasons[Math.floor(a/28)%4],year:s.year+Math.floor(a/112)}};
export const endDay=s=>s.horizon*28;
const canGrow=(c,d,s)=>s.environment!=='field'||c.seasons.includes(dateAt(d,s).season);
const matureApplies=c=>['fruit-tree','wild-tree','perennial'].includes(c.group)||c.id==='vanilla:ancient-fruit';
export function outcomes(c,s,catalog=crops){
 if(c.outcomes)return c.outcomes;if(!c.mixed)return null;
 const get=ids=>ids.map(([id,weight=1])=>({...catalog.find(x=>x.id==='vanilla:'+id),weight})).filter(x=>x.id);
 if(c.mixed==='flowers')return get(({spring:[['tulip'],['blue-jazz']],summer:[['sunflower'],['summer-spangle'],['poppy']],fall:[['sunflower'],['fairy-rose']],winter:[['tulip'],['blue-jazz'],['sunflower'],['summer-spangle'],['poppy'],['fairy-rose']]})[s.environment==='island'?'summer':s.season]);
 return get(s.environment==='island'?[['blueberry'],['melon'],['pineapple'],['rhubarb']]:({spring:[['cauliflower'],['parsnip',2],['potato']],summer:[['corn'],['hot-pepper'],['radish'],['wheat']],fall:[['artichoke'],['corn'],['eggplant'],['pumpkin']],winter:[['cauliflower'],['parsnip',2],['potato'],['corn'],['hot-pepper'],['radish'],['wheat'],['artichoke'],['eggplant'],['pumpkin']]})[s.season]);
}
export function calculate(c,input,catalog=crops){
 const s={...defaults,...input},end=endDay(s),start=Math.max(s.day,c.id==='vanilla:strawberry'&&s.season==='spring'&&s.year===1?13:1);
 const grow=s.water&&c.wetGrow?c.wetGrow:c.grow,existing=s.mature&&matureApplies(c),dates=[],plantings=[],reasons=[];
 if(s.year<c.year)reasons.push('С '+c.year+' года');if(c.special&&!s.special&&!existing)reasons.push('Нужен доступ к семенам');
 if(c.indoorOnly&&s.environment!=='greenhouse')reasons.push('Только в помещении');if(c.group!=='fruit-tree'&&!canGrow(c,start,s))reasons.push('Не тот сезон');
 if(c.quest&&!s.quest)reasons.push('Требуется активное задание Ци');if(c.group==='grass')reasons.push('Без товарного урожая');if(c.stochastic&&!existing)reasons.push('Случайный рост: включи взрослые деревья');
 const unitYield=c.id==='vanilla:potato'&&!s.potato?1:c.yield||1,variants=outcomes(c,s,catalog);
 if(variants)plantings.push(start);
 else if(c.group==='fruit-tree'||c.tea){if(!existing)plantings.push(start);for(let d=existing?start:start+grow;d<=end;d++)if(canGrow(c,d,s)&&(!c.tea||dateAt(d,s).day>=22))dates.push(d)}
 else if(c.group==='wild-tree'){if(existing)for(let d=start+c.regrow;d<=end;d+=Math.max(1,c.regrow))if(c.id!=='vanilla:mushroom-tree'||s.environment!=='field'||dateAt(d,s).season!=='winter')dates.push(d)}
 else if(!c.stochastic&&canGrow(c,start,s)){let p=start,first=existing?start:start+grow;while(first<=end){let viable=true;for(let d=p;d<=first;d++)if(!canGrow(c,d,s)){viable=false;break}if(!viable)break;if(!existing&&(!c.regrow||!plantings.length))plantings.push(p);dates.push(first);p=first;first+=Math.max(1,c.regrow||grow)}}
 const price=Math.floor(Math.floor(c.base*(c.quality?s.quality:1))*(s.tiller&&c.tiller!==false&&['veg','fruit','flower'].includes(c.type)&&!['wild-tree','mix'].includes(c.group)?1.1:1));
 let amount=dates.length*unitYield,revenue=amount*price,cost=plantings.length*c.seed;
 const variantResults=variants?.map(o=>{const oc={group:'crop',regrow:0,yield:1,quality:true,year:1,...o,seed:0,stock:null,special:false,mod:c.mod,seasons:c.seasons},r=calculate(oc,{...s,horizon:1,plots:1,budget:1000000,mature:false},catalog),first=r.dates[0];return {o,weight:o.weight||1,date:first,amount:first?oc.yield||1:0,price:r.price,revenue:first?(oc.yield||1)*r.price:0}});
 if(variantResults){const w=variantResults.reduce((a,v)=>a+v.weight,0);revenue=variantResults.reduce((a,v)=>a+v.revenue*v.weight,0)/w;amount=variantResults.reduce((a,v)=>a+v.amount*v.weight,0)/w;for(const v of variantResults)if(v.date&&!dates.includes(v.date))dates.push(v.date);dates.sort((a,b)=>a-b)}
 let plots=Math.min(Math.floor(s.plots/(c.footprint||1)),cost?Math.floor(s.budget/cost):s.plots);if(c.stock!=null&&!existing)plots=Math.min(plots,Math.floor(c.stock/Math.max(1,plantings.length)));if(!dates.length&&!plantings.length)plots=0;
 const profit=revenue-cost,events=[];for(let d=s.day;d<=end;d++){const expense=plantings.includes(d)?c.seed:0,earned=variantResults?variantResults.filter(v=>v.date===d).reduce((a,v)=>a+v.revenue*v.weight,0)/variantResults.reduce((a,v)=>a+v.weight,0):dates.includes(d)?unitYield*price:0;events.push({day:d,expense,revenue:earned,amount:dates.includes(d)?unitYield:0})}
 let balance=0;const series=events.map(e=>({...e,profit:balance+=e.revenue-e.expense}));
 return {start,grow,dates,plantings,cycles:plantings.length,cost,plots,amount,price,revenue,profit,total:plots?profit*plots:0,investment:cost*plots,eligible:!reasons.length,reasons,daily:profit/(end-s.day+1),series,existing,variants:variantResults,unitYield,end};
}
const linear=(id,name,image,multiplier,offset,minutes,input=1)=>({id,name,image:'assets/'+image+'.png',kind:'linear',multiplier,offset,minutes,input,output:1,artisan:true});
const fixed=(id,name,image,price,minutes,input=1,output=1,artisan=true)=>({id,name,image:'assets/'+image+'.png',kind:'fixed',fixed:price,minutes,input,output,artisan});
export function products(c,input={}){
 const s={...defaults,...input};let rules=[];
 if(c.recipes)rules.push(...c.recipes);else{
 if(['veg','fruit','mushroom','forage'].includes(c.type)&&!['Daffodil','Crocus','Sweet Pea','Red Mushroom'].includes(c.en||c.name))rules.push(linear('preserve',c.type==='fruit'?'Джем':'Соленья',c.type==='fruit'?'jelly':'pickles',2,50,4000));
 if(c.type==='fruit')rules.push(linear('wine','Вино','wine',3,0,10000));
 if((c.type==='veg'||c.type==='forage'&&!['Daffodil','Crocus','Sweet Pea'].includes(c.en||c.name))&&!['vanilla:wheat','vanilla:hops','vanilla:tea'].includes(c.id))rules.push(linear('juice','Сок','juice',2.25,0,6000));
 if(c.type==='fruit'&&c.id!=='vanilla:grape')rules.push(linear('dried','Сушёные фрукты','dried',7.5,25,1600,5));
 if(c.type==='mushroom'&&c.en!=='Red Mushroom')rules.push(linear('dried','Сушёные грибы','dried',7.5,25,1600,5));
 if(c.type==='flower'&&!['Crocus','Sweet Pea'].includes(c.en))rules.push({...linear('honey','Цветочный мёд','honey',2,100,6100),nonconsuming:true});
 const special={
 'vanilla:coffee-bean':[fixed('coffee','Кофе','coffee',150,120,5,1,false),fixed('espresso','Тройной эспрессо','triple_shot_espresso',450,0,15,1,false)],
 'vanilla:wheat':[fixed('beer','Пиво','beer',200,1750),fixed('flour','Пшеничная мука','wheat_flour',50,1600,1,1,false)],
 'vanilla:hops':[fixed('pale-ale','Светлый эль','pale_ale',300,2250)],'vanilla:tea':[fixed('tea','Зелёный чай','green_tea',100,180)],'vanilla:grape':[fixed('raisins','Изюм','raisins',600,1600,5)],
 'vanilla:corn':[fixed('oil','Масло','oil',100,1000,1,1,false)],'vanilla:sunflower':[fixed('oil','Масло из цветка','oil',100,60,1,1,false)],'vanilla:beet':[fixed('sugar','Сахар','sugar',50,1600,1,3,false)],
 'vanilla:unmilled-rice':[fixed('rice','Рис','rice',100,1600,1,1,false),fixed('vinegar','Уксус · через рис','vinegar',100,2200,1,2,false)]};rules.push(...(special[c.id]||[]));}
 const aged=[];for(const r of rules){const ds={wine:[14,28,56],beer:[7,14,28],'pale-ale':[9,17,34]};if(ds[r.id])for(const[i,m]of[1.25,1.5,2].entries())aged.push({...r,id:r.id+'-aged-'+i,name:r.name+' · '+['серебро','золото','иридий'][i],age:m,ageDays:ds[r.id][i]});if(r.id==='honey'){const mead=fixed('mead','Медовуха · из мёда','mead',300,6700);aged.push(mead);for(const[i,m]of[1.25,1.5,2].entries())aged.push({...mead,id:'mead-aged-'+i,name:'Медовуха · '+['серебро','золото','иридий'][i],age:m,ageDays:[7,14,28][i]})}}rules.push(...aged);
 return rules.map((r,index)=>{r={...r,id:r.id||`custom-${index}`};const normal=Math.floor(r.kind==='fixed'?r.fixed:c.base*(r.multiplier??1)+(r.offset??0)),price=Math.floor(Math.floor(normal*(r.age||1)+1e-8)*(s.artisan&&r.artisan!==false?1.4:1)+1e-8),input=r.input||1,output=r.output||1;return {...r,input,output,price,perInput:price*output/input,formula:(r.kind==='fixed'?`Фиксировано: ${r.fixed}g`:`⌊${r.multiplier} × P${r.offset?' + '+r.offset:''}⌋`)+(r.age?` × ${r.age}`:'')+(s.artisan&&r.artisan!==false?' × 1,4':''),note:r.nonconsuming?'Цена 1 мёда от улья. Цветок не расходуется; к объёму урожая не применяется.':r.kind==='fixed'?'Фиксированный игровой рецепт. Цена сырья на цену результата не влияет.':''}});
}
export function processingProjection(c,r,p){
 if(p.nonconsuming||r.variants||p.id?.startsWith('mead'))return null;let stock=0,batches=0;
 const series=r.series.map(e=>{stock+=e.amount;const n=Math.floor((stock+1e-9)/p.input);stock-=n*p.input;batches+=n;return {day:e.day,revenue:n*p.output*p.price,expense:e.expense}});if(series.length)series.at(-1).revenue+=stock*r.price;let sum=0;
 return {batches,units:batches*p.output,leftover:stock,profit:batches*p.output*p.price+stock*r.price-r.cost,series:series.map(e=>({...e,profit:sum+=e.revenue-e.expense})),potential:true};
}
