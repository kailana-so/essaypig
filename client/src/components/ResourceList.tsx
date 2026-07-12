import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { authedFetch } from '../services/api';
import Reader from './Reader';
import type { ReaderKind } from './Reader';
import StatusIcon from './StatusIcon';
import './ResourceList.css';

type Resource = {
  id: string;
  title: string;
  synopsis: string;
  type: string;
  url: string | null;
  active: boolean;
  completed: boolean;
};

interface ResourceListProps {
  user?: User | null;
}

export default function ResourceList({ user }: ResourceListProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openEssay, setOpenEssay] = useState<
    { id: string; kind: ReaderKind; url: string } | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/resources')
      .then(r => r.json())
      .then(data => setResources(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Only texts the cron has actually sent can be opened
  const isReadable = (r: Resource) => r.active || r.completed;

  const openEssayReader = async (r: Resource) => {
    setError('');

    // Links live on someone else's site, so they open at the source
    if (r.type !== 'pdf' && r.type !== 'epub') {
      if (r.url) window.open(r.url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      const response = await authedFetch(`/api/resources/read?${new URLSearchParams({ id: r.id })}`);
      if (!response.ok) throw new Error('Failed to get essay URL');
      const { url } = await response.json();
      setOpenEssay({ id: r.id, kind: r.type, url });
    } catch (err) {
      console.error('Failed to open essay:', err);
      setError("Couldn't open that one.");
    }
  };

  if (loading) return null;
  if (!resources.length) return null;

  return (
    <div className="resource-list">
      {error && <p className="error">{error}</p>}

      <div className="resource-list__scroll">
        {resources.map(r => (
          <div key={r.id}>
            <div
              className="resource-list__item resource-list__item--status"
              onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
            >
              {user && (
                <StatusIcon
                  status={r.active ? 'reading' : r.completed ? 'finished' : undefined}
                />
              )}
              {r.title}
            </div>
            {selectedId === r.id && (
              <div className="resource-list__synopsis">
                {r.synopsis && <p style={{ margin: '0 0 0.5rem 0' }}>{r.synopsis}</p>}
                {user && isReadable(r) && (
                  <button onClick={() => openEssayReader(r)}>Read</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {openEssay && (
        <Reader
          kind={openEssay.kind}
          bookmarkKey={openEssay.id}
          url={openEssay.url}
          onClose={() => setOpenEssay(null)}
        />
      )}
    </div>
  );
}
