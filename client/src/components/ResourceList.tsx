import { useState, useEffect } from 'react';
import './ResourceList.css';

type Resource = {
  id: string;
  title: string;
  synopsis: string;
  type: string;
  url: string | null;
  fileUrl: string | null;
};

export default function ResourceList() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/resources')
      .then(r => r.json())
      .then(data => setResources(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!resources.length) return null;

  return (
    <div className="resource-list">
      <div className="resource-list__scroll">
        {resources.map(r => (
          <div key={r.id}>
            <div
              className="resource-list__item"
              onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
            >
              {r.title}
            </div>
            {selectedId === r.id && r.synopsis && (
              <p className="resource-list__synopsis">{r.synopsis}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
