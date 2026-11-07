import {mkdir,writeFile} from 'node:fs/promises';
const base='https://raw.githubusercontent.com/juliaramosguedes/stardew-data/main/';
await mkdir('reference',{recursive:true});
for(const name of ['crops','objects','fruittrees','wildtrees']){
 const r=await fetch(base+'data/en-US/'+name+'.json');if(!r.ok)throw Error(r.status);
 const d=await r.json();await writeFile('reference/'+name+'.json',JSON.stringify(d));
 if(name==='crops')console.log(d.crops.map(c=>({name:c.name,seed:c.seedId,harvest:c.harvestItemId,grow:c.growthDays,regrow:c.regrowDays,yield:c.minHarvest})));
}
const objects=JSON.parse(await (await import('node:fs/promises')).readFile('reference/objects.json','utf8')).objects;
console.log('Objects shape',Array.isArray(objects),Object.keys(objects).slice(0,5));
