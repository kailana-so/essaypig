import { db } from "../services/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { MAX_SIZE_MB } from "./constants";
import { ALLOWED_TYPES } from "./constants";

export default function Gobbler() {
  const [url, setUrl] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<'link' | 'file'>('link');
  const [summary, setSummary] = useState<Array<string>>([]);

  const setType = (mode: 'link' | 'file') => {
    setMode(mode);
    setUrl(""); 
    setFile(null);
    setMessage("");
    setError("");
    setSummary([]);
  };
  
  const validateAndSetFile = (
    file: File | null
  ) => {
    if (!file) {
      setError("That's not a file.");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only PDF or EPUB files.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Thats a big one. ${MAX_SIZE_MB}MB is the limit.`);
      return;
    }
  
    setError("");
    setFile(file);
  };

  const submitResource = async () => {
    setSummary([]);
    
    if (mode === 'link' && !url?.trim() || mode === 'file' && !file) {
      setError("Not much to that one.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      if (mode === 'link' && url) {
        setSummary([]);
        const formData = new FormData();
        formData.append('text', url);
        formData.append('fileType', 'link');

        const summaryRes = await fetch('/api/summarypig', {
          method: 'POST',
          body: formData,
        });

        const { summary } = await summaryRes.json();

        setSummary([summary.title, summary.body]);
        await addDoc(collection(db, "resources"), {
          url,
          type: "link",
          summary: summary,
          bbtc: false,
          bitext: false,
          created_at: serverTimestamp(),
        });
        setUrl("");
      } else if (mode === 'file' && file) {
        // 1. Request a presigned URL
        const res = await fetch(`/api/presign?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`);
        const { url: presignedUrl } = await res.json();

        if (!presignedUrl) {
          throw new Error("No presigned URL returned.");
        }

        // 2. Upload the file to S3 using the presigned URL
        await fetch(presignedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });
        
        // Strip query params to get the file URL
        const s3FileUrl = presignedUrl.split('?')[0];

        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileType', file.type);
        formData.append('fileName', file.name);

        const summaryRes = await fetch('/api/summarypig', {
          method: 'POST',
          body: formData,
        });

        const { summary } = await summaryRes.json();
        setSummary([summary.title, summary.body]);

        await addDoc(collection(db, "resources"), {
          fileName: file.name,
          fileSize: file.size,
          fileUrl: s3FileUrl,
          summary: summary,
          type: file.type.includes('epub') ? 'epub' : 'pdf',
          bbtc: false,
          bitext: false,
          created_at: serverTimestamp(),
        });

        setFile(null);
      }
      setMessage("Yum. *snuffling noises*");
    } catch (err) {
      console.error("Submission failed:", err);
      setError("Hmmm, try again?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      padding: '2rem' 
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '500px', 
        textAlign: 'center' 
      }}>
        
        {/* Mode Toggle */}
        <div>
          <button
            className={`badge ${mode === 'link' ? 'active' : ''}`}
            onClick={() => setType('link')}
          >
            Link
          </button>
          <button
            className={`badge ${mode === 'file' ? 'active' : ''}`}
            onClick={() => setType('file')}
          >
            File
          </button>
        </div>

        <div style={{ width: '100%', height: '50px', marginBottom: '.5rem' }}>
          {mode === 'link' ? (
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Paste a essay link"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: '4px', padding: '0.7rem'}}
            />
          ) : (
            <input
              key={mode} // Force re-render when mode changes
              type="file"
              accept=".pdf,.epub"
              onChange={e => validateAndSetFile(e.target.files?.[0] || null)}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: '4px', padding: '0.5rem'}}
            />
          )}
        </div>

        <button onClick={submitResource} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit"}
        </button>
        {summary && summary.length > 0 ? (
          <div>
            <h3>{summary[0]}</h3>
            <p>{summary[1]}</p>
          </div>
        ) : null}
        {message && message.length > 0 ? <p>{message}</p> : null}
        {error && error.length > 0 ? <p className="error">{error}</p> : null}
        
      </div>
    </div>
  );
}
