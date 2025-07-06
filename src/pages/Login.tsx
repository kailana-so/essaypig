import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { getFriendlyAuthMessage } from "../auth/utils";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [groupName, setGroupName] = useState("");

  const handleAuth = async () => {
    try {
      if (isSignUp) {
        // Check if user is in the allowed users list
        const ref = doc(db, 'allowedUsers', email);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setError("Sorry, you're not on the list...yet.");
          return;
        }
        const group = snap.data()?.group;

        if (group !== groupName) {
          setError("You sure about that group?");
          return;
        }

        await createUserWithEmailAndPassword(auth, email, pass);
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch (err: any) {
      const message = getFriendlyAuthMessage(err.code);
      setError(message);
    }
  };

  return (
    <div className="login-container">
      <h4>{isSignUp ? 'Join the clurb' : 'You know the rules...'}</h4>

      <div className="login-form">

        {isSignUp && <input 
          className="login-input"
          placeholder="Group Name" 
          value={groupName} 
          onChange={e => setGroupName(e.target.value)}
        />}
        <input 
          className="login-input"
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)}
        />
        <input 
          className="login-input"
          placeholder="Password" 
          type="password" 
          value={pass} 
          onChange={e => setPass(e.target.value)}
        />
        <button 
          onClick={handleAuth}
        >
          {isSignUp ? 'Sign Up' : 'Log In'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#666' }}>
        Or...
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="link"
        >
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </div>
    </div>
  );
}
