import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from './services/firebase'
import essaypigLogo from './assets/essay-pig.svg'
import './App.css'
import Login from './pages/Login'
import Gobbler from './pages/Gobbler'
import ResourceList from './components/ResourceList'
import Library from './pages/Library'

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [view, setView] = useState<'essays' | 'library'>('essays');
  const [showGobbler, setShowGobbler] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('essays');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'left', padding: "5px" }}>
            <img src={essaypigLogo} className="logo react" alt="Essay Pig logo" />
          </div>
          <div onClick={() => setShowLogin(false)}>
          <pre className="ascii-banner">
{`███████╗███████╗███████╗ █████╗ ██╗   ██╗    ██████╗ ██╗ ██████╗
██╔════╝██╔════╝██╔════╝██╔══██╗╚██╗ ██╔╝    ██╔══██╗██║██╔════╝
█████╗  ███████╗███████╗███████║ ╚████╔╝     ██████╔╝██║██║  ███╗
██╔══╝  ╚════██║╚════██║██╔══██║  ╚██╔╝      ██╔═══╝ ██║██║   ██║
███████╗███████║███████║██║  ██║   ██║       ██║     ██║╚██████╔╝
╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝       ╚═╝     ╚═╝ ╚═════╝ `}
          </pre>
        </div>
        <div>
          {user ? (
            <a onClick={handleLogout} className="login-toggle">
              sign out
            </a>
          ) : (
            <a onClick={() => setShowLogin(s => !s)} className="login-toggle">
              sign in
            </a>
          )}
        </div>
      </div>
        <main>
          {user && (
            <div className="tab-bar">
              <button
                className={`tab ${view === 'essays' ? 'active' : ''}`}
                onClick={() => setView('essays')}
              >
                Essays
              </button>
              <button
                className={`tab ${view === 'library' ? 'active' : ''}`}
                onClick={() => setView('library')}
              >
                My Lib
              </button>
            </div>
          )}
          {user && view === 'library' ? (
            <Library user={user} />
          ) : (
            <>
              {user ? (
                <>
                  <div
                    className="resource-list__item"
                    onClick={() => setShowGobbler((s) => !s)}
                  >
                    + Add an essay
                  </div>
                  {showGobbler && <Gobbler />}
                </>
              ) : (
                showLogin && <Login />
              )}
              <ResourceList />
            </>
          )}
        </main>
    </div>
  )
}

export default App
