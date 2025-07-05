import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, pass);
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch (err: any) {
      setError(isSignUp ? "Oops, something went wrong with signup." : "Damn, that's not right.");
    }
  };

  return (
    <div className="login-container">
      <h4>{isSignUp ? 'Create' : 'You know the rules...'}</h4>
      <div className="login-form">
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
