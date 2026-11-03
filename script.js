// F1 Strategy & Tyre Degradation Simulator
// Loads drivers.txt / teams.txt / circuits.txt / pitstrategy.txt from ./data
// (the same files f1Simulator.cpp reads) and runs the identical lap-time formula.
// Serve this folder with a local server (e.g. VS Code "Live Server") — opening
// index.html directly via file:// will block the fetch() calls in most browsers.

function safeName(s){return s.replace(/[^a-zA-Z0-9]+/g,"_").replace(/^_+|_+$/g,"");}

function parseDrivers(t){return t.trim().split("\n").map(l=>{const [name,team,tireSkill,consistency]=l.split(",");return {name,team,tireSkill:+tireSkill,consistency:+consistency};});}
function parseTeams(t){return t.trim().split("\n").map(l=>{const [team,base,avgPit]=l.split(",");return {team,base:+base,avgPit:+avgPit};});}
function parseCircuits(t){return t.trim().split("\n").map(l=>{const [name,totalLaps,baseLapTime,tireWear,basePit]=l.split(",");return {name,totalLaps:+totalLaps,baseLapTime:+baseLapTime,tireWear:+tireWear,basePit:+basePit};});}
function parseStrategies(t){return t.trim().split("\n").map(line=>{const tok=line.split(",");const stints=[{tyre:tok[0],start:1}];const pits=[];for(let i=1;i<tok.length;i+=2){stints.push({tyre:tok[i],start:+tok[i+1]});pits.push(+tok[i+1]);}return {raw:line,stints,pits};});}

const TYRE={S:{name:"Soft",initDelta:0.00,deg:0.18},M:{name:"Medium",initDelta:0.45,deg:0.09},H:{name:"Hard",initDelta:0.95,deg:0.01}};
const POINTS=[25,18,15,12,10,8,6,4,2,1];
const TEAM_COLOR={Mercedes:"#00D7B9",Ferrari:"#E8002D",McLaren:"#FF8000","Red Bull Racing":"#1B3F8B","Racing Bulls":"#5E8FFF",Alpine:"#FF8AC8",Haas:"#B6BABD",Audi:"#BB0A30",Williams:"#1E6FFF","Aston Martin":"#229971",Cadillac:"#9CA3AF"};

let DRIVERS, TEAMS, CIRCUITS, STRATS;

async function loadData(){
  const [driversRaw,teamsRaw,circuitsRaw,strategyRaw] = await Promise.all([
    fetch("data/drivers.txt").then(r=>r.text()),
    fetch("data/teams.txt").then(r=>r.text()),
    fetch("data/circuits.txt").then(r=>r.text()),
    fetch("data/pitstrategy.txt").then(r=>r.text()),
  ]);
  DRIVERS=parseDrivers(driversRaw);
  TEAMS=parseTeams(teamsRaw);
  CIRCUITS=parseCircuits(circuitsRaw);
  STRATS=parseStrategies(strategyRaw);
}

const circuitSel=document.getElementById("circuitSel"), teamSel=document.getElementById("teamSel"),
      stratSel=document.getElementById("stratSel"), driverBtns=document.getElementById("driverBtns"),
      simBtn=document.getElementById("simBtn"), liveBadge=document.getElementById("liveBadge"),
      standingsTitle=document.getElementById("standingsTitle");

let selectedDriver=null;
function initials(name){return name.split(" ").map(w=>w[0]).join("").slice(0,2);}

function renderDrivers(){
  const team=TEAMS[teamSel.value].team;
  const list=DRIVERS.filter(d=>d.team===team);
  driverBtns.innerHTML="";
  selectedDriver=list[0]||null;
  list.forEach((d,i)=>{
    const btn=document.createElement("button");
    btn.className="driver-btn"+(i===0?" active":"");
    btn.type="button";
    const src=`assets/drivers/${safeName(d.name)}.jpg`;
    btn.innerHTML=`<div class="ph"><img src="${src}" alt="${d.name}" onerror="this.outerHTML='<div class=initials>${initials(d.name)}</div>'"></div><span>${d.name}</span>`;
    btn.addEventListener("click",()=>{selectedDriver=d;[...driverBtns.children].forEach(b=>b.classList.remove("active"));btn.classList.add("active");});
    driverBtns.appendChild(btn);
  });
}
function renderCar(){
  const team=TEAMS[teamSel.value].team;
  document.getElementById("carImg").src=`assets/cars/${safeName(team)}.jpg`;
}

// ---------- Result simulation (mirrors f1Simulator.cpp) ----------
function tyreStintAt(strategy,lap){let cur=strategy.stints[0];for(const st of strategy.stints){if(st.start<=lap)cur=st;}return cur;}
function simulateDriver(driver,team,circuit,strategy){
  let total=0;const laps=[];
  for(let l=1;l<=circuit.totalLaps;l++){
    const stint=tyreStintAt(strategy,l);const tyre=TYRE[stint.tyre];const wear=l-stint.start+1;
    let pitLoss=0;if(stint.start===l&&l>1)pitLoss=circuit.basePit+team.avgPit;
    const lapTime=circuit.baseLapTime+team.base+tyre.initDelta+(wear*tyre.deg*driver.tireSkill);
    total+=lapTime+pitLoss;
    laps.push({lap:l,time:lapTime,tyre:stint.tyre,pitLoss});
  }
  return {driver,team,total,laps};
}
function defaultStrategyFor(circuit){const half=Math.floor(circuit.totalLaps/2);return {stints:[{tyre:"M",start:1},{tyre:"H",start:half}],pits:[half]};}

const svgNS="http://www.w3.org/2000/svg";
function clearSvg(svg){while(svg.firstChild)svg.removeChild(svg.firstChild);}
function el(tag,attrs){const e=document.createElementNS(svgNS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);return e;}

const TYRE_COLOR={S:"var(--soft)",M:"var(--medium)",H:"var(--hard)"};

function drawAxes(svg,laps,yMin,yMax){
  const W=640,H=280,padL=38,padR=12,padT=10,padB=26;
  const x=l=>padL+((l-1)/(laps-1))*(W-padL-padR);
  const y=v=>H-padB-((v-yMin)/(yMax-yMin))*(H-padT-padB);
  for(let i=0;i<=4;i++){const ly=padT+i*((H-padT-padB)/4);svg.appendChild(el("line",{x1:padL,x2:W-padR,y1:ly,y2:ly,class:"gridline"}));}
  for(let l=1;l<=laps;l+=Math.max(1,Math.round(laps/12))){
    const lab=el("text",{x:x(l)-6,y:H-8,class:"axislabel"});lab.textContent=l;svg.appendChild(lab);
  }
  for(let i=0;i<=4;i++){const lab=el("text",{x:2,y:padT+i*((H-padT-padB)/4)+4,class:"axislabel"});lab.textContent=(yMax-i*((yMax-yMin)/4)).toFixed(1);svg.appendChild(lab);}
  return {x,y,W,H};
}

// Draws the real per-lap time of the selected driver's actual chosen strategy —
// only the compounds present in that strategy ever appear on the line.
function animateGraph(circuit,result,onDone){
  const svg=document.getElementById("graphSvg");
  const laps=circuit.totalLaps;
  const times=result.laps.map(p=>p.time);
  const yMin=Math.min(...times)-0.3, yMax=Math.max(...times)+0.3;

  const minLaps=44,maxLaps=78;
  const frac=Math.min(1,Math.max(0,(laps-minLaps)/(maxLaps-minLaps)));
  const duration=(45+frac*20)*1000;

  const start=performance.now();
  function frame(now){
    const t=Math.min(1,(now-start)/duration);
    const idx=Math.max(0,Math.min(laps-1,Math.floor(t*laps)));
    clearSvg(svg);
    const {x,y}=drawAxes(svg,laps,yMin,yMax);
    let curColor=TYRE_COLOR[result.laps[0].tyre], d=`M ${x(1)} ${y(times[0])} `;
    for(let i=0;i<=idx;i++){
      const c=TYRE_COLOR[result.laps[i].tyre];
      if(c!==curColor){
        svg.appendChild(el("path",{d,fill:"none",stroke:curColor,"stroke-width":"2.5"}));
        d=`M ${x(i+1)} ${y(times[i])} `;
        curColor=c;
      }
      d+=`L ${x(i+1)} ${y(times[i])} `;
    }
    svg.appendChild(el("path",{d,fill:"none",stroke:curColor,"stroke-width":"2.5"}));
    svg.appendChild(el("circle",{cx:x(idx+1),cy:y(times[idx]),r:4,fill:curColor}));
    if(t<1){requestAnimationFrame(frame);}else{onDone();}
  }
  requestAnimationFrame(frame);
}

function renderStandings(results){
  const sorted=[...results].sort((a,b)=>a.total-b.total);
  const lead=sorted[0].total;
  const rows=sorted.map((r,i)=>{
    const gap=i===0?"Leader":`+${(r.total-lead).toFixed(3)}`;
    const pts=POINTS[i]||0;
    const color=TEAM_COLOR[r.team.team]||"#555";
    return `<tr><td class="bar" style="background:${color}"></td><td class="pos">${i+1}</td><td class="drv">${r.driver.name}</td><td class="team">${r.team.team}</td><td>${gap}</td><td class="pts">${pts}</td></tr>`;
  }).join("");
  document.getElementById("standingsBody").innerHTML=
    `<div class="table-scroll"><table><thead><tr><th></th><th>Pos</th><th>Driver</th><th>Teams</th><th>Total Time/Gap</th><th class="pts">Points</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

async function main(){
  await loadData();

  CIRCUITS.forEach((c,i)=>circuitSel.add(new Option(c.name,i)));
  TEAMS.forEach((t,i)=>teamSel.add(new Option(t.team,i)));
  STRATS.forEach((s,i)=>{
    let label=s.stints.map(st=>TYRE[st.tyre].name).join("-")+` (${s.pits.length} pitstop${s.pits.length>1?"s":""})`;
    const lastTyre=s.stints[s.stints.length-1].tyre;
    if(lastTyre==="S")label+=" ⚠ long Soft stint — high degradation risk";
    stratSel.add(new Option(label,i));
  });

  teamSel.addEventListener("change",()=>{renderDrivers();renderCar();});
  circuitSel.addEventListener("change",()=>{
    simBtn.disabled=false;
    standingsTitle.textContent="Drivers Standing — "+CIRCUITS[circuitSel.value].name;
  });
  renderDrivers();
  renderCar();

  simBtn.addEventListener("click",()=>{
    if(!selectedDriver)return;
    simBtn.disabled=true;
    liveBadge.classList.remove("finished");
    liveBadge.innerHTML='<span class="dot"></span>Race Live';
    document.getElementById("standingsBody").innerHTML='<div class="placeholder">Race in progress — standings will be displayed after the race finishes.</div>';

    const circuit=CIRCUITS[circuitSel.value];
    const userTeam=TEAMS.find(t=>t.team===selectedDriver.team);
    const userStrategy=STRATS[stratSel.value];

    const results=[simulateDriver(selectedDriver,userTeam,circuit,userStrategy)];
    DRIVERS.forEach(d=>{
      if(d.name===selectedDriver.name)return;
      const team=TEAMS.find(t=>t.team===d.team);
      results.push(simulateDriver(d,team,circuit,defaultStrategyFor(circuit)));
    });

    animateGraph(circuit,results[0],()=>{
      renderStandings(results);
      liveBadge.classList.add("finished");
      liveBadge.innerHTML='<span class="dot"></span>Race Finished';
      simBtn.disabled=false;
    });
  });
}

main();
