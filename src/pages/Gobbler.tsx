import { type User } from "firebase/auth";
import { db } from "../services/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useState } from "react";

export default function Gobbler({ user }: { user: User }) {
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<'link' | 'file'>('link');

  const setType = (mode: 'link' | 'file') => {
    setMode(mode);
    setUrl("");
    setFile(null);
    setMessage("");
    setError("");
  };

  const submitResource = async () => {
    if (mode === 'link' && !url.trim()) return;
    if (mode === 'file' && !file) return;
    
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      if (mode === 'link') {
        await addDoc(collection(db, "resources"), {
          url,
          type: "link",
          created_at: serverTimestamp(),
          user_id: user.uid,
        });
        setUrl("");
      } else {
        await addDoc(collection(db, "resources"), {
          fileName: file?.name,
          fileSize: file?.size,
          type: "pdf",
          created_at: serverTimestamp(),
          user_id: user.uid,
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
            PDF
          </button>
        </div>

        <div style={{ width: '100%', height: '50px', marginBottom: '.5rem' }}>
          {mode === 'link' ? (
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Paste a link or PDF URL"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: '4px', padding: '0.7rem'}}
            />
          ) : (
            <input
              type="file"
              accept=".pdf"
              onChange={e => setFile(e.target.files?.[0] || null)}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: '4px', padding: '0.5rem'}}
            />
          )}
        </div>

        <button onClick={submitResource} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit"}
        </button>
        {message && <p>{message}</p>}
        {error && <p className="error">{error}</p>}
        
      </div>
    </div>
  );
}
