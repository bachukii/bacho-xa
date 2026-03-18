import { useState, useEffect, useRef, useCallback } from "react";

const C = {
  bg:"#080b14", surface:"#0f1422", surface2:"#151c2e",
  border:"rgba(255,255,255,0.07)", borderGold:"rgba(201,168,76,0.28)",
  gold:"#c9a84c", goldDim:"rgba(201,168,76,0.12)",
  green:"#2ecc71", greenDim:"rgba(46,204,113,0.10)", greenBorder:"rgba(46,204,113,0.25)",
  blue:"#5b9de0", blueDim:"rgba(91,157,224,0.10)",
  red:"#e05555", redDim:"rgba(224,85,85,0.10)",
  teal:"#2ab5aa", tealDim:"rgba(42,181,170,0.12)", tealBorder:"rgba(42,181,170,0.28)",
  text:"#e8e4dc", muted:"#8a91a0", dim:"#3a4050",
};

const DISTRICT_COORDS = {
  "ვაკე":{lat:41.7225,lng:44.7614},"საბურთალო":{lat:41.7389,lng:44.7553},
  "დიდუბე":{lat:41.7558,lng:44.7717},"გლდანი":{lat:41.7792,lng:44.7842},
  "ნაძალადევი":{lat:41.7447,lng:44.7903},"მთაწმინდა":{lat:41.6940,lng:44.7890},
  "ისანი":{lat:41.6862,lng:44.8124},"სამგორი":{lat:41.6756,lng:44.8321},
  "თბილისი":{lat:41.7151,lng:44.8271},
};

const REGIONS = ["თბილისი","ვაკე","საბურთალო","დიდუბე","გლდანი","ნაძალადევი","მთაწმინდა","ისანი","სამგორი","რუსთავი","ბათუმი","ქუთაისი","გორი","ზუგდიდი","ფოთი","სხვა"];
const TYPES = ["ბინა","სახლი","მიწა","კომერციული"];
const SALE_TYPES = ["იყიდება","ქირავდება"];

const LAT_TO_GEO = {a:"ა",b:"ბ",g:"გ",d:"დ",e:"ე",v:"ვ",z:"ზ",t:"თ",i:"ი",k:"კ",l:"ლ",m:"მ",n:"ნ",o:"ო",p:"პ",r:"რ",s:"ს",u:"უ",f:"ფ",q:"ქ",y:"ყ",h:"ჰ",j:"ჯ",x:"ხ",A:"ა",B:"ბ",G:"გ",D:"დ",E:"ე",V:"ვ",K:"კ",L:"ლ",M:"მ",N:"ნ",O:"ო",P:"პ",T:"თ",I:"ი",U:"უ",F:"ფ",Q:"ქ",H:"ჰ",J:"ჯ",X:"ხ"};
function latToGeo(s){return (s||"").split("").map(c=>LAT_TO_GEO[c]||c).join("");}
function norm(s){return (s||"").trim().toLowerCase();}
function nameMatch(fv,lat,geo){const f=norm(fv);return f===norm(lat)||f===norm(geo)||f===norm(latToGeo(lat));}
function parseMapsLink(url){
  try{
    const m=url.match(/[?&]q=([^&]+)/)||url.match(/@([\d.]+),([\d.]+)/);
    if(m&&m[2])return{lat:parseFloat(m[1]),lng:parseFloat(m[2])};
    if(m&&m[1]){const[lat,lng]=m[1].split(",");return{lat:parseFloat(lat),lng:parseFloat(lng)};}
  }catch{}
  return null;
}

const inp = {width:"100%",marginBottom:8,padding:"10px 14px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:14,boxSizing:"border-box",outline:"none",background:C.surface2,color:C.text};
const btn = (x={})=>({padding:"10px 16px",border:`1px solid ${C.border}`,borderRadius:8,background:C.surface,cursor:"pointer",fontSize:14,fontWeight:500,color:C.text,...x});

const api = async (body) => {
  const res = await fetch("/.netlify/functions/verify", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
  return res.json();
};

function Badge({verified}){return(
  <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:700,
    background:verified?C.greenDim:C.redDim,color:verified?C.green:C.red,
    border:`1px solid ${verified?"rgba(46,204,113,.22)":"rgba(224,85,85,.22)"}`}}>
    {verified?"✓ მესაკუთრე":"⚠ შეუმოწმებელი"}
  </span>
);}

function TypeChip({type}){return(
  <span style={{padding:"3px 9px",borderRadius:4,fontSize:11,fontWeight:700,
    background:type==="იყიდება"?"rgba(201,168,76,.85)":"rgba(91,157,224,.8)",
    color:type==="იყიდება"?"#080b14":"#fff"}}>{type}</span>
);}

function StepBar({current,steps}){
  return(
    <div style={{display:"flex",marginBottom:"1.5rem"}}>
      {steps.map((s,i)=>(
        <div key={i} style={{flex:1,textAlign:"center"}}>
          <div style={{width:26,height:26,borderRadius:"50%",margin:"0 auto 4px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:500,
            background:i<current?C.greenDim:i===current?C.blueDim:C.surface2,
            color:i<current?C.green:i===current?C.blue:C.muted,
            border:`1px solid ${i<current?C.greenBorder:i===current?"rgba(91,157,224,.4)":C.border}`}}>
            {i<current?"✓":i+1}
          </div>
          <p style={{fontSize:9,margin:0,color:i===current?C.text:C.muted}}>{s}</p>
        </div>
      ))}
    </div>
  );
}

function FileUpload({label,accept,file,onChange,multiple}){
  const ref=useRef();
  return(
    <div onClick={()=>ref.current.click()} style={{border:`1.5px dashed ${C.dim}`,borderRadius:12,padding:"1rem",textAlign:"center",cursor:"pointer",background:C.surface2,marginBottom:"1rem"}}>
      <input ref={ref} type="file" accept={accept} multiple={multiple} style={{display:"none"}} onChange={e=>onChange(multiple?Array.from(e.target.files):e.target.files[0])}/>
      {file
        ? <p style={{margin:0,fontSize:13,color:C.green}}>✓ {Array.isArray(file)?`${file.length} ფოტო`:file.name}</p>
        : <div><p style={{margin:"0 0 3px",fontSize:18,color:C.muted}}>+</p><p style={{margin:0,fontSize:12,color:C.muted}}>{label}</p></div>
      }
    </div>
  );
}

function MiniMap({lat,lng,height=180}){
  const ref=useRef();
  useEffect(()=>{
    if(!lat||!lng||!window.L)return;
    const map=window.L.map(ref.current,{zoomControl:true,scrollWheelZoom:false}).setView([lat,lng],16);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OSM"}).addTo(map);
    const icon=window.L.divIcon({html:'<div style="width:14px;height:14px;background:#c9a84c;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px rgba(201,168,76,.8)"></div>',className:"",iconSize:[14,14]});
    window.L.marker([lat,lng],{icon}).addTo(map);
    return()=>map.remove();
  },[lat,lng]);
  if(!lat||!lng)return null;
  return <div ref={ref} style={{height,borderRadius:10,overflow:"hidden",marginBottom:12}}/>;
}

function MapView({listings,onDetail}){
  const ref=useRef();
  useEffect(()=>{
    if(!window.L)return;
    const map=window.L.map(ref.current).setView([41.72,44.79],12);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OSM"}).addTo(map);
    const icon=window.L.divIcon({html:'<div style="width:12px;height:12px;background:#c9a84c;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px rgba(201,168,76,.7)"></div>',className:"",iconSize:[12,12]});
    listings.forEach(l=>{
      const coords=DISTRICT_COORDS[l.region||l.district];
      const lt=l.lat||coords?.lat;
      const lg=l.lng||coords?.lng;
      if(!lt||!lg)return;
      const m=window.L.marker([lt,lg],{icon}).addTo(map);
      m.bindPopup(`<b>${l.title}</b><br/>${l.price}$${l.cadastral_code?`<br/><a href="https://maps.gov.ge/?parcel=${l.cadastral_code}" target="_blank" style="color:#2ab5aa">🗺 maps.gov.ge</a>`:""}`);
      m.on("click",()=>onDetail&&onDetail(l));
    });
    return()=>map.remove();
  },[listings]);
  return <div ref={ref} style={{height:"calc(100vh - 120px)"}}/>;
}

function ListingCard({l,onClick}){
  return(
    <div onClick={onClick} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:13,padding:"14px 16px",marginBottom:"0.75rem",cursor:"pointer",transition:"transform .2s,box-shadow .2s"}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 12px 32px rgba(0,0,0,.45)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
      {l.photos&&l.photos.length>0&&(
        <div style={{marginBottom:10,borderRadius:8,overflow:"hidden",height:160,background:C.surface2}}>
          <img src={l.photos[0]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}>
            <Badge verified={l.status==="approved"}/>
            <TypeChip type={l.sale_type||"იყიდება"}/>
          </div>
          <p style={{margin:"0 0 3px",fontWeight:600,fontSize:15,color:C.text}}>{l.title}</p>
          <p style={{margin:"0 0 3px",fontSize:12,color:C.muted}}>
            {l.region} · {l.type} · {l.area}მ²
            {l.floor?` · ${l.floor}სართ.`:""}
            {l.rooms?` · ${l.rooms}ოთ.`:""}
          </p>
          {l.description&&<p style={{margin:0,fontSize:11,color:C.dim}}>{l.description.slice(0,60)}{l.description.length>60?"...":""}</p>}
        </div>
        <div style={{textAlign:"right",minWidth:80,marginLeft:10}}>
          <p style={{margin:"0 0 4px",fontWeight:700,fontSize:16,color:C.gold}}>{l.price}$</p>
        </div>
      </div>
      {l.cadastral_code&&(
        <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600,background:C.tealDim,color:C.teal,border:`1px solid ${C.tealBorder}`}}>
          🗺 {l.cadastral_code}
        </span>
      )}
    </div>
  );
}

function DetailView({l,onBack}){
  const coords=DISTRICT_COORDS[l.region||l.district]||null;
  const lat=l.lat||coords?.lat;
  const lng=l.lng||coords?.lng;
  return(
    <div style={{maxWidth:560,margin:"0 auto",padding:"1rem"}}>
      <button onClick={onBack} style={btn({marginBottom:"1rem",padding:"6px 12px",fontSize:13})}>← უკან</button>
      {l.photos&&l.photos.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:l.photos.length>1?"1fr 1fr":"1fr",gap:6,marginBottom:12}}>
          {l.photos.map((p,i)=><img key={i} src={p} alt="" style={{width:"100%",height:160,objectFit:"cover",borderRadius:8}}/>)}
        </div>
      )}
      <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        <Badge verified={l.status==="approved"}/>
        <TypeChip type={l.sale_type||"იყიდება"}/>
      </div>
      <h2 style={{margin:"0 0 6px",fontSize:20,fontWeight:700,color:C.text}}>{l.title}</h2>
      <p style={{margin:"0 0 12px",fontSize:22,fontWeight:700,color:C.gold}}>{l.price}$</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        {[["📍 რაიონი",l.region],["🏢 ტიპი",l.type],["📐 ფართი",`${l.area}მ²`],["🏗 სართული",l.floor||"—"],["🛏 ოთახები",l.rooms||"—"],["📞 ტელეფონი",l.phone||"—"]].map(([k,v])=>(
          <div key={k} style={{background:C.surface2,borderRadius:8,padding:"8px 10px"}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:2}}>{k}</div>
            <div style={{fontSize:14,fontWeight:500}}>{v}</div>
          </div>
        ))}
      </div>
      {l.cadastral_code&&(
        <div style={{background:C.tealDim,border:`1px solid ${C.tealBorder}`,borderRadius:10,padding:"10px 14px",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:10,color:C.teal,marginBottom:2}}>🗺 საკადასტრო კოდი</div>
              <div style={{fontSize:14,fontWeight:700,color:C.teal}}>{l.cadastral_code}</div>
            </div>
            <a href={`https://maps.gov.ge/?parcel=${l.cadastral_code}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
              style={{padding:"7px 14px",background:"rgba(42,181,170,0.2)",border:`1px solid ${C.tealBorder}`,borderRadius:8,color:C.teal,fontWeight:600,fontSize:12,textDecoration:"none"}}>
              🗺 maps.gov.ge →
            </a>
          </div>
        </div>
      )}
      {l.description&&<p style={{color:C.muted,fontSize:13,lineHeight:1.6,marginBottom:12}}>{l.description}</p>}
      <MiniMap lat={lat} lng={lng}/>
      {l.phone&&(
        <a href={`tel:${l.phone}`} style={{display:"block",textAlign:"center",padding:"12px",background:C.goldDim,border:`1px solid ${C.borderGold}`,borderRadius:10,color:C.gold,fontWeight:700,fontSize:15,textDecoration:"none"}}>
          📞 გამყიდველს დარეკვა
        </a>
      )}
    </div>
  );
}

function AlertsView({listings}){
  const [type,setType]=useState("ყველა");
  const [sale,setSale]=useState("ყველა");
  const [region,setRegion]=useState("ყველა");
  const [maxPrice,setMaxPrice]=useState("");
  const [minArea,setMinArea]=useState("");
  const [maxArea,setMaxArea]=useState("");
  const [minRooms,setMinRooms]=useState("");
  const [maxFloor,setMaxFloor]=useState("");
  const [saved,setSaved]=useState(false);

  const matched=listings.filter(l=>{
    if(l.status!=="approved")return false;
    if(sale!=="ყველა"&&(l.sale_type||"იყიდება")!==sale)return false;
    if(type!=="ყველა"&&l.type!==type)return false;
    if(maxPrice&&l.price>Number(maxPrice))return false;
    if(minArea&&l.area<Number(minArea))return false;
    if(maxArea&&l.area>Number(maxArea))return false;
    if(minRooms&&(l.rooms||0)<Number(minRooms))return false;
    if(maxFloor&&(parseInt(l.floor)||99)>Number(maxFloor))return false;
    if(region!=="ყველა"&&l.region!==region)return false;
    return true;
  });

  return(
    <div style={{maxWidth:560,margin:"0 auto",padding:"1rem"}}>
      <h2 style={{margin:"0 0 6px",fontSize:18,fontWeight:600,color:C.text}}>🔔 სიგნალები</h2>
      <p style={{margin:"0 0 16px",fontSize:12,color:C.muted}}>შეავსე ფილტრი — შესაბამისი ახალი განცხადება = შეტყობინება</p>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"1rem",marginBottom:"1rem"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <select value={sale} onChange={e=>setSale(e.target.value)} style={inp}><option>ყველა</option>{SALE_TYPES.map(t=><option key={t}>{t}</option>)}</select>
          <select value={type} onChange={e=>setType(e.target.value)} style={inp}><option>ყველა</option>{TYPES.map(t=><option key={t}>{t}</option>)}</select>
          <select value={region} onChange={e=>setRegion(e.target.value)} style={inp}><option>ყველა</option>{REGIONS.map(r=><option key={r}>{r}</option>)}</select>
          <input placeholder="მაქს. ფასი ($)" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} style={inp}/>
          <input placeholder="მინ. ფართი (მ²)" value={minArea} onChange={e=>setMinArea(e.target.value)} style={inp}/>
          <input placeholder="მაქს. ფართი (მ²)" value={maxArea} onChange={e=>setMaxArea(e.target.value)} style={inp}/>
        </div>

        {(type==="ბინა"||type==="სახლი")&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:0}}>
            <input placeholder="მინ. ოთახები" value={minRooms} onChange={e=>setMinRooms(e.target.value)} style={inp}/>
            <input placeholder="მაქს. სართული" value={maxFloor} onChange={e=>setMaxFloor(e.target.value)} style={inp}/>
          </div>
        )}

        {type==="მიწა"&&(
          <div style={{background:C.surface2,borderRadius:8,padding:"8px 10px",marginBottom:8,fontSize:12,color:C.muted}}>
            მიწისთვის ფართობი ჰა-ში: 1ჰა = 10,000მ²
          </div>
        )}

        <button onClick={()=>setSaved(true)} style={btn({width:"100%",background:C.goldDim,border:`1px solid ${C.borderGold}`,color:C.gold,fontWeight:600})}>
          {saved?"✓ სიგნალი შენახულია":"🔔 სიგნალის შენახვა (10₾/თვე)"}
        </button>
      </div>
      <p style={{fontSize:12,color:C.muted,marginBottom:8}}>შესაბამისი: <strong style={{color:C.gold}}>{matched.length}</strong></p>
      {matched.map(l=><ListingCard key={l.id} l={l}/>)}
    </div>
  );
}

function StatsView({listings}){
  const approved=listings.filter(l=>l.status==="approved");
  const withCad=approved.filter(l=>l.cadastral_code);
  const total=approved.length||1;
  const byRegion=REGIONS.map(r=>({name:r,count:approved.filter(l=>l.region===r).length})).filter(d=>d.count>0);
  const maxCount=Math.max(...byRegion.map(d=>d.count),1);
  const avgPrice=approved.length?Math.round(approved.reduce((s,l)=>s+(l.price||0),0)/approved.length):0;
  const savedComm=Math.round(approved.reduce((s,l)=>s+(l.price||0)*0.03,0));
  return(
    <div style={{maxWidth:560,margin:"0 auto",padding:"1rem"}}>
      <h2 style={{margin:"0 0 16px",fontSize:18,fontWeight:600}}>📊 სტატისტიკა</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[["სულ",approved.length,C.gold],["კადასტრო",withCad.length,C.teal],["საშ. ფასი",`${avgPrice}$`,C.blue],["დაზოგული",`${savedComm}$`,C.green]].map(([l,v,c])=>(
          <div key={l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:11,padding:"14px 16px"}}>
            <div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:.4,marginBottom:4}}>{l}</div>
            <div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:13,padding:"1rem",marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>📍 რაიონები</div>
        {byRegion.length===0?<p style={{color:C.muted,fontSize:12}}>ჯერ განცხადება არ არის</p>:byRegion.map(d=>(
          <div key={d.name} style={{marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}><span>{d.name}</span><span style={{color:C.muted}}>{d.count}</span></div>
            <div style={{height:5,background:C.surface2,borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${d.count/maxCount*100}%`,background:`linear-gradient(90deg,${C.gold},${C.teal})`,borderRadius:3}}/>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:13,padding:"1rem"}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>🗺 კადასტრული გამჭვირვალობა</div>
        <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
          <div style={{position:"relative",width:100,height:100}}>
            <svg viewBox="0 0 100 100" style={{transform:"rotate(-90deg)",width:"100%",height:"100%"}}>
              <circle cx="50" cy="50" r="40" fill="none" stroke={C.surface2} strokeWidth="14"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke={C.teal} strokeWidth="14" strokeDasharray={`${withCad.length/total*251.2} 251.2`} strokeLinecap="round"/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <div style={{fontSize:16,fontWeight:700,color:C.teal}}>{Math.round(withCad.length/total*100)}%</div>
              <div style={{fontSize:9,color:C.muted}}>კადასტრი</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminView(){
  const [pass,setPass]=useState("");
  const [auth,setAuth]=useState(false);
  const [pending,setPending]=useState([]);
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState("");
  const login=async()=>{setLoading(true);const d=await api({action:"get_pending",password:pass});if(d.error)setMsg(d.error);else{setPending(d);setAuth(true);}setLoading(false);};
  const update=async(id,status)=>{await api({action:"admin_update",password:pass,id,status});setPending(p=>p.filter(l=>l.id!==id));};
  if(!auth)return(
    <div style={{maxWidth:360,margin:"60px auto",padding:"1rem"}}>
      <h2 style={{margin:"0 0 16px",color:C.gold}}>🔐 ადმინი</h2>
      <input type="password" placeholder="პაროლი" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} style={inp}/>
      {msg&&<p style={{color:C.red,fontSize:13,margin:"0 0 8px"}}>{msg}</p>}
      <button onClick={login} disabled={loading} style={btn({width:"100%",background:C.goldDim,border:`1px solid ${C.borderGold}`,color:C.gold})}>{loading?"...":"შესვლა"}</button>
    </div>
  );
  return(
    <div style={{maxWidth:560,margin:"0 auto",padding:"1rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={{margin:0,color:C.gold}}>🔐 ადმინი</h2>
        <span style={{background:C.redDim,color:C.red,padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:700}}>pending: {pending.length}</span>
      </div>
      {pending.length===0&&<p style={{color:C.muted}}>განხილვადი განცხადება არ არის ✓</p>}
      {pending.map(l=>(
        <div key={l.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px",marginBottom:"0.75rem"}}>
          <p style={{fontWeight:600,marginBottom:4,color:C.text}}>{l.title}</p>
          <p style={{fontSize:12,color:C.muted,marginBottom:4}}>{l.region} · {l.type} · {l.area}მ² · {l.price}$</p>
          <p style={{fontSize:12,color:C.muted,marginBottom:4}}>👤 {l.first_name} {l.last_name} · {l.personal_number}</p>
          <p style={{fontSize:12,color:C.muted,marginBottom:8}}>📞 {l.phone}</p>
          {l.cadastral_code&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <p style={{fontSize:11,color:C.teal,margin:0}}>🗺 {l.cadastral_code}</p>
            <a href={`https://maps.gov.ge/?parcel=${l.cadastral_code}`} target="_blank" rel="noreferrer" style={{fontSize:10,color:C.teal,textDecoration:"none",padding:"2px 6px",border:`1px solid ${C.tealBorder}`,borderRadius:4}}>maps.gov.ge →</a>
          </div>}
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>update(l.id,"approved")} style={btn({flex:1,background:C.greenDim,border:`1px solid ${C.greenBorder}`,color:C.green,fontWeight:600})}>✓ Approve</button>
            <button onClick={()=>update(l.id,"rejected")} style={btn({flex:1,background:C.redDim,border:"1px solid rgba(224,85,85,.3)",color:C.red})}>✗ Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── AUTH VIEWS ──────────────────────────────────────────────────────────────
function AuthView({onLogin}){
  const [isReg,setIsReg]=useState(false);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [firstName,setFirstName]=useState("");
  const [lastName,setLastName]=useState("");
  const [personalNumber,setPersonalNumber]=useState("");
  const [phone,setPhone]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const handle=async()=>{
    setLoading(true);setError("");
    if(isReg){
      if(!firstName||!lastName||!personalNumber||!phone||!email||!password){setError("შეავსეთ ყველა ველი");setLoading(false);return;}
      if(!/^\d{11}$/.test(personalNumber)){setError("პირადი ნომერი — 11 ციფრი");setLoading(false);return;}
      const d=await api({action:"register",email,password,firstName,lastName,personalNumber,phone});
      if(d.success)onLogin(d.user,d.session);
      else setError(d.error||"შეცდომა");
    } else {
      const d=await api({action:"login",email,password});
      if(d.success)onLogin(d.user,d.session);
      else setError(d.error||"მეილი ან პაროლი არასწორია");
    }
    setLoading(false);
  };

  return(
    <div style={{maxWidth:400,margin:"40px auto",padding:"1rem"}}>
      <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.gold,marginBottom:4}}>პარტნიორი</div>
        <p style={{fontSize:13,color:C.muted,margin:0}}>{isReg?"ახალი ანგარიშის შექმნა":"შესვლა"}</p>
      </div>
      {isReg&&(
        <>
          <input placeholder="სახელი" value={firstName} onChange={e=>setFirstName(e.target.value)} style={inp}/>
          <input placeholder="გვარი" value={lastName} onChange={e=>setLastName(e.target.value)} style={inp}/>
          <input placeholder="პირადი ნომერი (11 ციფრი)" value={personalNumber} maxLength={11} onChange={e=>setPersonalNumber(e.target.value)} style={inp}/>
          <input placeholder="ტელეფონი (+995...)" value={phone} onChange={e=>setPhone(e.target.value)} style={inp}/>
        </>
      )}
      <input type="email" placeholder="ელ. ფოსტა" value={email} onChange={e=>setEmail(e.target.value)} style={inp}/>
      <input type="password" placeholder="პაროლი (მინ. 6 სიმბოლო)" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()} style={inp}/>
      {error&&<p style={{color:C.red,fontSize:13,margin:"0 0 10px"}}>{error}</p>}
      <button onClick={handle} disabled={loading} style={btn({width:"100%",background:C.goldDim,border:`1px solid ${C.borderGold}`,color:C.gold,fontWeight:600,opacity:loading?0.5:1})}>
        {loading?"...":(isReg?"რეგისტრაცია":"შესვლა")}
      </button>
      <p style={{textAlign:"center",marginTop:12,fontSize:13,color:C.muted}}>
        {isReg?"უკვე გაქვს ანგარიში?":"ანგარიში არ გაქვს?"}{" "}
        <span onClick={()=>{setIsReg(!isReg);setError("");}} style={{color:C.gold,cursor:"pointer"}}>{isReg?"შესვლა":"რეგისტრაცია"}</span>
      </p>
    </div>
  );
}

function ProfileView({user,session,profile,onLogout,onRefresh}){
  const [listings,setListings]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    api({action:"get_profile",token:session?.access_token}).then(d=>{
      if(d.listings)setListings(d.listings);
      setLoading(false);
    });
  },[]);

  return(
    <div style={{maxWidth:560,margin:"0 auto",padding:"1rem"}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"1.25rem",marginBottom:"1rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontWeight:700,fontSize:16,color:C.text,marginBottom:4}}>{profile?.first_name} {profile?.last_name}</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:4}}>{user?.email}</div>
            <div style={{fontSize:12,color:C.muted}}>პ/ნ: {profile?.personal_number}</div>
          </div>
          <div style={{textAlign:"right"}}>
            {profile?.id_verified
              ? <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:C.greenDim,color:C.green,border:`1px solid ${C.greenBorder}`}}>✓ ID ვერიფ.</span>
              : <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:C.redDim,color:C.red}}>⚠ ID საჭირო</span>
            }
          </div>
        </div>
        <button onClick={onLogout} style={btn({marginTop:12,fontSize:12,padding:"6px 12px",color:C.muted})}>გამოსვლა</button>
      </div>

      <h3 style={{margin:"0 0 12px",fontSize:15,fontWeight:600}}>ჩემი განცხადებები ({listings.length})</h3>
      {loading?<p style={{color:C.muted}}>იტვირთება...</p>:listings.length===0?<p style={{color:C.muted,fontSize:13}}>განცხადება ჯერ არ გაქვს</p>:listings.map(l=>(
        <div key={l.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:"0.5rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <p style={{margin:"0 0 3px",fontWeight:600,fontSize:14,color:C.text}}>{l.title}</p>
              <p style={{margin:0,fontSize:11,color:C.muted}}>{l.region} · {l.area}მ² · {l.price}$</p>
            </div>
            <span style={{padding:"3px 8px",borderRadius:20,fontSize:10,fontWeight:700,
              background:l.status==="approved"?C.greenDim:l.status==="rejected"?C.redDim:"rgba(201,168,76,0.1)",
              color:l.status==="approved"?C.green:l.status==="rejected"?C.red:C.gold}}>
              {l.status==="approved"?"✓ გამოქვეყნ.":l.status==="rejected"?"✗ უარყოფ.":"⏳ განხილვაში"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── POST VIEW ───────────────────────────────────────────────────────────────
function PostView({user,session,profile,showToast}){
  const steps=["ID ვერიფ.","ამონაწერი","განცხადება","შედეგი"];
  const [step,setStep]=useState(profile?.id_verified?1:0);
  const [listing,setListing]=useState({title:"",price:"",area:"",floor:"",rooms:"",region:"თბილისი",type:"ბინა",saleType:"იყიდება",description:"",cadastral:"",mapsLink:"",lat:"",lng:""});
  const [photos,setPhotos]=useState([]);
  const [idFile,setIdFile]=useState(null);
  const [idResult,setIdResult]=useState(null);
  const [extractFile,setExtractFile]=useState(null);
  const [extractResult,setExtractResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [submitted,setSubmitted]=useState(false);

  const fileToBase64=(file)=>new Promise((res,rej)=>{
    if(file.type.includes("pdf")){const r=new FileReader();r.onload=()=>res({base64:r.result.split(",")[1],mediaType:"application/pdf"});r.onerror=rej;r.readAsDataURL(file);return;}
    const img=new Image();const url=URL.createObjectURL(file);
    img.onload=()=>{const canvas=document.createElement("canvas");const max=1200;let w=img.width,h=img.height;if(w>max){h=Math.round(h*max/w);w=max;}canvas.width=w;canvas.height=h;canvas.getContext("2d").drawImage(img,0,0,w,h);res({base64:canvas.toDataURL("image/jpeg",0.85).split(",")[1],mediaType:"image/jpeg"});URL.revokeObjectURL(url);};
    img.onerror=rej;img.src=url;
  });

  const callClaude=async(file,prompt)=>{
    const{base64,mediaType}=await fileToBase64(file);
    const contentItem=mediaType==="application/pdf"?{type:"document",source:{type:"base64",media_type:mediaType,data:base64}}:{type:"image",source:{type:"base64",media_type:mediaType,data:base64}};
    const d=await api({model:"claude-sonnet-4-20250514",max_tokens:1500,messages:[{role:"user",content:[contentItem,{type:"text",text:prompt}]}]});
    if(d.error)throw new Error(d.error.message);
    const text=d.content.map(c=>c.text||"").join("");
    const jsonMatch=text.match(/\{[\s\S]*\}/);
    if(!jsonMatch)throw new Error("AI პასუხი: "+text.substring(0,120));
    return JSON.parse(jsonMatch[0]);
  };

  const handleVerifyId=async()=>{
    if(!idFile){setError("ატვირთეთ დოკუმენტი");return;}
    setLoading(true);setError("");
    try{
      const r=await callClaude(idFile,
        `Georgian ID card or passport. Extract ALL name variants and respond ONLY with JSON, no extra text:
{"isValidDocument":true,"firstName":"LATIN_FIRSTNAME","lastName":"LATIN_LASTNAME","firstNameGeo":"ქართული_სახელი","lastNameGeo":"ქართული_გვარი","personalNumber":"11digits"}`
      );
      setIdResult(r);
      if(!r.isValidDocument){setError("დოკუმენტი ვერ დადასტურდა");return;}
      const pn=profile?.personal_number||"";
      const ok=nameMatch(profile?.first_name,r.firstName,r.firstNameGeo)&&nameMatch(profile?.last_name,r.lastName,r.lastNameGeo)&&norm(r.personalNumber)===norm(pn);
      if(ok){
        await api({action:"set_id_verified",token:session?.access_token});
        setStep(1);
        showToast("✅ ID ვერიფიკაცია შენახულია!");
      } else {
        setError("მონაცემები არ ემთხვევა ანგარიშის მონაცემებს");
      }
    }catch(e){setError(e.message);}
    setLoading(false);
  };

  const handleVerifyExtract=async()=>{
    if(!extractFile){setError("ატვირთეთ ამონაწერი");return;}
    setLoading(true);setError("");
    try{
      const pn=profile?.personal_number||"";
      const r=await callClaude(extractFile,
        `Georgian public registry extract (napr.gov.ge). May have multiple owners (თანასაკუთრება).
Find if personal number "${pn}" is listed as owner.
Respond ONLY with JSON:
{"isValidDocument":true,"found":true,"ownerFirstName":"LATIN","ownerLastName":"LATIN","ownerFirstNameGeo":"ქართული","ownerLastNameGeo":"ქართული","ownerPersonalNumber":"11digits","cadastralCode":"CODE","allOwners":["სახელი გვარი"]}`
      );
      setExtractResult(r);
      if(r.isValidDocument&&r.found&&norm(r.ownerPersonalNumber)===norm(pn)){
        setListing(l=>({...l,cadastral:r.cadastralCode||""}));
        setStep(2);
      } else {
        setError("პირადი ნომერი ამონაწერში ვერ მოიძებნა");
      }
    }catch(e){setError(e.message);}
    setLoading(false);
  };

  const handleMapsLink=(val)=>{
    setListing(l=>({...l,mapsLink:val}));
    const coords=parseMapsLink(val);
    if(coords)setListing(l=>({...l,mapsLink:val,lat:coords.lat.toString(),lng:coords.lng.toString()}));
  };

  const uploadPhoto=async(file,listingId)=>{
    const{base64,mediaType}=await fileToBase64(file);
    const fileName=`${listingId}/${Date.now()}.jpg`;
    const d=await api({action:"upload_photo",fileName,fileData:base64,contentType:mediaType});
    return d.url;
  };

  const handleSubmit=async()=>{
    if(!listing.title||!listing.price||!listing.area){setError("შეავსეთ სავალდებულო ველები (*)");return;}
    setLoading(true);setError("");
    try{
      const d=await api({action:"save_listing",data:{
        user_id:user?.id,
        first_name:profile?.first_name,last_name:profile?.last_name,
        personal_number:profile?.personal_number,phone:profile?.phone,
        cadastral_code:listing.cadastral,title:listing.title,
        price:parseFloat(listing.price),area:parseFloat(listing.area),
        floor:listing.floor,rooms:listing.rooms,region:listing.region,
        type:listing.type,sale_type:listing.saleType,description:listing.description,
        status:"pending",photos:[],
        lat:listing.lat?parseFloat(listing.lat):null,
        lng:listing.lng?parseFloat(listing.lng):null,
        maps_link:listing.mapsLink||null,
      }});
      if(!d.success)throw new Error(d.error||"შეცდომა");
      if(photos.length>0&&d.id){
        const urls=await Promise.all(photos.map(f=>uploadPhoto(f,d.id)));
        await api({action:"update_listing",id:d.id,photos:urls,status:"pending"});
      }
      setSubmitted(true);setStep(3);
      showToast("✅ განცხადება გაგზავნილია!");
    }catch(e){setError(e.message);}
    setLoading(false);
  };

  const idMatch=idResult?.isValidDocument&&
    nameMatch(profile?.first_name,idResult.firstName,idResult.firstNameGeo)&&
    nameMatch(profile?.last_name,idResult.lastName,idResult.lastNameGeo)&&
    norm(idResult.personalNumber)===norm(profile?.personal_number||"");

  return(
    <div style={{maxWidth:480,margin:"0 auto",padding:"1.5rem 1rem"}}>
      <h2 style={{margin:"0 0 1.5rem",fontSize:18,fontWeight:600}}>➕ განცხადების დამატება</h2>
      <div style={{background:C.surface2,borderRadius:8,padding:"8px 12px",marginBottom:"1rem",fontSize:12,color:C.muted}}>
        👤 {profile?.first_name} {profile?.last_name} · {profile?.personal_number}
        {profile?.id_verified&&<span style={{color:C.green,marginLeft:8}}>✓ ID ვერიფ.</span>}
      </div>
      <StepBar current={step} steps={steps}/>

      {step===0&&(
        <div>
          <p style={{fontSize:13,color:C.muted,marginTop:0}}>ID ვერიფიკაცია ერთხელ — შემდეგ ყოველ განცხადებაზე ახლიდან არ გჭირდება.</p>
          <FileUpload label="პირადობა ან პასპორტი (JPG/PNG/PDF)" accept="image/*,.pdf" file={idFile} onChange={f=>{setIdFile(f);setIdResult(null);}}/>
          {idResult&&(
            <div style={{background:idMatch?C.greenDim:C.redDim,border:`1px solid ${idMatch?C.greenBorder:"rgba(224,85,85,.3)"}`,borderRadius:10,padding:"10px 14px",marginBottom:"1rem"}}>
              <p style={{margin:"0 0 4px",fontSize:13,fontWeight:600,color:idMatch?C.green:C.red}}>
                {idMatch?"✓ პირადობა დადასტურდა":"✗ მონაცემები არ ემთხვევა"}
              </p>
              <div style={{fontSize:11,color:C.muted}}>
                <div>ანგარიში: {profile?.first_name} {profile?.last_name} / {profile?.personal_number}</div>
                <div>ამოცნობ.: {idResult.firstNameGeo||idResult.firstName} {idResult.lastNameGeo||idResult.lastName} / {idResult.personalNumber}</div>
              </div>
            </div>
          )}
          {error&&<p style={{color:C.red,fontSize:13,margin:"0 0 10px"}}>{error}</p>}
          <div style={{display:"flex",gap:8}}>
            <button onClick={handleVerifyId} disabled={loading||!idFile} style={btn({flex:1,opacity:(loading||!idFile)?0.5:1})}>{loading?"მოწმდება...":"გადამოწმება"}</button>
            {idResult&&!idMatch&&<button onClick={()=>{setIdResult(null);setIdFile(null);setError("");}} style={btn({flex:1})}>↩ სხვა ფოტო</button>}
          </div>
        </div>
      )}

      {step===1&&(
        <div>
          <p style={{fontSize:13,color:C.muted,marginTop:0}}>ატვირთეთ საჯარო რეესტრის ამონაწერი napr.gov.ge-დან.</p>
          <p style={{fontSize:12,color:C.dim,marginTop:0}}>სისტემა მოძებნის თქვენს პირად ნომერს <strong style={{color:C.gold}}>({profile?.personal_number})</strong>. თანასაკუთრებაც მუშაობს.</p>
          <FileUpload label="ამონაწერი (PDF ან JPG/PNG)" accept="image/*,.pdf" file={extractFile} onChange={setExtractFile}/>
          {extractResult&&!extractResult.found&&<div style={{background:C.redDim,borderRadius:8,padding:"8px 12px",marginBottom:8,fontSize:12,color:C.red}}>პირადი ნომერი ამონაწერში ვერ მოიძებნა</div>}
          {error&&<p style={{color:C.red,fontSize:13,margin:"0 0 10px"}}>{error}</p>}
          <button onClick={handleVerifyExtract} disabled={loading||!extractFile} style={btn({width:"100%",background:C.goldDim,border:`1px solid ${C.borderGold}`,color:C.gold,opacity:(loading||!extractFile)?0.5:1})}>
            {loading?"მოწმდება...":"გადამოწმება"}
          </button>
        </div>
      )}

      {step===2&&(
        <div>
          <div style={{background:C.greenDim,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:"10px 14px",marginBottom:"1rem",fontSize:13,color:C.green,fontWeight:600}}>✓ ვერიფიკაცია გავლილია</div>
          {extractResult?.allOwners?.length>1&&<div style={{background:C.blueDim,border:"1px solid rgba(91,157,224,.3)",borderRadius:8,padding:"8px 12px",marginBottom:"1rem",fontSize:12,color:C.blue}}>თანამფლობელები: {extractResult.allOwners.join(", ")}</div>}
          <p style={{fontSize:12,color:C.dim,margin:"0 0 8px"}}>* სავალდებულო</p>
          {[["title","* სათაური"],["price","* ფასი ($)"],["area","* ფართი (მ²)"],["floor","სართული"],["rooms","ოთახები"],["cadastral","საკადასტრო კოდი"]].map(([key,ph])=>(
            <input key={key} placeholder={ph} value={listing[key]} onChange={e=>setListing(l=>({...l,[key]:e.target.value}))} style={inp}/>
          ))}
          <select value={listing.saleType} onChange={e=>setListing(l=>({...l,saleType:e.target.value}))} style={inp}>{SALE_TYPES.map(t=><option key={t}>{t}</option>)}</select>
          <select value={listing.region} onChange={e=>setListing(l=>({...l,region:e.target.value}))} style={inp}>{REGIONS.map(r=><option key={r}>{r}</option>)}</select>
          <select value={listing.type} onChange={e=>setListing(l=>({...l,type:e.target.value}))} style={inp}>{TYPES.map(t=><option key={t}>{t}</option>)}</select>
          <textarea placeholder="აღწერა" value={listing.description} onChange={e=>setListing(l=>({...l,description:e.target.value}))} style={{...inp,height:70,resize:"vertical"}}/>

          {/* კოორდინატები */}
          <div style={{background:C.surface2,borderRadius:8,padding:"10px 12px",marginBottom:8}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:6}}>📍 მდებარეობა (სურვილისამებრ)</div>
            <input placeholder="Google Maps ლინკი ან maps.gov.ge ლინკი" value={listing.mapsLink} onChange={e=>handleMapsLink(e.target.value)} style={inp}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <input placeholder="Latitude (41.71...)" value={listing.lat} onChange={e=>setListing(l=>({...l,lat:e.target.value}))} style={inp}/>
              <input placeholder="Longitude (44.78...)" value={listing.lng} onChange={e=>setListing(l=>({...l,lng:e.target.value}))} style={inp}/>
            </div>
            {listing.lat&&listing.lng&&<p style={{fontSize:11,color:C.green,margin:0}}>✓ კოორდინატები: {parseFloat(listing.lat).toFixed(4)}, {parseFloat(listing.lng).toFixed(4)}</p>}
          </div>

          <FileUpload label="ფოტოები (max 5)" accept="image/*" file={photos.length>0?photos:null} onChange={files=>setPhotos(Array.isArray(files)?files.slice(0,5):[files])} multiple/>
          {error&&<p style={{color:C.red,fontSize:13,margin:"0 0 10px"}}>{error}</p>}
          <button onClick={handleSubmit} disabled={loading} style={btn({width:"100%",background:C.goldDim,border:`1px solid ${C.borderGold}`,color:C.gold,fontWeight:600,opacity:loading?0.5:1})}>
            {loading?"ინახება...":"განცხადების გაგზავნა (30₾) →"}
          </button>
        </div>
      )}

      {step===3&&(
        <div>
          <div style={{textAlign:"center",padding:"1.5rem 1rem",background:submitted?C.greenDim:C.redDim,border:`1px solid ${submitted?C.greenBorder:"rgba(224,85,85,.3)"}`,borderRadius:12,marginBottom:"1.5rem"}}>
            <p style={{fontSize:40,margin:"0 0 6px"}}>{submitted?"✓":"✗"}</p>
            <p style={{fontSize:17,fontWeight:700,margin:"0 0 6px",color:submitted?C.green:C.red}}>
              {submitted?"განცხადება გაგზავნილია!":"შეცდომა"}
            </p>
            <p style={{fontSize:12,color:C.muted,margin:0}}>
              {submitted?"ადმინი გადაამოწმებს და 24 საათში გამოქვეყნდება":"სცადეთ თავიდან"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("feed");
  const [detail,setDetail]=useState(null);
  const [listings,setListings]=useState([]);
  const [loading,setLoading]=useState(false);
  const [filterRegion,setFilterRegion]=useState("ყველა");
  const [filterType,setFilterType]=useState("ყველა");
  const [filterSale,setFilterSale]=useState("ყველა");
  const [toast,setToast]=useState(null);
  const [user,setUser]=useState(null);
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(null);

  const showToast=(msg)=>{setToast(msg);setTimeout(()=>setToast(null),4000);};

  const loadListings=useCallback(async()=>{
    setLoading(true);
    try{const res=await fetch("/.netlify/functions/verify");const data=await res.json();setListings(Array.isArray(data)?data:[]);}
    catch{setListings([]);}
    setLoading(false);
  },[]);

  useEffect(()=>{
    const saved=localStorage.getItem("p2p_session");
    if(saved){
      try{
        const s=JSON.parse(saved);
        setSession(s);setUser(s.user);
        api({action:"get_profile",token:s.access_token}).then(d=>{
          if(d.profile)setProfile(d.profile);
          else{localStorage.removeItem("p2p_session");setSession(null);setUser(null);}
        });
      }catch{localStorage.removeItem("p2p_session");}
    }
  },[]);

  useEffect(()=>{if(["feed","map","alerts","stats"].includes(tab))loadListings();},[tab]);

  const handleLogin=(u,s)=>{
    setUser(u);setSession(s);
    localStorage.setItem("p2p_session",JSON.stringify({...s,user:u}));
    api({action:"get_profile",token:s?.access_token||s?.session?.access_token}).then(d=>{if(d.profile)setProfile(d.profile);});
    setTab("feed");showToast("✅ მოგესალმებით!");
  };

  const handleLogout=()=>{
    setUser(null);setSession(null);setProfile(null);
    localStorage.removeItem("p2p_session");
    setTab("feed");
  };

  const filtered=listings.filter(l=>(filterRegion==="ყველა"||l.region===filterRegion)&&(filterType==="ყველა"||l.type===filterType)&&(filterSale==="ყველა"||(l.sale_type||"იყიდება")===filterSale));

  const TABS=[
    {id:"feed",icon:"🏠",label:"ლენტი"},
    {id:"map",icon:"🗺",label:"რუკა"},
    {id:"alerts",icon:"🔔",label:"სიგნალი"},
    {id:"post",icon:"➕",label:"დამატება"},
    {id:"stats",icon:"📊",label:"სტატ."},
    {id:"profile",icon:"👤",label:user?"პროფ.":"შესვლა"},
    {id:"admin",icon:"🔐",label:""},
  ];

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text}}>
      <header style={{background:"rgba(8,11,20,.96)",borderBottom:`1px solid ${C.border}`,padding:"0 12px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:100,backdropFilter:"blur(14px)"}}>
        <div onClick={()=>{setTab("feed");setDetail(null);}} style={{cursor:"pointer"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:C.gold,lineHeight:1}}>პარტნიორი</div>
          <div style={{fontSize:8,color:C.dim,letterSpacing:2,textTransform:"uppercase"}}>P2P · Cadastral</div>
        </div>
        <nav style={{display:"flex",gap:2,flexWrap:"wrap"}}>
          {TABS.filter(t=>t.label).map(t=>(
            <button key={t.id} onClick={()=>{setTab(t.id);setDetail(null);}} style={{padding:"5px 7px",borderRadius:7,fontSize:11,border:`1px solid ${tab===t.id?C.gold:C.border}`,background:tab===t.id?C.goldDim:"transparent",color:tab===t.id?C.gold:C.muted,cursor:"pointer"}}>
              {t.icon} {t.label}
            </button>
          ))}
          <button onClick={()=>{setTab("admin");setDetail(null);}} style={{padding:"5px 7px",borderRadius:7,fontSize:11,border:`1px solid ${tab==="admin"?C.gold:C.border}`,background:tab==="admin"?C.goldDim:"transparent",color:tab==="admin"?C.gold:C.dim,cursor:"pointer"}}>🔐</button>
        </nav>
      </header>

      {toast&&<div style={{position:"fixed",top:62,left:"50%",transform:"translateX(-50%)",zIndex:200,background:C.surface,border:`1px solid ${C.borderGold}`,padding:"10px 18px",borderRadius:10,fontWeight:600,fontSize:13,boxShadow:"0 8px 28px rgba(0,0,0,.5)",whiteSpace:"nowrap",color:C.text}}>{toast}</div>}

      {tab==="feed"&&!detail&&(
        <div style={{maxWidth:560,margin:"0 auto",padding:"1rem"}}>
          <div style={{display:"flex",gap:6,marginBottom:"1rem",flexWrap:"wrap"}}>
            <select value={filterSale} onChange={e=>setFilterSale(e.target.value)} style={{padding:"8px 10px",border:`1px solid ${C.border}`,borderRadius:8,background:C.surface2,color:C.text,fontSize:12,flex:1,minWidth:80}}>
              <option>ყველა</option>{SALE_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
            <select value={filterRegion} onChange={e=>setFilterRegion(e.target.value)} style={{padding:"8px 10px",border:`1px solid ${C.border}`,borderRadius:8,background:C.surface2,color:C.text,fontSize:12,flex:1,minWidth:90}}>
              <option>ყველა</option>{REGIONS.map(r=><option key={r}>{r}</option>)}
            </select>
            <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{padding:"8px 10px",border:`1px solid ${C.border}`,borderRadius:8,background:C.surface2,color:C.text,fontSize:12,flex:1,minWidth:80}}>
              <option>ყველა</option>{TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
            <button onClick={loadListings} style={{padding:"8px 10px",border:`1px solid ${C.border}`,borderRadius:8,background:C.surface,color:C.muted,cursor:"pointer"}}>↻</button>
          </div>
          {loading?<p style={{textAlign:"center",color:C.muted,padding:"2rem"}}>იტვირთება...</p>
            :filtered.length===0?<div style={{textAlign:"center",padding:"3rem 0",color:C.muted}}><p style={{fontSize:32,margin:"0 0 8px"}}>🏠</p><p>განცხადებები არ არის</p></div>
            :filtered.map(l=><ListingCard key={l.id} l={l} onClick={()=>setDetail(l)}/>)}
        </div>
      )}
      {tab==="feed"&&detail&&<DetailView l={detail} onBack={()=>setDetail(null)}/>}
      {tab==="map"&&<MapView listings={listings} onDetail={l=>{setDetail(l);setTab("feed");}}/>}
      {tab==="alerts"&&<AlertsView listings={listings}/>}
      {tab==="stats"&&<StatsView listings={listings}/>}
      {tab==="admin"&&<AdminView/>}
      {tab==="profile"&&(
        user
          ? <ProfileView user={user} session={session} profile={profile} onLogout={handleLogout} onRefresh={()=>{}}/>
          : <AuthView onLogin={handleLogin}/>
      )}
      {tab==="post"&&(
        user
          ? <PostView user={user} session={session} profile={profile} showToast={showToast}/>
          : <div style={{maxWidth:400,margin:"60px auto",padding:"1rem",textAlign:"center"}}>
              <p style={{color:C.muted,marginBottom:"1rem",fontSize:14}}>განცხადების დამატებისთვის საჭიროა შესვლა</p>
              <button onClick={()=>setTab("profile")} style={{padding:"12px 24px",background:C.goldDim,border:`1px solid ${C.borderGold}`,borderRadius:8,color:C.gold,fontWeight:600,cursor:"pointer",fontSize:14}}>
                შესვლა / რეგისტრაცია →
              </button>
            </div>
      )}
    </div>
  );
}
