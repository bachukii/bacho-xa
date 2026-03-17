import { useState, useRef } from "react";

function StepBar({ current }) {
  const steps = ["რეგისტრაცია", "პირადობა", "ამონაწერი", "შედეგი"];
  return (
    <div style={{ display: "flex", marginBottom: "1.5rem" }}>
      {steps.map((s, i) => (
        <div key={i} style={{ flex: 1, textAlign: "center" }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%", margin: "0 auto 6px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 500,
            background: i < current ? "#d1fae5" : i === current ? "#dbeafe" : "#f3f4f6",
            color: i < current ? "#065f46" : i === current ? "#1e40af" : "#9ca3af",
            border: `1px solid ${i < current ? "#6ee7b7" : i === current ? "#93c5fd" : "#e5e7eb"}`
          }}>
            {i < current ? "✓" : i + 1}
          </div>
          <p style={{ fontSize: 11, margin: 0, color: i === current ? "#111827" : "#9ca3af" }}>{s}</p>
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
            <p style={{ margin: "0 0 3px", fontSize: 22, color: "#9ca3af" }}>+</p>
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
  const [idFile, setIdFile] = useState(null);
  const [extractFile, setExtractFile] = useState(null);
  const [idResult, setIdResult] = useState(null);
  const [extractResult, setExtractResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(null);

  const norm = s => (s || "").trim().toLowerCase();

  const fileToBase64 = file => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const callClaude = async (file, prompt) => {
    const base64 = await fileToBase64(file);
    const mt = file.type || "image/jpeg";
    const mediaType = mt.includes("pdf") ? "application/pdf" : mt;
    const contentItem = mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: mediaType, data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };

    const res = await fetch("/.netlify/functions/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: [contentItem, { type: "text", text: prompt }] }]
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const text = data.content.map(c => c.text || "").join("");
    const clean = text.replace(/```json[\s\S]*?```|```/g, "").trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
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
        `This is a Georgian ID card or passport. Extract the data and respond ONLY with a JSON object, no other text:\n{"isValidDocument":true,"firstName":"FIRSTNAME","lastName":"LASTNAME","personalNumber":"11DIGITS"}`
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
        `This is a Georgian public registry extract (საჯარო რეესტრის ამონაწერი) from napr.gov.ge. Extract owner data and respond ONLY with a JSON object:\n{"isValidDocument":true,"ownerFirstName":"FIRSTNAME","ownerLastName":"LASTNAME","ownerPersonalNumber":"11DIGITS","cadastralCode":"CODE"}`
      );
      setExtractResult(r);
      const ok =
        r.isValidDocument &&
        norm(r.ownerFirstName) === norm(form.firstName) &&
        norm(r.ownerLastName) === norm(form.lastName) &&
        norm(r.ownerPersonalNumber) === norm(form.personalNumber) &&
        idResult?.isValidDocument &&
        norm(idResult.firstName) === norm(form.firstName) &&
        norm(idResult.lastName) === norm(form.lastName) &&
        norm(idResult.personalNumber) === norm(form.personalNumber);
      setStatus(ok ? "approved" : "blocked");
      setStep(3);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const reset = () => {
    setStep(0); setForm({ firstName: "", lastName: "", personalNumber: "", phone: "" });
    setIdFile(null); setExtractFile(null); setIdResult(null); setExtractResult(null);
    setStatus(null); setError("");
  };

  const idMatch = idResult &&
    norm(idResult.firstName) === norm(form.firstName) &&
    norm(idResult.lastName) === norm(form.lastName) &&
    norm(idResult.personalNumber) === norm(form.personalNumber) &&
    idResult.isValidDocument;

  const inp = { width: "100%", marginBottom: 8, padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none" };
  const btn = (x = {}) => ({ padding: "10px 16px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500, ...x });

  return (
    <div style={{ maxWidth: 460, margin: "40px auto", padding: "0 1rem", fontFamily: "system-ui, sans-serif" }}>
      <p style={{ fontSize: 10, color: "#9ca3af", margin: "0 0 3px", letterSpacing: 1, textTransform: "uppercase" }}>P2P Verifier</p>
      <h2 style={{ margin: "0 0 1.5rem", fontSize: 20, fontWeight: 600, color: "#111827" }}>მესაკუთრის ვერიფიკაცია</h2>
      <StepBar current={step} />

      {step === 0 && (
        <div>
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
                <div><span style={{color:"#9ca3af"}}>ამოცნობილი: </span>{idResult.firstName} {idResult.lastName} / {idResult.personalNumber}</div>
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
          <FileUpload label="PDF ან JPG/PNG" accept="image/*,.pdf" file={extractFile} onChange={setExtractFile} />
          {error && <p style={{ color:"#dc2626", fontSize:13, margin:"0 0 10px" }}>{error}</p>}
          <button onClick={handleVerifyExtract} disabled={loading||!extractFile} style={btn({ width:"100%", background:"#1e40af", color:"#fff", border:"none", opacity:(loading||!extractFile)?0.5:1 })}>
            {loading?"მოწმდება...":"გადამოწმება და დასრულება"}
          </button>
        </div>
      )}

      {step === 3 && (
        <div>
          <div style={{ textAlign:"center", padding:"1.5rem 1rem", background:status==="approved"?"#d1fae5":"#fee2e2", border:`1px solid ${status==="approved"?"#6ee7b7":"#fca5a5"}`, borderRadius:12, marginBottom:"1.5rem" }}>
            <p style={{ fontSize:40, margin:"0 0 6px" }}>{status==="approved"?"✓":"✗"}</p>
            <p style={{ fontSize:17, fontWeight:700, margin:"0 0 6px", color:status==="approved"?"#065f46":"#991b1b" }}>
              {status==="approved"?"ვერიფიკაცია დასრულდა":"ვერიფიკაცია ჩავარდა"}
            </p>
            <p style={{ fontSize:12, color:"#6b7280", margin:0 }}>
              {status==="approved"?"განცხადების განთავსება დაშვებულია":"მონაცემები არ ემთხვევა — ანგარიში დაბლოკილია"}
            </p>
          </div>
          {extractResult && (
            <div style={{ marginBottom:"1.5rem" }}>
              <div style={{ display:"grid", gridTemplateColumns:"90px 1fr 1fr 20px", gap:8, padding:"5px 0", fontSize:11, color:"#9ca3af", borderBottom:"1px solid #f3f4f6" }}>
                <span/><span>რეგისტრაცია</span><span>ამონაწერი</span><span/>
              </div>
              <MatchRow label="სახელი" regVal={form.firstName} docVal={extractResult.ownerFirstName} />
              <MatchRow label="გვარი" regVal={form.lastName} docVal={extractResult.ownerLastName} />
              <MatchRow label="პირადი №" regVal={form.personalNumber} docVal={extractResult.ownerPersonalNumber} />
              {extractResult.cadastralCode && (
                <div style={{ padding:"8px 0", fontSize:12 }}>
                  <span style={{color:"#9ca3af"}}>საკადასტრო კოდი: </span>
                  <span style={{fontWeight:600}}>{extractResult.cadastralCode}</span>
                </div>
              )}
            </div>
          )}
          {status==="blocked" && <button onClick={reset} style={btn({ width:"100%" })}>↩ თავიდან</button>}
        </div>
      )}
    </div>
  );
}
