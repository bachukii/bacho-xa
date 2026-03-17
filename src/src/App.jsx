import { useState, useRef, useEffect } from "react";

const REGIONS = ["თბილისი","რუსთავი","ბათუმი","ქუთაისი","გორი","ზუგდიდი","ფოთი","სხვა"];
const TYPES = ["ბინა","სახლი","მიწა","კომერციული"];

function StepBar({ current }) {
  const steps = ["რეგისტრაცია", "პირადობა", "ამონაწერი", "განცხადება", "შედეგი"];
  return (
    <div style={{ display: "flex", marginBottom: "1.5rem" }}>
      {steps.map((s, i) => (
        <div key={i} style={{ flex: 1, textAlign: "center" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", margin: "0 auto 4px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 500,
            background: i < current ? "#d1fae5" : i === current ? "#dbeafe" : "#f3f4f6",
            color: i < current ? "#065f46" : i === current ? "#1e40af" : "#9ca3af",
            border: `1px solid ${i < current ? "#6ee7b7" : i === current ? "#93c5fd" : "#e5e7eb"}`
          }}>
            {i < current ? "✓" : i + 1}
          </div>
          <p style={{ fontSize: 10, margin: 0, color: i === current ? "#111827" : "#9ca3af" }}>{s}</p>
        </div>
      ))}
    </div>
  );
}

function FileUpload({ label, accept, file, onChange }) {
  const callClaude = async (file, prompt) => {
    const { base64, mediaType } = await fileToBase64(file);
    const contentItem = mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: mediaType, data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };
    const res = await fetch("/.netlify/functions/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: [contentItem, { type: "text", text: prompt }] }]
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.content.map(c => c.text || "").join("");
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error("პასუხი: " + text.substring(0, 100));
    try {
      return JSON.parse(jsonMatch[0]);
    } catch(e) {
      throw new Error("JSON შეცდომა: " + jsonMatch[0].substring(0, 80));
    }
  };

function ListingCard({ listing }) {
  return (
    <div style={{
      border: "1px solid #e5e7eb", borderRadius: 12, padding: "1rem",
      marginBottom: "0.75rem", background: "#fff"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 15 }}>{listing.title}</p>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "#6b7280" }}>
            {listing.region} · {listing.type} · {listing.area} მ²
            {listing.floor ? ` · ${listing.floor} სართ.` : ""}
            {listing.rooms ? ` · ${listing.rooms} ოთ.` : ""}
          </p>
          {listing.description && <p style={{ margin: "0 0 4px", fontSize: 12, color: "#9ca3af" }}>{listing.description}</p>}
        </div>
        <div style={{ textAlign: "right", minWidth: 80 }}>
          <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 16, color: "#1e40af" }}>${listing.price}</p>
          <span style={{ fontSize: 10, background: "#d1fae5", color: "#065f46", padding: "2px 6px", borderRadius: 4 }}>✓ ვერიფ.</span>
        </div>
      </div>
      {listing.cadastral_code && (
        <p style={{ margin: "8px 0 0", fontSize: 11, color: "#9ca3af" }}>საკადასტრო: {listing.cadastral_code}</p>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  const [step, setStep] = useState(0);
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [filterRegion, setFilterRegion] = useState("ყველა");
  const [filterType, setFilterType] = useState("ყველა");

  const [form, setForm] = useState({ firstName: "", lastName: "", personalNumber: "", phone: "" });
  const [listing, setListing] = useState({ title: "", price: "", area: "", floor: "", rooms: "", region: "თბილისი", type: "ბინა", description: "", cadastral: "" });

  const [idFile, setIdFile] = useState(null);
  const [extractFile, setExtractFile] = useState(null);
  const [idResult, setIdResult] = useState(null);
  const [extractResult, setExtractResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const norm = s => (s || "").trim().toLowerCase();
  const nameMatch = (formVal, latin, geo) =>
    norm(formVal) === norm(latin) || norm(formVal) === norm(geo);

  useEffect(() => {
    if (view === "browse") loadListings();
  }, [view]);

  const loadListings = async () => {
    setLoadingListings(true);
    try {
      const res = await fetch("/.netlify/functions/verify");
      const data = await res.json();
      setListings(Array.isArray(data) ? data : []);
    } catch { setListings([]); }
    setLoadingListings(false);
  };

  const fileToBase64 = (file) => new Promise((res, rej) => {
    if (file.type.includes("pdf")) {
      const r = new FileReader();
      r.onload = () => res({ base64: r.result.split(",")[1], mediaType: "application/pdf" });
      r.onerror = rej;
      r.readAsDataURL(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const max = 1200;
      let w = img.width, h = img.height;
      if (w > max) { h = Math.round(h * max / w); w = max; }
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      res({ base64: canvas.toDataURL("image/jpeg", 0.85).split(",")[1], mediaType: "image/jpeg" });
      URL.revokeObjectURL(url);
    };
    img.onerror = rej;
    img.src = url;
  });

  const callClaude = async (file, prompt) => {
    const { base64, mediaType } = await fileToBase64(file);
    const contentItem = mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: mediaType, data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };
    const res = await fetch("/.netlify/functions/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: [contentItem, { type: "text", text: prompt }] }]
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.content.map(c => c.text || "").join("");
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI-მ ვერ ამოიცნო — სცადეთ უფრო მკაფიო ფოტო");
    return JSON.parse(jsonMatch[0]);
  };

  const handleReg = () => {
    if (!form.firstName || !form.lastName || !form.personalNumber || !form.phone) {
      setError("შეავსეთ ყველა ველი"); return;
    }
    if (!/^\d{11}$/.test(form.personalNumber)) {
      setError("პირადი ნომერი — 11 ციფრი"); return;
    }
    setError(""); setStep(1);
  };

  const handleVerifyId = async () => {
    if (!idFile) { setError("ატვირთეთ დოკუმენტი"); return; }
    setLoading(true); setError("");
    try {
      const r = await callClaude(idFile,
        `Georgian ID card or passport. Respond ONLY with JSON:
{"isValidDocument":true,"firstName":"LATIN","lastName":"LATIN","firstNameGeo":"ქართული","lastNameGeo":"ქართული","personalNumber":"11digits"}`
      );
      setIdResult(r);
      if (!r.isValidDocument) setError("დოკუმენტი ვერ დადასტურდა");
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const handleVerifyExtract = async () => {
    if (!extractFile) { setError("ატვირთეთ ამონაწერი"); return; }
    setLoading(true); setError("");
    try {
      const r = await callClaude(extractFile,
        `Georgian public registry extract (napr.gov.ge). There may be multiple owners (თანასაკუთრება).
Find if personal number "${form.personalNumber}" is listed as an owner.
Respond ONLY with JSON:
{"isValidDocument":true,"found":true,"ownerFirstName":"LATIN","ownerLastName":"LATIN","ownerFirstNameGeo":"ქართული","ownerLastNameGeo":"ქართული","ownerPersonalNumber":"11digits","cadastralCode":"CODE","allOwners":["სახელი გვარი"]}`
      );
      setExtractResult(r);
      const idOk = idResult?.isValidDocument &&
        nameMatch(form.firstName, idResult.firstName, idResult.firstNameGeo) &&
        nameMatch(form.lastName, idResult.lastName, idResult.lastNameGeo) &&
        norm(idResult.personalNumber) === norm(form.personalNumber);
      const extractOk = r.isValidDocument && r.found &&
        norm(r.ownerPersonalNumber) === norm(form.personalNumber);
      if (idOk && extractOk) {
        setListing(l => ({ ...l, cadastral: r.cadastralCode || "" }));
        setStep(3);
      } else {
        setStep(4);
      }
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const handleSubmitListing = async () => {
    if (!listing.title || !listing.price || !listing.area) {
      setError("შეავსეთ სავალდებულო ველები (*)"); return;
    }
    setLoading(true); setError("");
    try {
      const res = await fetch("/.netlify/functions/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_listing",
          data: {
            first_name: form.firstName,
            last_name: form.lastName,
            personal_number: form.personalNumber,
            phone: form.phone,
            cadastral_code: listing.cadastral,
            title: listing.title,
            price: parseFloat(listing.price),
            area: parseFloat(listing.area),
            floor: listing.floor,
            rooms: listing.rooms,
            region: listing.region,
            type: listing.type,
            description: listing.description,
            status: "pending",
          }
        })
      });
      const data = await res.json();
      if (data.success) { setSubmitted(true); setStep(4); }
      else throw new Error(data.error || "შეცდომა");
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const resetSell = () => {
    setStep(0);
    setForm({ firstName: "", lastName: "", personalNumber: "", phone: "" });
    setListing({ title: "", price: "", area: "", floor: "", rooms: "", region: "თბილისი", type: "ბინა", description: "", cadastral: "" });
    setIdFile(null); setExtractFile(null);
    setIdResult(null); setExtractResult(null);
    setSubmitted(false); setError("");
    setView("home");
  };

  const idMatch = idResult?.isValidDocument &&
    nameMatch(form.firstName, idResult.firstName, idResult.firstNameGeo) &&
    nameMatch(form.lastName, idResult.lastName, idResult.lastNameGeo) &&
    norm(idResult.personalNumber) === norm(form.personalNumber);

  const inp = { width: "100%", marginBottom: 8, padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none" };
  const btn = (x = {}) => ({ padding: "10px 16px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500, ...x });

  const filteredListings = listings.filter(l =>
    (filterRegion === "ყველა" || l.region === filterRegion) &&
    (filterType === "ყველა" || l.type === filterType)
  );

  /* HOME */
  if (view === "home") return (
    <div style={{ maxWidth: 480, margin: "60px auto", padding: "0 1rem", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
      <p style={{ fontSize: 11, color: "#9ca3af", letterSpacing: 2, textTransform: "uppercase", margin: "0 0 8px" }}>P2P Verifier</p>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 8px", color: "#111827" }}>პირდაპირი უძრავი ქონება</h1>
      <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 40px" }}>მხოლოდ ვერიფიცირებული მესაკუთრეები · მაკლერის გარეშე</p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button onClick={() => setView("browse")} style={btn({ padding: "14px 28px", background: "#1e40af", color: "#fff", border: "none", fontSize: 15 })}>
          🏠 განცხადებების ნახვა
        </button>
        <button onClick={() => setView("sell")} style={btn({ padding: "14px 28px", fontSize: 15 })}>
          ➕ განცხადების დამატება
        </button>
      </div>
    </div>
  );

  /* BROWSE */
  if (view === "browse") return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
        <button onClick={() => setView("home")} style={btn({ padding: "6px 12px", fontSize: 13 })}>← მთავარი</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>განცხადებები</h2>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
        <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} style={{ ...inp, marginBottom: 0, flex: 1 }}>
          <option>ყველა</option>
          {REGIONS.map(r => <option key={r}>{r}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...inp, marginBottom: 0, flex: 1 }}>
          <option>ყველა</option>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <button onClick={loadListings} style={btn({ padding: "8px 12px" })}>↻</button>
      </div>
      {loadingListings
        ? <p style={{ textAlign: "center", color: "#9ca3af" }}>იტვირთება...</p>
        : filteredListings.length === 0
          ? <div style={{ textAlign: "center", padding: "3rem 0", color: "#9ca3af" }}>
              <p style={{ fontSize: 32, margin: "0 0 8px" }}>🏠</p>
              <p>განცხადებები არ არის</p>
            </div>
          : filteredListings.map(l => <ListingCard key={l.id} listing={l} />)
      }
    </div>
  );

  /* SELL — verification + listing form */
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
        <button onClick={() => setView("home")} style={btn({ padding: "6px 12px", fontSize: 13 })}>← მთავარი</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>განცხადების დამატება</h2>
      </div>
      <StepBar current={step} />

      {step === 0 && (
        <div>
          <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>სახელი/გვარი ქართულად ან ლათინურად (პირადობის მიხედვით)</p>
          {[["firstName","სახელი"],["lastName","გვარი"],["personalNumber","პირადი ნომერი (11 ციფრი)"],["phone","ტელეფონი (+995...)"]].map(([key, ph]) => (
            <input key={key} placeholder={ph} value={form[key]} maxLength={key==="personalNumber"?11:undefined}
              onChange={e => setForm(p => ({...p, [key]: e.target.value}))} style={inp} />
          ))}
          {error && <p style={{ color: "#dc2626", fontSize: 13, margin: "0 0 10px" }}>{error}</p>}
          <button onClick={handleReg} style={btn({ width: "100%", background: "#1e40af", color: "#fff", border: "none" })}>გაგრძელება →</button>
        </div>
      )}

      {step === 1 && (
        <div>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 0 }}>ატვირთეთ პირადობის მოწმობა ან პასპორტი.</p>
          <FileUpload label="JPG, PNG ან PDF" accept="image/*,.pdf" file={idFile} onChange={f => { setIdFile(f); setIdResult(null); }} />
          {idResult && (
            <div style={{ background: idMatch?"#d1fae5":"#fee2e2", border:`1px solid ${idMatch?"#6ee7b7":"#fca5a5"}`, borderRadius:10, padding:"12px 14px", marginBottom:"1rem" }}>
              <p style={{ margin:"0 0 6px", fontSize:13, fontWeight:600, color:idMatch?"#065f46":"#991b1b" }}>
                {idMatch ? "✓ პირადობა დადასტურდა" : "✗ მონაცემები არ ემთხვევა"}
              </p>
              <div style={{ fontSize:12, color:"#374151" }}>
                <div><span style={{color:"#9ca3af"}}>რეგისტრაცია: </span>{form.firstName} {form.lastName} / {form.personalNumber}</div>
                <div><span style={{color:"#9ca3af"}}>ამოცნობილი: </span>{idResult.firstNameGeo||idResult.firstName} {idResult.lastNameGeo||idResult.lastName} / {idResult.personalNumber}</div>
              </div>
            </div>
          )}
          {error && <p style={{ color:"#dc2626", fontSize:13, margin:"0 0 10px" }}>{error}</p>}
          <div style={{ display:"flex", gap:8 }}>
            {!idMatch && <button onClick={handleVerifyId} disabled={loading||!idFile} style={btn({ flex:1, opacity:(loading||!idFile)?0.5:1 })}>{loading?"მოწმდება...":"გადამოწმება"}</button>}
            {idMatch && <button onClick={() => { setError(""); setStep(2); }} style={btn({ flex:1, background:"#1e40af", color:"#fff", border:"none" })}>გაგრძელება →</button>}
            {idResult && !idMatch && <button onClick={() => { setIdResult(null); setIdFile(null); setError(""); }} style={btn({ flex:1 })}>↩ თავიდან</button>}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <p style={{ fontSize:13, color:"#6b7280", marginTop:0 }}>ატვირთეთ საჯარო რეესტრის ამონაწერი napr.gov.ge-დან.</p>
          <p style={{ fontSize:12, color:"#9ca3af", marginTop:0 }}>თანასაკუთრების შემთხვევაშიც მუშაობს.</p>
          <FileUpload label="PDF ან JPG/PNG" accept="image/*,.pdf" file={extractFile} onChange={setExtractFile} />
          {error && <p style={{ color:"#dc2626", fontSize:13, margin:"0 0 10px" }}>{error}</p>}
          <button onClick={handleVerifyExtract} disabled={loading||!extractFile} style={btn({ width:"100%", background:"#1e40af", color:"#fff", border:"none", opacity:(loading||!extractFile)?0.5:1 })}>
            {loading?"მოწმდება...":"გადამოწმება"}
          </button>
        </div>
      )}

      {step === 3 && (
        <div>
          <div style={{ background:"#d1fae5", border:"1px solid #6ee7b7", borderRadius:10, padding:"10px 14px", marginBottom:"1rem", fontSize:13, color:"#065f46", fontWeight:600 }}>
            ✓ ვერიფიკაცია გავლილია
          </div>
          {extractResult?.allOwners?.length > 1 && (
            <div style={{ background:"#eff6ff", border:"1px solid #93c5fd", borderRadius:8, padding:"8px 12px", marginBottom:"1rem", fontSize:12, color:"#1e40af" }}>
              თანამფლობელები: {extractResult.allOwners.join(", ")}
            </div>
          )}
          <p style={{ fontSize:12, color:"#9ca3af", margin:"0 0 8px" }}>* სავალდებულო</p>
          {[["title","* სათაური"],["price","* ფასი ($)"],["area","* ფართი (მ²)"],["floor","სართული"],["rooms","ოთახები"],["cadastral","საკადასტრო კოდი"]].map(([key, ph]) => (
            <input key={key} placeholder={ph} value={listing[key]}
              onChange={e => setListing(l => ({...l, [key]: e.target.value}))} style={inp} />
          ))}
          <select value={listing.region} onChange={e => setListing(l => ({...l, region: e.target.value}))} style={{ ...inp }}>
            {REGIONS.map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={listing.type} onChange={e => setListing(l => ({...l, type: e.target.value}))} style={{ ...inp }}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <textarea placeholder="აღწერა" value={listing.description}
            onChange={e => setListing(l => ({...l, description: e.target.value}))}
            style={{ ...inp, height: 80, resize: "vertical" }} />
          {error && <p style={{ color:"#dc2626", fontSize:13, margin:"0 0 10px" }}>{error}</p>}
          <button onClick={handleSubmitListing} disabled={loading} style={btn({ width:"100%", background:"#1e40af", color:"#fff", border:"none", opacity:loading?0.5:1 })}>
            {loading ? "ინახება..." : "განცხადების გაგზავნა (30₾) →"}
          </button>
        </div>
      )}

      {step === 4 && (
        <div>
          <div style={{ textAlign:"center", padding:"1.5rem 1rem", background:submitted?"#d1fae5":"#fee2e2", border:`1px solid ${submitted?"#6ee7b7":"#fca5a5"}`, borderRadius:12, marginBottom:"1.5rem" }}>
            <p style={{ fontSize:40, margin:"0 0 6px" }}>{submitted?"✓":"✗"}</p>
            <p style={{ fontSize:17, fontWeight:700, margin:"0 0 6px", color:submitted?"#065f46":"#991b1b" }}>
              {submitted?"განცხადება გაგზავნილია!":"ვერიფიკაცია ჩავარდა"}
            </p>
            <p style={{ fontSize:12, color:"#6b7280", margin:0 }}>
              {submitted?"ადმინი გადაამოწმებს და 24 საათში გამოქვეყნდება":"მონაცემები არ ემთხვევა — სცადეთ თავიდან"}
            </p>
          </div>
          <button onClick={resetSell} style={btn({ width:"100%" })}>↩ მთავარზე დაბრუნება</button>
        </div>
      )}
    </div>
  );
}
