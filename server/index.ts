import { serve } from 'bun';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dataDir = join(root, 'data');
mkdirSync(dataDir, { recursive: true });
const storePath = join(dataDir, 'offline-store.json');

type ECO = { id:string; ecoNumber:string; title:string; description:string; plant:string; department:string; line:string; process:string; product:string; risk:string; status:string; confidence:number; created:string; owner:string; source:string; effectiveDate:string; };
type Impact = { id:string; ecoId:string; type:string; number:string; name:string; impact:string; confidence:number; reason:string; status:string; matched:string[]; };
type Action = { id:string; ecoId:string; type:string; target:string; description:string; priority:string; owner:string; status:string; };
type Training = { id:string; ecoId:string; employee:string; module:string; status:string; score:number|null; effectiveness:string; };
type Audit = { id:string; ecoId:string; timestamp:string; event:string; source:string; user:string; message:string; result:string; };
type Store = { ecos:ECO[]; impacts:Impact[]; actions:Action[]; training:Training[]; audits:Audit[]; employees:string[] };

const now = () => new Date().toISOString();
const uid = (prefix:string) => `${prefix}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
const demo:ECO = { id:'eco-125', ecoNumber:'ECO-2026-00125', title:'Chemical Mixing Temperature Change', description:'Increase the chemical mixing operating temperature from 65°C to 70°C to improve process stability.', plant:'Plant 2', department:'Engineering', line:'Line 5', process:'Chemical Mixing', product:'Product A', risk:'High', status:'Training In Progress', confidence:94, created:'2026-09-10T08:10:00.000Z', owner:'Maya Chen', source:'Moji5 simulation', effectiveDate:'2026-09-15' };
const seedEmployees = Array.from({length:47}, (_,i) => `EMP${String(125+i).padStart(5,'0')} · ${['Ari Tan','Sam Lee','Nadia Lim','Jorge Santos','Rina Koh'][i%5]}`);
function seed():Store { return { ecos:[demo,{...demo,id:'eco-126',ecoNumber:'ECO-2026-00126',title:'Torque specification update — Line 3',description:'Update fastener torque range for housing assembly.',line:'Line 3',process:'Housing Assembly',risk:'Medium',status:'Impact Analysis Completed',confidence:81,source:'Manual intake'},{...demo,id:'eco-127',ecoNumber:'ECO-2026-00127',title:'Packaging label artwork revision',description:'Revise label artwork for new regulatory marking.',process:'Final Packaging',risk:'Low',status:'Awaiting Document Revision',confidence:76,source:'Manual intake'},{...demo,id:'eco-128',ecoNumber:'ECO-2026-00128',title:'CIP rinse cycle extension',description:'Extend rinse cycle to address residue observations.',process:'Clean In Place',risk:'Critical',status:'Approved',confidence:0,source:'API'}], impacts:[], actions:[], training:[], audits:[{id:'AUD-001',ecoId:'eco-125',timestamp:'2026-09-10T08:10:00.000Z',event:'ECO received',source:'Moji5',user:'system',message:'ECO-2026-00125 received from source system',result:'Success'},{id:'AUD-002',ecoId:'eco-125',timestamp:'2026-09-10T08:11:00.000Z',event:'AI analysis complete',source:'LocalRuleBasedAIEngine',user:'system',message:'94% confidence · High impact · 8 downstream records',result:'Success'},{id:'AUD-003',ecoId:'eco-125',timestamp:'2026-09-10T08:12:00.000Z',event:'Training assignments generated',source:'TrainingEngine',user:'system',message:'47 employees identified; 47 local assignments created',result:'Success'}],employees:seedEmployees}; }
let store:Store = existsSync(storePath) ? JSON.parse(readFileSync(storePath,'utf8')) : seed();
function persist(){ writeFileSync(storePath, JSON.stringify(store,null,2)); writeCsvFiles(); }
function csv(rows:any[], fields:string[]){ return [fields.join(','),...rows.map(r=>fields.map(f=>`"${String(r[f] ?? '').replaceAll('"','""')}"`).join(','))].join('\n')+'\n'; }
function writeCsvFiles(){
 writeFileSync(join(dataDir,'eco.csv'),csv(store.ecos,['id','ecoNumber','title','description','plant','department','line','process','product','risk','status','confidence','created','owner','source','effectiveDate']));
 writeFileSync(join(dataDir,'eco_impact.csv'),csv(store.impacts,['id','ecoId','type','number','name','impact','confidence','reason','status','matched']));
 writeFileSync(join(dataDir,'workflow_actions.csv'),csv(store.actions,['id','ecoId','type','target','description','priority','owner','status']));
 writeFileSync(join(dataDir,'training_assignments.csv'),csv(store.training,['id','ecoId','employee','module','status','score','effectiveness']));
 writeFileSync(join(dataDir,'audit_log.csv'),csv(store.audits,['id','ecoId','timestamp','event','source','user','message','result']));
}
function audit(ecoId:string,event:string,message:string,source='Local workflow'){ store.audits.unshift({id:uid('AUD'),ecoId,timestamp:now(),event,source,user:'local.operator',message,result:'Success'}); }
function analyze(eco:ECO){
 const text = `${eco.title} ${eco.description} ${eco.process} ${eco.line} ${eco.product}`.toLowerCase();
 const temp = /temperature|thermal|heat|mixing/.test(text); const processMatch = eco.process.toLowerCase().includes('chemical mixing');
 const common = {status:'Pending'}; const impacts:Impact[] = [
  {id:uid('IMP'),ecoId:eco.id,type:'CONTROL_PLAN',number:'CP-CHM-005',name:'Chemical Mixing Control Plan',impact:temp?'HIGH':'MEDIUM',confidence:temp?94:78,reason:temp?'Temperature control parameter changed; process and line match.':'Process parameter requires control-plan review.',matched:['Process','Production Line','Product','Keyword'],...common},
  {id:uid('IMP'),ecoId:eco.id,type:'WORK_INSTRUCTION',number:'WI-CHM-021',name:'Chemical Mixing Operation',impact:temp?'HIGH':'MEDIUM',confidence:temp?92:74,reason:'Operating temperature instruction requires revision.',matched:['Process','Keyword','Current revision'],...common},
  {id:uid('IMP'),ecoId:eco.id,type:'SOJT',number:'SOJT-CHM-008',name:'Chemical Mixing Temperature Control',impact:'MEDIUM',confidence:88,reason:'Training module contains the affected process procedure.',matched:['Process','Keyword'],...common},
  {id:uid('IMP'),ecoId:eco.id,type:'COMPETENCY',number:'COMP-CHM-003',name:'Chemical Process Parameter Control',impact:'MEDIUM',confidence:84,reason:'Operator competency includes process parameter control.',matched:['Process','Role mapping'],...common}
 ];
 store.impacts = store.impacts.filter(i=>i.ecoId!==eco.id).concat(impacts);
 store.actions = store.actions.filter(a=>a.ecoId!==eco.id).concat(impacts.map(i=>({id:uid('ACT'),ecoId:eco.id,type:i.type==='COMPETENCY'?'Review competency':`Revise ${i.type.replace('_',' ')}`,target:i.number,description:i.reason,priority:i.impact==='HIGH'?'High':'Medium',owner:i.type==='WORK_INSTRUCTION'?'Production Engineering':i.type==='CONTROL_PLAN'?'Process Engineering':'Training Department',status:'Pending'})));
 store.training = store.training.filter(t=>t.ecoId!==eco.id).concat(seedEmployees.map((employee,i)=>({id:uid('TRN'),ecoId:eco.id,employee,module:'SOJT-CHM-008 · Chemical Mixing Temperature Control',status:i<32?'Completed':i<42?'In Progress':'Assigned',score:i<32?88+(i%9):null,effectiveness:i<32?'Pending':'Not Required'})));
 eco.confidence=impacts.reduce((s,i)=>s+i.confidence,0)/impacts.length; eco.status='Training In Progress'; eco.source=eco.source||'Manual intake'; audit(eco.id,'AI impact analysis complete',`Local rules identified ${impacts.length} impacted records at ${Math.round(eco.confidence)}% confidence`,'LocalRuleBasedAIEngine'); audit(eco.id,'Downstream cascade generated',`4 workflow actions · 47 training assignments · effectiveness queue opened`,'WorkflowEngine'); persist(); return {eco,impacts,actions:store.actions.filter(a=>a.ecoId===eco.id),training:store.training.filter(t=>t.ecoId===eco.id)};
}
function json(data:any,status=200){ return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
async function handler(req:Request){ const u=new URL(req.url); if(req.method==='OPTIONS') return json({ok:true});
 if(u.pathname==='/api/dashboard') return json({ecos:store.ecos, impacts:store.impacts, actions:store.actions, training:store.training, audits:store.audits, employees:store.employees, health:{api:'Healthy',csv:'Healthy',ai:'Healthy',workflow:'Healthy'}});
 if(u.pathname==='/api/eco'&&req.method==='GET') return json(store.ecos);
 if(u.pathname==='/api/audit') return json(store.audits);
 if(u.pathname==='/api/eco/start'&&req.method==='POST'){ const body=await req.json(); const eco:ECO={id:uid('eco'),ecoNumber:body.ecoNumber||`ECO-${new Date().getFullYear()}-${String(store.ecos.length+1).padStart(5,'0')}`,title:body.title||'Untitled ECO',description:body.description||'',plant:body.plant||'Plant 2',department:body.department||'Engineering',line:body.productionLine||'Line 5',process:body.process||'Chemical Mixing',product:body.product||'Product A',risk:body.riskLevel||'Medium',status:'Approved',confidence:0,created:now(),owner:body.requestedBy||'local.operator',source:body.source||'Manual intake',effectiveDate:body.effectiveDate||''}; store.ecos.unshift(eco); audit(eco.id,'ECO created',`${eco.ecoNumber} created via ${eco.source}`); persist(); return json(eco,201); }
 const match=u.pathname.match(/^\/api\/eco\/([^/]+)(?:\/(run|close|approve))?$/); if(match){ const eco=store.ecos.find(e=>e.id===match[1]||e.ecoNumber===match[1]); if(!eco)return json({error:'ECO not found'},404); if(req.method==='POST'&&match[2]==='run') return json(analyze(eco)); if(req.method==='POST'&&match[2]==='close'){ const ts=store.training.filter(t=>t.ecoId===eco.id); const acts=store.actions.filter(a=>a.ecoId===eco.id&&a.status!=='Completed'); if(acts.length||ts.some(t=>t.status!=='Completed')) return json({error:'ECO closure blocked',details:`${acts.length} actions and ${ts.filter(t=>t.status!=='Completed').length} training items remain`},409); eco.status='Closed'; audit(eco.id,'ECO closed','Final verification passed'); persist(); return json(eco); } return json({eco,impacts:store.impacts.filter(i=>i.ecoId===eco.id),actions:store.actions.filter(a=>a.ecoId===eco.id),training:store.training.filter(t=>t.ecoId===eco.id),audits:store.audits.filter(a=>a.ecoId===eco.id)}); }
 const action=u.pathname.match(/^\/api\/action\/([^/]+)\/complete$/); if(action&&req.method==='POST'){const a=store.actions.find(x=>x.id===action[1]);if(!a)return json({error:'Action not found'},404);a.status='Completed';audit(a.ecoId,'Workflow action completed',`${a.target} marked complete`);persist();return json(a);}
 const training=u.pathname.match(/^\/api\/training\/([^/]+)\/complete$/); if(training&&req.method==='POST'){const t=store.training.find(x=>x.id===training[1]);if(!t)return json({error:'Training not found'},404);t.status='Completed';t.score=Number((await req.json().catch(()=>({score:92}))).score||92);t.effectiveness='Pending';audit(t.ecoId,'Training completed',`${t.employee} completed ${t.module}`);persist();return json(t);}
 return json({error:'Not found'},404);
}
writeCsvFiles();
serve({port:3000,fetch:handler});
console.log('ECO offline API listening on http://localhost:3000');
