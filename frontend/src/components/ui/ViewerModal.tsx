'use client';

import { useEffect, useState } from 'react';
import type { Resource } from '@/types';

export default function ViewerModal() {
  const [resource, setResource] = useState<Resource | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { resource: Resource };
      setResource(detail.resource);
    };
    window.addEventListener('eduhub:open-viewer', handler);
    return () => window.removeEventListener('eduhub:open-viewer', handler);
  }, []);

  const close = () => setResource(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!resource) return null;

  const fileUrl = resource.file_url || resource.url || '';

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal-box">
        <div className="modal-bar">
          <strong>{resource.title}</strong>
          <button className="icon-btn" onClick={close} title="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {resource.category?.key === 'images' ? (
            <img src={fileUrl} alt={resource.title} />
          ) : (
            <>
              <iframe src={fileUrl} title={resource.title} />
              <p className="hint" style={{ textAlign: 'center', marginTop: 10 }}>
                If this file type doesn&apos;t preview here, use Download instead.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
