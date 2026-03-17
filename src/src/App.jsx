import { useState, useRef } from "react";

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
  const ref = useRef();
  return (
    <div onClick={() => ref.current.click()} style={{
      border: "1.5px dashed #d1d5db", borderRadius: 12, padding: "1.25rem",
      textAlign: "center", cursor: "pointer", background: "#f9fafb", marginBottom: "1rem"
    }}>
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }} onChange={e => onChange(e.target.files[0])} />
      {file
        ? <p style={{ margin: 0, fontSize: 13, color: "#065f46" }}>✓ {file.name}</p>
        : <div>
            <p style={{ margin: "0 0 3px", fontSize: 20, color: "#9ca3af" }}>+</p>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>{label}</p>
          </div>
      }
    </div>
  );
}

function MatchRow({ label, regVal, docVal }) {
  const norm = s => (s || "").trim().toLowerCase();
  const ok = norm(regVal) === norm(docVal) && regVal;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "90px 1fr 1fr 20px",
      gap: 8, padding: "6px 0", borderBottom: "1px solid #f3f4f6",
      fontSize: 12, alignItems: "center"
    }}>
      <span style={{ color: "#9ca3af" }}>{label}</span>
      <span style={{ color: "#6b7280" }}>{regVal || "—"}</span>
      <span style={{ color: "#111827", fontWeight: 500 }}>{docVal || "—"}</span>
      <span style={{ color: ok ? "#059669" : "#dc2626", fontWeight: 700 }}>{ok ? "✓" : "✗"}</span>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(0);
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
{"isValidDocument":true,"found":true,"ownerFirstName":"LATIN","ownerLastName":"LATIN","ownerFirstNameGeo":"ქართული","ownerLastNameGeo":"ქართული","ownerPersonalNumber":"11digits","cadastralCode":"CODE","allOwners":["სახელი გვარი","სახელი გვარი"]}`
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

  const handleSubmitListing = () => {
    if (!listing.title || !listing.price || !listing.area || !listing.region) {
      setError("შეავსეთ სავალდებულო ველები (*)"); return;
    }
    setError("");
    setSubmitted(true);
    setStep(4);
  };

  const reset = () => {
    setStep(0);
    setForm({ firstName: "", lastName: "", personalNumber: "", phone: "" });
    setListing({ title: "", price: "", area: "", floor: "", rooms: "", region: "თბილისი", type: "ბინა", description: "", cadastral: "" });
    setIdFile(null); setExtractFile(null);
    setIdResult(null); setExtractResult(null);
    setSubmitted(false); setError("");
  };

  const idMatch = idResult?.isValidDocument &&
    nameMatch(form.firstName, idResult.firstName, idResult.firstNameGeo) &&
    nameMatch(form.lastName, idResult.lastName, idResult.lastNameGeo) &&
    norm(idResult.personalNumber) === norm(form.personalNumber);

  const inp = { width: "100%", marginBottom: 8, padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none" };
  const btn = (x = {}) => ({ padding: "10px 16px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500, ...x });
  const sel = { ...inp, marginBottom: 8 };

  const approved = submitted;
  const blocked = step === 4 && !submitted;

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: "0 1rem", fontFamily: "system-ui, sans-serif" }}>
      <p style={{ fontSize: 10, color: "#9ca3af", margin: "0 0 3px", letterSpacing: 1, textTransform: "uppercase" }}>P2P Verifier</p>
      <h2 style={{ margin: "0 0 1.5rem", fontSize: 20, fontWeight: 600, color: "#111827" }}>მესაკუთრის ვერიფიკაცია</h2>
      <StepBar current={step} />

      {/* Step 0 — Registration */}
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

      {/* Step 1 — ID */}
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

      {/* Step 2 — Extract */}
      {step === 2 && (
        <div>
          <p style={{ fontSize:13, color:"#6b7280", marginTop:0 }}>ატვირთეთ საჯარო რეესტრის ამონაწერი napr.gov.ge-დან.</p>
          <p style={{ fontSize:12, color:"#9ca3af", marginTop:0 }}>თანასაკუთრების შემთხვევაშიც მუშაობს — სისტემა თქვენს პირად ნომერს მოძებნის.</p>
          <FileUpload label="PDF ან JPG/PNG" accept="image/*,.pdf" file={extractFile} onChange={setExtractFile} />
          {error && <p style={{ color:"#dc2626", fontSize:13, margin:"0 0 10px" }}>{error}</p>}
          <button onClick={handleVerifyExtract} disabled={loading||!extractFile} style={btn({ width:"100%", background:"#1e40af", color:"#fff", border:"none", opacity:(loading||!extractFile)?0.5:1 })}>
            {loading?"მოწმდება...":"გადამოწმება"}
          </button>
        </div>
      )}

      {/* Step 3 — Listing form */}
      {step === 3 && (
        <div>
          <div style={{ background:"#d1fae5", border:"1px solid #6ee7b7", borderRadius:10, padding:"10px 14px", marginBottom:"1rem", fontSize:13, color:"#065f46", fontWeight:600 }}>
            ✓ ვერიფიკაცია გავლილია — შეავსეთ განცხადება
          </div>
          {extractResult?.allOwners?.length > 1 && (
            <div style={{ background:"#eff6ff", border:"1px solid #93c5fd", borderRadius:8, padding:"8px 12px", marginBottom:"1rem", fontSize:12, color:"#1e40af" }}>
              თანამფლობელები: {extractResult.allOwners.join(", ")}
            </div>
          )}
          <p style={{ fontSize:12, color:"#9ca3af", margin:"0 0 8px" }}>* სავალდებულო ველები</p>
          {[["title","* სათაური (მაგ: 3-ოთახიანი ბინა ვაკეში)"],["price","* ფასი ($)"],["area","* ფართი (მ²)"],["floor","სართული"],["rooms","ოთახები"],["cadastral","საკადასტრო კოდი"]].map(([key, ph]) => (
            <input key={key} placeholder={ph} value={listing[key]}
              onChange={e => setListing(l => ({...l, [key]: e.target.value}))} style={inp} />
          ))}
          <select value={listing.region} onChange={e => setListing(l => ({...l, region: e.target.value}))} style={sel}>
            {REGIONS.map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={listing.type} onChange={e => setListing(l => ({...l, type: e.target.value}))} style={sel}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <textarea placeholder="აღწერა" value={listing.description}
            onChange={e => setListing(l => ({...l, description: e.target.value}))}
            style={{ ...inp, height: 80, resize: "vertical" }} />
          {error && <p style={{ color:"#dc2626", fontSize:13, margin:"0 0 10px" }}>{error}</p>}
          <button onClick={handleSubmitListing} style={btn({ width:"100%", background:"#1e40af", color:"#fff", border:"none" })}>
            განცხადების გაგზავნა (30₾) →
          </button>
        </div>
      )}

      {/* Step 4 — Result */}
      {step === 4 && (
        <div>
          <div style={{
            textAlign:"center", padding:"1.5rem 1rem",
            background: approved ? "#d1fae5" : "#fee2e2",
            border:`1px solid ${approved ? "#6ee7b7" : "#fca5a5"}`,
            borderRadius:12, marginBottom:"1.5rem"
          }}>
            <p style={{ fontSize:40, margin:"0 0 6px" }}>{approved ? "✓" : "✗"}</p>
            <p style={{ fontSize:17, fontWeight:700, margin:"0 0 6px", color: approved ? "#065f46" : "#991b1b" }}>
              {approved ? "განცხადება გაგზავნილია!" : "ვერიფიკაცია ჩავარდა"}
            </p>
            <p style={{ fontSize:12, color:"#6b7280", margin:0 }}>
              {approved ? "ადმინი გადაამოწმებს და 24 საათში გამოქვეყნდება" : "მონაცემები არ ემთხვევა — სცადეთ თავიდან"}
            </p>
          </div>

          {approved && extractResult && (
            <div style={{ background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:10, padding:"12px 14px", marginBottom:"1rem" }}>
              <p style={{ margin:"0 0 8px", fontSize:13, fontWeight:600 }}>განცხადების დეტალები</p>
              <div style={{ fontSize:12, color:"#374151", display:"grid", gap:4 }}>
                <div><span style={{color:"#9ca3af"}}>სათაური: </span>{listing.title}</div>
                <div><span style={{color:"#9ca3af"}}>ფასი: </span>${listing.price}</div>
                <div><span style={{color:"#9ca3af"}}>ფართი: </span>{listing.area} მ²</div>
                <div><span style={{color:"#9ca3af"}}>რაიონი: </span>{listing.region}</div>
                <div><span style={{color:"#9ca3af"}}>ტიპი: </span>{listing.type}</div>
                {listing.cadastral && <div><span style={{color:"#9ca3af"}}>საკადასტრო: </span>{listing.cadastral}</div>}
              </div>
            </div>
          )}

          <button onClick={reset} style={btn({ width:"100%" })}>↩ თავიდან</button>
        </div>
      )}
    </div>
  );
}
