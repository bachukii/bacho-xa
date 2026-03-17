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

function norm(s){return (s||"").trim().toLowerCase();}

const inp = {width:"100%",marginBottom:8,padding:"10px 14px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:14,boxSizing:"border-box",outline:"none",background:C.surface2,color:C.text};
const btn = (x={})=>({padding:"10px 16px",border:`1px solid ${C.border}`,borderRadius:8,background:C.surface,cursor:"pointer",fontSize:14,fontWeight:500,color:C.text,...x});

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

function StepBar({current}){
  const steps=["რეგისტრაცია","პირადობა","ამონაწერი","განცხადება","შედეგი"];
  return(
    <div style={{display:"flex",marginBottom:"1.5rem"}}>
      {steps.map((s,i)=>(
        <div key={i} style={{flex:1,textAlign:"center"}}>
          <div style={{width:28,height:28,borderRadius:"50%",margin:"0 auto 4px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:500,
            background:i<current?C.greenDim:i===current?C.blueDim:C.surface2,
            color:i<current?C.green:i===current?C.blue:C.muted,
            border:`1px solid ${i<current?C.greenBorder:i===current?"rgba(91,157,224,.4)":C.border}`}}>
            {i<current?"✓":i+1}
          </div>
          <p style={{fontSize:10,margin:0,color:i===current?C.text:C.muted}}>{s}</p>
        </div>
      ))}
    </div>
  );
}

function FileUpload({label,accept,file,onChange,multiple}){
  const ref=useRef();
  return(
    <div onClick={()=>ref.current.click()} style={{border:`1.5px dashed ${C.dim}`,borderRadius:12,padding:"1.25rem",textAlign:"center",cursor:"pointer",background:C.surface2,marginBottom:"1rem"}}>
      <input ref={ref} type="file" accept={accept} multiple={multiple} style={{display:"none"}} onChange={e=>onChange(multiple?Array.from(e.target.files):e.target.files[0])}/>
      {file
        ? <p style={{margin:0,fontSize:13,color:C.green}}>✓ {Array.isArray(file)?`${file.length} ფოტო`:file.name}</p>
        : <div><p style={{margin:"0 0 3px",fontSize:20,color:C.muted}}>+</p><p style={{margin:0,fontSize:13,color:C.muted}}>{label}</p></div>
      }
    </div>
  );
}

function MiniMap({lat,lng,height=180}){
  const ref=useRef();
  useEffect(()=>{
    if(!lat||!lng||!window.L)return;
    const map=window.L.map(ref.current,{zoomControl:false,dragging:false,scrollWheelZoom:false}).setView([lat,lng],16);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
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
      m.bindPopup(`<b>${l.title}</b><br/>${l.price}$`);
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
            <Badge verified={l.status==="approved"||l.verified}/>
            <TypeChip type={l.sale_type||"იყიდება"}/>
          </div>
          <p style={{margin:"0 0 3px",fontWeight:600,fontSize:15,color:C.text}}>{l.title}</p>
          <p style={{margin:"0 0 3px",fontSize:12,color:C.muted}}>
            {l.region||l.district} · {l.type} · {l.area}მ²
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
  return(
    <div style={{maxWidth:560,margin:"0 auto",padding:"1rem"}}>
      <button onClick={onBack} style={btn({marginBottom:"1rem",padding:"6px 12px",fontSize:13})}>← უკან</button>
      {l.photos&&l.photos.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:l.photos.length>1?"1fr 1fr":"1fr",gap:6,marginBottom:12}}>
          {l.photos.map((p,i)=><img key={i} src={p} alt="" style={{width:"100%",height:160,objectFit:"cover",borderRadius:8}}/>)}
        </div>
      )}
      <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        <Badge verified={l.status==="approved"||l.verified}/>
        <TypeChip type={l.sale_type||"იყიდება"}/>
      </div>
      <h2 style={{margin:"0 0 6px",fontSize:20,fontWeight:700,color:C.text}}>{l.title}</h2>
      <p style={{margin:"0 0 12px",fontSize:22,fontWeight:700,color:C.gold}}>{l.price}$</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        {[["📍 რაიონი",l.region||l.district],["🏢 ტიპი",l.type],["📐 ფართი",`${l.area}მ²`],["🏗 სართული",l.floor||"—"],["🛏 ოთახები",l.rooms||"—"],["📞 ტელეფონი",l.phone||"—"]].map(([k,v])=>(
          <div key={k} style={{background:C.surface2,borderRadius:8,padding:"8px 10px"}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:2}}>{k}</div>
            <div style={{fontSize:14,fontWeight:500}}>{v}</div>
          </div>
        ))}
      </div>
      {l.cadastral_code&&(
        <div style={{background:C.tealDim,border:`1px solid ${C.tealBorder}`,borderRadius:8,padding:"8px 12px",marginBottom:12}}>
          <span style={{fontSize:12,color:C.teal}}>🗺 საკადასტრო კოდი: <strong>{l.cadastral_code}</strong></span>
        </div>
      )}
      {l.description&&<p style={{color:C.muted,fontSize:13,lineHeight:1.6,marginBottom:12}}>{l.description}</p>}
      <MiniMap lat={l.lat||coords?.lat} lng={l.lng||coords?.lng}/>
      {l.phone&&(
        <a href={`tel:${l.phone}`} style={{display:"block",textAlign:"center",padding:"12px",background:C.goldDim,border:`1px solid ${C.borderGold}`,borderRadius:10,color:C.gold,fontWeight:700,fontSize:15,textDecoration:"none"}}>
          📞 გამყიდველს დარეკვა
        </a>
      )}
    </div>
  );
}

function AlertsView({listings}){
  const [filters,setFilters]=useState({type:"ყველა",maxPrice:"",minArea:"",region:"ყველა"});
  const [saved,setSaved]=useState(false);
  const matched=listings.filter(l=>{
    if(l.status!=="approved"&&!l.verified)return false;
    if(filters.type!=="ყველა"&&(l.sale_type||"იყიდება")!==filters.type)return false;
    if(filters.maxPrice&&l.price>Number(filters.maxPrice))return false;
    if(filters.minArea&&l.area<Number(filters.minArea))return false;
    if(filters.region!=="ყველა"&&l.region!==filters.region)return false;
    return true;
  });
  return(
    <div style={{maxWidth:560,margin:"0 auto",padding:"1rem"}}>
      <h2 style={{margin:"0 0 6px",fontSize:18,fontWeight:600,color:C.text}}>🔔 სიგნალები</h2>
      <p style={{margin:"0 0 16px",fontSize:12,color:C.muted}}>დააყენე ფილტრი — შესაბამისი განცხადება = შეტყობინება</p>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"1rem",marginBottom:"1rem"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <select value={filters.type} onChange={e=>setFilters(p=>({...p,type:e.target.value}))} style={inp}>
            <option>ყველა</option>{SALE_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <select value={filters.region} onChange={e=>setFilters(p=>({...p,region:e.target.value}))} style={inp}>
            <option>ყველა</option>{REGIONS.map(r=><option key={r}>{r}</option>)}
          </select>
          <input placeholder="მაქს. ფასი ($)" value={filters.maxPrice} onChange={e=>setFilters(p=>({...p,maxPrice:e.target.value}))} style={inp}/>
          <input placeholder="მინ. ფართი (მ²)" value={filters.minArea} onChange={e=>setFilters(p=>({...p,minArea:e.target.value}))} style={inp}/>
        </div>
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
  const approved=listings.filter(l=>l.status==="approved"||l.verified);
  const withCad=approved.filter(l=>l.cadastral_code);
  const total=approved.length||1;
  const byRegion=REGIONS.map(r=>({name:r,count:approved.filter(l=>l.region===r).length})).filter(d=>d.count>0);
  const maxCount=Math.max(...byRegion.map(d=>d.count),1);
  const avgPrice=approved.length?Math.round(approved.reduce((s,l)=>s+(l.price||0),0)/approved.length):0;
  const savedCommission=Math.round(approved.reduce((s,l)=>s+(l.price||0)*0.03,0));
  return(
    <div style={{maxWidth:560,margin:"0 auto",padding:"1rem"}}>
      <h2 style={{margin:"0 0 16px",fontSize:18,fontWeight:600}}>📊 სტატისტიკა</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[["სულ განცხადება",approved.length,C.gold],["საკადასტრო",withCad.length,C.teal],["საშ. ფასი",`${avgPrice}$`,C.blue],["დაზოგული კომის.",`${savedCommission}$`,C.green]].map(([l,v,c])=>(
          <div key={l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:11,padding:"14px 16px"}}>
            <div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:.4,marginBottom:4}}>{l}</div>
            <div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:13,padding:"1rem",marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>📍 რაიონები</div>
        {byRegion.length===0?<p style={{color:C.muted,fontSize:12}}>მონაცემები არ არის</p>:byRegion.map(d=>(
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
          <div style={{position:"relative",width:110,height:110}}>
            <svg viewBox="0 0 100 100" style={{transform:"rotate(-90deg)",width:"100%",height:"100%"}}>
              <circle cx="50" cy="50" r="40" fill="none" stroke={C.surface2} strokeWidth="14"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke={C.teal} strokeWidth="14" strokeDasharray={`${withCad.length/total*251.2} 251.2`} strokeLinecap="round"/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <div style={{fontSize:18,fontWeight:700,color:C.teal}}>{Math.round(withCad.length/total*100)}%</div>
              <div style={{fontSize:9,color:C.muted}}>კადასტრი</div>
            </div>
          </div>
        </div>
        <div style={{textAlign:"center",fontSize:12,color:C.muted}}>
          <strong style={{color:C.teal}}>{withCad.length}</strong> კადასტრი · <strong style={{color:C.green}}>{approved.length}</strong> ვერიფიც.
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

  const login=async()=>{
    setLoading(true);
    try{
      const res=await fetch("/.netlify/functions/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"get_pending",password:pass})});
      const data=await res.json();
      if(data.error)setMsg(data.error);
      else{setPending(data);setAuth(true);}
    }catch(e){setMsg(e.message);}
    setLoading(false);
  };

  const update=async(id,status)=>{
    await fetch("/.netlify/functions/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"admin_update",password:pass,id,status})});
    setPending(p=>p.filter(l=>l.id!==id));
  };

  if(!auth)return(
    <div style={{maxWidth:360,margin:"60px auto",padding:"1rem"}}>
      <h2 style={{margin:"0 0 16px",color:C.gold}}>🔐 ადმინ პანელი</h2>
      <input type="password" placeholder="პაროლი" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} style={inp}/>
      {msg&&<p style={{color:C.red,fontSize:13,margin:"0 0 8px"}}>{msg}</p>}
      <button onClick={login} disabled={loading} style={btn({width:"100%",background:C.goldDim,border:`1px solid ${C.borderGold}`,color:C.gold})}>
        {loading?"...":"შესვლა"}
      </button>
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
          {l.cadastral_code&&<p style={{fontSize:11,color:C.teal,marginBottom:8}}>🗺 {l.cadastral_code}</p>}
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>update(l.id,"approved")} style={btn({flex:1,background:C.greenDim,border:`1px solid ${C.greenBorder}`,color:C.green,fontWeight:600})}>✓ Approve</button>
            <button onClick={()=>update(l.id,"rejected")} style={btn({flex:1,background:C.redDim,border:"1px solid rgba(224,85,85,.3)",color:C.red})}>✗ Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App(){
  const [tab,setTab]=useState("feed");
  const [detail,setDetail]=useState(null);
  const [listings,setListings]=useState([]);
  const [loading,setLoading]=useState(false);
  const [filterRegion,setFilterRegion]=useState("ყველა");
  const [filterType,setFilterType]=useState("ყველა");
  const [filterSale,setFilterSale]=useState("ყველა");
  const [toast,setToast]=useState(null);

  const [step,setStep]=useState(0);
  const [form,setForm]=useState({firstName:"",lastName:"",personalNumber:"",phone:""});
  const [listing,setListing]=useState({title:"",price:"",area:"",floor:"",rooms:"",region:"თბილისი",type:"ბინა",saleType:"იყიდება",description:"",cadastral:""});
  const [photos,setPhotos]=useState([]);
  const [idFile,setIdFile]=useState(null);
  const [extractFile,setExtractFile]=useState(null);
  const [idValid,setIdValid]=useState(false);
  const [idConfirmed,setIdConfirmed]=useState(false);
  const [extractResult,setExtractResult]=useState(null);
  const [verifyLoading,setVerifyLoading]=useState(false);
  const [verifyError,setVerifyError]=useState("");
  const [submitted,setSubmitted]=useState(false);

  const showToast=(msg)=>{setToast(msg);setTimeout(()=>setToast(null),4000);};

  const loadListings=useCallback(async()=>{
    setLoading(true);
    try{const res=await fetch("/.netlify/functions/verify");const data=await res.json();setListings(Array.isArray(data)?data:[]);}
    catch{setListings([]);}
    setLoading(false);
  },[]);

  useEffect(()=>{if(["feed","map","alerts","stats"].includes(tab))loadListings();},[tab]);

  const fileToBase64=(file)=>new Promise((res,rej)=>{
    if(file.type.includes("pdf")){const r=new FileReader();r.onload=()=>res({base64:r.result.split(",")[1],mediaType:"application/pdf"});r.onerror=rej;r.readAsDataURL(file);return;}
    const img=new Image();const url=URL.createObjectURL(file);
    img.onload=()=>{const canvas=document.createElement("canvas");const max=1200;let w=img.width,h=img.height;if(w>max){h=Math.round(h*max/w);w=max;}canvas.width=w;canvas.height=h;canvas.getContext("2d").drawImage(img,0,0,w,h);res({base64:canvas.toDataURL("image/jpeg",0.85).split(",")[1],mediaType:"image/jpeg"});URL.revokeObjectURL(url);};
    img.onerror=rej;img.src=url;
  });

  const callClaude=async(file,prompt)=>{
    const{base64,mediaType}=await fileToBase64(file);
    const contentItem=mediaType==="application/pdf"?{type:"document",source:{type:"base64",media_type:mediaType,data:base64}}:{type:"image",source:{type:"base64",media_type:mediaType,data:base64}};
    const res=await fetch("/.netlify/functions/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:[contentItem,{type:"text",text:prompt}]}]})});
    const data=await res.json();
    if(data.error)throw new Error(data.error.message);
    const text=data.content.map(c=>c.text||"").join("");
    const jsonMatch=text.match(/\{[\s\S]*\}/);
    if(!jsonMatch)throw new Error("AI პასუხი: "+text.substring(0,120));
    return JSON.parse(jsonMatch[0]);
  };

  const handleReg=()=>{
    if(!form.firstName||!form.lastName||!form.personalNumber||!form.phone){setVerifyError("შეავსეთ ყველა ველი");return;}
    if(!/^\d{11}$/.test(form.personalNumber)){setVerifyError("პირადი ნომერი — 11 ციფრი");return;}
    setVerifyError("");setStep(1);
  };

  // Step 1: მხოლოდ ამოწმებს - ეს ნამდვილი ID-ია?
  const handleCheckId=async()=>{
    if(!idFile){setVerifyError("ატვირთეთ დოკუმენტი");return;}
    setVerifyLoading(true);setVerifyError("");
    try{
      const r=await callClaude(idFile,
        `Look at this image. Is this a valid Georgian government-issued identity document (ID card or passport)?
Answer ONLY with JSON: {"isValidDocument":true}  or  {"isValidDocument":false}
Do not extract or mention any personal information.`
      );
      if(r.isValidDocument){setIdValid(true);}
      else{setVerifyError("ეს ნამდვილი ID დოკუმენტი არ ჩანს — სცადეთ სხვა ფოტო");}
    }catch(e){setVerifyError(e.message);}
    setVerifyLoading(false);
  };

  // Step 2: ამონაწერი - Claude ეძებს პირად ნომერს ტექსტში
  const handleVerifyExtract=async()=>{
    if(!extractFile){setVerifyError("ატვირთეთ ამონაწერი");return;}
    setVerifyLoading(true);setVerifyError("");
    try{
      const pn=form.personalNumber;
      const r=await callClaude(extractFile,
        `This is a Georgian property document. Search the visible text for the number sequence "${pn}".
Does this exact number appear anywhere in the document?
Answer ONLY with JSON:
{"documentVisible":true,"numberFound":true,"cadastralCode":"code if visible or null","allOwnerNumbers":["number1","number2"]}`
      );
      setExtractResult(r);
      if(r.numberFound){
        setListing(l=>({...l,cadastral:r.cadastralCode||""}));
        setStep(3);
      } else {
        setVerifyError("პირადი ნომერი ამონაწერში ვერ მოიძებნა — დარწმუნდით რომ სწორი ამონაწერია");
      }
    }catch(e){setVerifyError(e.message);}
    setVerifyLoading(false);
  };

  const uploadPhoto=async(file,listingId)=>{
    const{base64,mediaType}=await fileToBase64(file);
    const fileName=`${listingId}/${Date.now()}.jpg`;
    const res=await fetch("/.netlify/functions/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"upload_photo",fileName,fileData:base64,contentType:mediaType})});
    const data=await res.json();
    return data.url;
  };

  const handleSubmitListing=async()=>{
    if(!listing.title||!listing.price||!listing.area){setVerifyError("შეავსეთ სავალდებულო ველები (*)");return;}
    setVerifyLoading(true);setVerifyError("");
    try{
      const res=await fetch("/.netlify/functions/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save_listing",data:{first_name:form.firstName,last_name:form.lastName,personal_number:form.personalNumber,phone:form.phone,cadastral_code:listing.cadastral,title:listing.title,price:parseFloat(listing.price),area:parseFloat(listing.area),floor:listing.floor,rooms:listing.rooms,region:listing.region,type:listing.type,sale_type:listing.saleType,description:listing.description,status:"pending",photos:[]}})});
      const data=await res.json();
      if(!data.success)throw new Error(data.error||"შეცდომა");
      if(photos.length>0&&data.id){
        const urls=await Promise.all(photos.map(f=>uploadPhoto(f,data.id)));
        await fetch("/.netlify/functions/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"update_listing",id:data.id,photos:urls,status:"pending"})});
      }
      setSubmitted(true);setStep(4);
      showToast("✅ განცხადება გაგზავნილია!");
    }catch(e){setVerifyError(e.message);}
    setVerifyLoading(false);
  };

  const resetSell=()=>{setStep(0);setForm({firstName:"",lastName:"",personalNumber:"",phone:""});setListing({title:"",price:"",area:"",floor:"",rooms:"",region:"თბილისი",type:"ბინა",saleType:"იყიდება",description:"",cadastral:""});setPhotos([]);setIdFile(null);setExtractFile(null);setIdValid(false);setIdConfirmed(false);setExtractResult(null);setSubmitted(false);setVerifyError("");setTab("feed");};

  const filtered=listings.filter(l=>(filterRegion==="ყველა"||l.region===filterRegion)&&(filterType==="ყველა"||l.type===filterType)&&(filterSale==="ყველა"||(l.sale_type||"იყიდება")===filterSale));
  const TABS=[{id:"feed",icon:"🏠",label:"ლენტი"},{id:"map",icon:"🗺",label:"რუკა"},{id:"alerts",icon:"🔔",label:"სიგნალი"},{id:"post",icon:"➕",label:"დამატება"},{id:"stats",icon:"📊",label:"სტატ."},{id:"admin",icon:"🔐",label:"ადმინი"}];

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text}}>
      <header style={{background:"rgba(8,11,20,.96)",borderBottom:`1px solid ${C.border}`,padding:"0 12px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:100,backdropFilter:"blur(14px)"}}>
        <div onClick={()=>{setTab("feed");setDetail(null);}} style={{cursor:"pointer"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:C.gold,lineHeight:1}}>პარტნიორი</div>
          <div style={{fontSize:8,color:C.dim,letterSpacing:2,textTransform:"uppercase"}}>P2P · Cadastral</div>
        </div>
        <nav style={{display:"flex",gap:2,flexWrap:"wrap"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>{setTab(t.id);setDetail(null);}} style={{padding:"5px 7px",borderRadius:7,fontSize:11,border:`1px solid ${tab===t.id?C.gold:C.border}`,background:tab===t.id?C.goldDim:"transparent",color:tab===t.id?C.gold:C.muted,cursor:"pointer"}}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
      </header>

      {toast&&<div style={{position:"fixed",top:62,left:"50%",transform:"translateX(-50%)",zIndex:200,background:C.surface,border:`1px solid ${C.borderGold}`,padding:"10px 18px",borderRadius:10,fontWeight:600,fontSize:13,boxShadow:"0 8px 28px rgba(0,0,0,.5)",whiteSpace:"nowrap",color:C.text}}>{toast}</div>}

      {tab==="feed"&&!detail&&(
        <div style={{maxWidth:560,margin:"0 auto",padding:"1rem"}}>
          <div style={{display:"flex",gap:6,marginBottom:"1rem",flexWrap:"wrap"}}>
            <select value={filterSale} onChange={e=>setFilterSale(e.target.value)} style={{...inp,marginBottom:0,flex:1,minWidth:90}}>
              <option>ყველა</option>{SALE_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
            <select value={filterRegion} onChange={e=>setFilterRegion(e.target.value)} style={{...inp,marginBottom:0,flex:1,minWidth:100}}>
              <option>ყველა</option>{REGIONS.map(r=><option key={r}>{r}</option>)}
            </select>
            <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{...inp,marginBottom:0,flex:1,minWidth:90}}>
              <option>ყველა</option>{TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
            <button onClick={loadListings} style={btn({padding:"8px 10px"})}>↻</button>
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

      {tab==="post"&&(
        <div style={{maxWidth:480,margin:"0 auto",padding:"1.5rem 1rem"}}>
          <h2 style={{margin:"0 0 1.5rem",fontSize:18,fontWeight:600}}>➕ განცხადების დამატება</h2>
          <StepBar current={step}/>

          {step===0&&(
            <div>
              <p style={{fontSize:12,color:C.muted,margin:"0 0 12px"}}>სახელი/გვარი ქართულად ან ლათინურად</p>
              {[["firstName","სახელი"],["lastName","გვარი"],["personalNumber","პირადი ნომერი (11 ციფრი)"],["phone","ტელეფონი (+995...)"]].map(([key,ph])=>(
                <input key={key} placeholder={ph} value={form[key]} maxLength={key==="personalNumber"?11:undefined} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} style={inp}/>
              ))}
              {verifyError&&<p style={{color:C.red,fontSize:13,margin:"0 0 10px"}}>{verifyError}</p>}
              <button onClick={handleReg} style={btn({width:"100%",background:C.goldDim,border:`1px solid ${C.borderGold}`,color:C.gold,fontWeight:600})}>გაგრძელება →</button>
            </div>
          )}

          {step===1&&(
            <div>
              <p style={{fontSize:13,color:C.muted,marginTop:0}}>ატვირთეთ პირადობის მოწმობა ან პასპორტი.</p>
              <FileUpload label="JPG, PNG ან PDF" accept="image/*,.pdf" file={idFile} onChange={f=>{setIdFile(f);setIdValid(false);setIdConfirmed(false);}}/>

              {!idValid&&(
                <>
                  {verifyError&&<p style={{color:C.red,fontSize:13,margin:"0 0 10px"}}>{verifyError}</p>}
                  <button onClick={handleCheckId} disabled={verifyLoading||!idFile} style={btn({width:"100%",opacity:(verifyLoading||!idFile)?0.5:1})}>
                    {verifyLoading?"მოწმდება...":"✓ დოკუმენტის შემოწმება"}
                  </button>
                </>
              )}

              {idValid&&!idConfirmed&&(
                <div style={{background:C.greenDim,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:"14px",marginBottom:"1rem"}}>
                  <p style={{margin:"0 0 10px",fontSize:13,fontWeight:600,color:C.green}}>✓ ნამდვილი ქართული ID დოკუმენტი</p>
                  <p style={{margin:"0 0 12px",fontSize:12,color:C.muted}}>გთხოვთ დაადასტუროთ რომ ფოტოში თქვენი მონაცემები ემთხვევა რეგისტრაციის მონაცემებს:</p>
                  <div style={{background:C.surface2,borderRadius:8,padding:"10px 12px",marginBottom:12,fontSize:13}}>
                    <div><span style={{color:C.muted}}>სახელი: </span><strong>{form.firstName}</strong></div>
                    <div><span style={{color:C.muted}}>გვარი: </span><strong>{form.lastName}</strong></div>
                    <div><span style={{color:C.muted}}>პირადი №: </span><strong>{form.personalNumber}</strong></div>
                  </div>
                  <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom:12}}>
                    <input type="checkbox" onChange={e=>setIdConfirmed(e.target.checked)} style={{width:18,height:18,cursor:"pointer"}}/>
                    <span style={{fontSize:13,color:C.text}}>დიახ, ფოტოში ჩემი მონაცემებია და ისინი ემთხვევა ზემოთ მითითებულს</span>
                  </label>
                  <button onClick={()=>{setVerifyError("");setStep(2);}} disabled={!idConfirmed} style={btn({width:"100%",background:C.goldDim,border:`1px solid ${C.borderGold}`,color:C.gold,opacity:idConfirmed?1:0.4})}>
                    გაგრძელება →
                  </button>
                </div>
              )}
            </div>
          )}

          {step===2&&(
            <div>
              <p style={{fontSize:13,color:C.muted,marginTop:0}}>ატვირთეთ საჯარო რეესტრის ამონაწერი napr.gov.ge-დან.</p>
              <p style={{fontSize:12,color:C.dim,marginTop:0}}>AI მოძებნის თქვენს პირად ნომერს <strong style={{color:C.gold}}>({form.personalNumber})</strong> ამონაწერში.</p>
              <FileUpload label="PDF ან JPG/PNG" accept="image/*,.pdf" file={extractFile} onChange={setExtractFile}/>
              {verifyError&&<p style={{color:C.red,fontSize:13,margin:"0 0 10px"}}>{verifyError}</p>}
              <button onClick={handleVerifyExtract} disabled={verifyLoading||!extractFile} style={btn({width:"100%",background:C.goldDim,border:`1px solid ${C.borderGold}`,color:C.gold,opacity:(verifyLoading||!extractFile)?0.5:1})}>
                {verifyLoading?"იძებნება...":"გადამოწმება"}
              </button>
            </div>
          )}

          {step===3&&(
            <div>
              <div style={{background:C.greenDim,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:"10px 14px",marginBottom:"1rem",fontSize:13,color:C.green,fontWeight:600}}>✓ ვერიფიკაცია გავლილია</div>
              <p style={{fontSize:12,color:C.dim,margin:"0 0 8px"}}>* სავალდებულო</p>
              {[["title","* სათაური"],["price","* ფასი ($)"],["area","* ფართი (მ²)"],["floor","სართული"],["rooms","ოთახები"],["cadastral","საკადასტრო კოდი"]].map(([key,ph])=>(
                <input key={key} placeholder={ph} value={listing[key]} onChange={e=>setListing(l=>({...l,[key]:e.target.value}))} style={inp}/>
              ))}
              <select value={listing.saleType} onChange={e=>setListing(l=>({...l,saleType:e.target.value}))} style={inp}>
                {SALE_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
              <select value={listing.region} onChange={e=>setListing(l=>({...l,region:e.target.value}))} style={inp}>
                {REGIONS.map(r=><option key={r}>{r}</option>)}
              </select>
              <select value={listing.type} onChange={e=>setListing(l=>({...l,type:e.target.value}))} style={inp}>
                {TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
              <textarea placeholder="აღწერა" value={listing.description} onChange={e=>setListing(l=>({...l,description:e.target.value}))} style={{...inp,height:80,resize:"vertical"}}/>
              <FileUpload label="ფოტოები (max 5)" accept="image/*" file={photos.length>0?photos:null} onChange={files=>setPhotos(Array.isArray(files)?files.slice(0,5):[files])} multiple/>
              {verifyError&&<p style={{color:C.red,fontSize:13,margin:"0 0 10px"}}>{verifyError}</p>}
              <button onClick={handleSubmitListing} disabled={verifyLoading} style={btn({width:"100%",background:C.goldDim,border:`1px solid ${C.borderGold}`,color:C.gold,fontWeight:600,opacity:verifyLoading?0.5:1})}>
                {verifyLoading?"ინახება...":"განცხადების გაგზავნა (30₾) →"}
              </button>
            </div>
          )}

          {step===4&&(
            <div>
              <div style={{textAlign:"center",padding:"1.5rem 1rem",background:submitted?C.greenDim:C.redDim,border:`1px solid ${submitted?C.greenBorder:"rgba(224,85,85,.3)"}`,borderRadius:12,marginBottom:"1.5rem"}}>
                <p style={{fontSize:40,margin:"0 0 6px"}}>{submitted?"✓":"✗"}</p>
                <p style={{fontSize:17,fontWeight:700,margin:"0 0 6px",color:submitted?C.green:C.red}}>
                  {submitted?"განცხადება გაგზავნილია!":"ვერიფიკაცია ჩავარდა"}
                </p>
                <p style={{fontSize:12,color:C.muted,margin:0}}>
                  {submitted?"ადმინი გადაამოწმებს და 24 საათში გამოქვეყნდება":"მონაცემები არ ემთხვევა"}
                </p>
              </div>
              <button onClick={resetSell} style={btn({width:"100%"})}>↩ მთავარზე</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
