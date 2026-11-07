export const seasons=['spring','summer','fall','winter'];
export const seasonNames={spring:'Весна',summer:'Лето',fall:'Осень',winter:'Зима'};
export const groups={crop:'Культуры',mix:'Смеси семян',perennial:'Кусты','fruit-tree':'Плодовые деревья','wild-tree':'Лесные деревья',grass:'Трава'};
export function validatePack(p){
 if(!p||p.schemaVersion!==1)throw Error('Нужна версия формата schemaVersion: 1.');
 if(typeof p.id!=='string'||!/^[a-z][a-z0-9._-]{1,79}$/.test(p.id))throw Error('Некорректный id набора.');
 if(typeof p.name!=='string'||!p.name.trim()||p.name.length>120)throw Error('Нужно название набора до 120 символов.');
 if(!Array.isArray(p.crops)||!p.crops.length||p.crops.length>500)throw Error('От 1 до 500 культур в наборе.');
 const ids=new Set();for(const c of p.crops){
  if(typeof c.id!=='string'||!c.id.startsWith(p.id+':')||!/^[a-z0-9._:-]+$/.test(c.id)||ids.has(c.id))throw Error('Уникальный id культуры должен начинаться с '+p.id+':');ids.add(c.id);
  if(typeof c.name!=='string'||!c.name.trim()||c.name.length>120)throw Error('У каждой культуры нужно название.');
  for(const k of ['seed','base','grow'])if(typeof c[k]!=='number'||!Number.isFinite(c[k])||c[k]<0||c[k]>1000000||k==='grow'&&!Number.isInteger(c[k]))throw Error(c.name+': некорректное поле '+k);
  if(!['veg','fruit','flower','gem','other','mix','forage','mushroom'].includes(c.type)||!Object.hasOwn(groups,c.group||'crop'))throw Error(c.name+': неизвестный тип или категория.');
  if(!Array.isArray(c.seasons)||!c.seasons.length||c.seasons.some(s=>!seasons.includes(s)))throw Error(c.name+': некорректные сезоны.');
  for(const k of ['regrow','stock','yield','year','seedSell','wetGrow','footprint'])if(c[k]!=null&&(!Number.isFinite(c[k])||c[k]<0||c[k]>1000000||(['regrow','stock','year','wetGrow','footprint'].includes(k)&&!Number.isInteger(c[k]))))throw Error(c.name+': некорректное поле '+k);
  if(c.yield===0||c.footprint===0||c.wetGrow===0||c.year===0)throw Error(c.name+': выход, размер, срок у воды и год должны быть положительными.');
  if(c.grow===0&&!c.stochastic)throw Error(c.name+': срок роста должен быть положительным.');
  for(const k of ['image','seedImage','tapImage'])if(c[k]&&(!/^(assets\/[a-zA-Z0-9_.\/-]+|data:image\/png;base64,[A-Za-z0-9+/=]+)$/.test(c[k])||c[k].includes('..')))throw Error('Спрайт: путь assets/ или PNG base64.');
  if(c.recipes!=null){if(!Array.isArray(c.recipes)||c.recipes.length>30)throw Error('Не более 30 рецептов.');for(const r of c.recipes){if(typeof r.name!=='string'||r.name.length>120||!['linear','fixed'].includes(r.kind))throw Error('Рецепт должен быть linear или fixed.');for(const k of ['multiplier','offset','fixed','input','output','minutes'])if(r[k]!=null&&(!Number.isFinite(r[k])||r[k]<0||r[k]>1000000))throw Error('Некорректное значение рецепта.');if((r.input??1)<=0||(r.output??1)<=0)throw Error('Количество в рецепте должно быть больше нуля.');if(r.kind==='fixed'&&!Number.isFinite(r.fixed))throw Error('Фиксированному рецепту нужна цена.')}}
 }return p;
}
export function createRegistry(packs){const result=[],seen=new Set();for(const p of packs){validatePack(p);if(seen.has(p.id))throw Error('Набор уже подключён: '+p.id);seen.add(p.id);for(const c of p.crops)result.push({group:'crop',regrow:0,yield:1,year:1,quality:true,source:p.name,...structuredClone(c),mod:p.id,modName:p.name})}return result;}
