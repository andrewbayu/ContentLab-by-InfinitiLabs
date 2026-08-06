import React, { useMemo, useState } from 'react';
import { Download, ExternalLink, FileText, List, LayoutGrid, Search } from 'lucide-react';
import type { DocumentItem, TeamMember } from '../services/sheets';
import { richTextToPlainText } from '../utils/richText';
import { RichTextPreview } from './RichText';
import '../styles/reports.css';

interface ReportsViewProps {
  documents: DocumentItem[];
  currentUser: TeamMember;
}

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(date);
};

export const ReportsView: React.FC<ReportsViewProps> = ({ documents, currentUser }) => {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'cards' | 'list'>('cards');

  const reports = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return documents
      .filter((document) => document.visibility === 'client' && document.client === currentUser.client)
      .filter((document) => !normalized || [document.title, document.type === 'Note' ? richTextToPlainText(document.body) : document.body, document.client, document.brand, document.tags]
        .some((value) => String(value || '').toLowerCase().includes(normalized)))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }, [documents, currentUser.client, query]);

  const download = (document: DocumentItem) => {
    if (document.url) {
      const anchor = window.document.createElement('a');
      anchor.href = document.url;
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
      anchor.download = document.title || 'report';
      anchor.click();
      return;
    }
    const body = document.type === 'Note' ? richTextToPlainText(document.body) : document.body;
    const blob = new Blob([body || document.title], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = href;
    anchor.download = `${document.title || 'report'}.txt`;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  return (
    <main className="page-container reports-page">
      <header className="reports-heading">
        <div>
          <span className="reports-eyebrow">Client-facing library</span>
          <h2>Reports</h2>
          <p>Reports and files shared by the InfinitiLabs team.</p>
        </div>
        <div className="reports-view-toggle" role="group" aria-label="Report view">
          <button type="button" className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')} aria-label="Card view"><LayoutGrid size={15} /></button>
          <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="List view"><List size={15} /></button>
        </div>
      </header>

      <label className="reports-search">
        <Search size={15} aria-hidden="true" />
        <span className="sr-only">Search reports</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports..." />
      </label>

      {reports.length ? (
        view === 'cards' ? (
          <section className="reports-grid" aria-label="Reports">
            {reports.map((report) => (
              <article className="report-card" key={report.id}>
                <div className="report-card-icon"><FileText size={18} /></div>
                <div className="report-card-content">
                  <div className="report-card-title-row"><strong>{report.title}</strong>{report.pinned && <span className="report-pinned">Pinned</span>}</div>
                  <span className="report-card-meta">{report.client || 'All clients'}{report.brand ? ` · ${report.brand}` : ''} · Updated {formatDate(report.updatedAt)}</span>
                  <p>{report.body ? report.type === 'Note' ? <RichTextPreview value={report.body} /> : report.body : 'Shared report or file.'}</p>
                  <div className="report-card-actions">
                    <button type="button" className="btn btn-primary btn-small" onClick={() => download(report)}><Download size={14} /> {report.url ? 'Open / download' : 'Download'}</button>
                    {report.url && <a className="report-open-link" href={report.url} target="_blank" rel="noreferrer">Open link <ExternalLink size={13} /></a>}
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="reports-list" aria-label="Reports list">
            {reports.map((report) => (
              <article className="report-list-row" key={report.id}>
                <div className="report-card-icon"><FileText size={17} /></div>
                <div className="report-list-main"><strong>{report.title}</strong><span>{report.client || 'All clients'}{report.brand ? ` · ${report.brand}` : ''}</span></div>
                <time>{formatDate(report.updatedAt)}</time>
                <button type="button" className="btn btn-secondary btn-small" onClick={() => download(report)}><Download size={14} /> Download</button>
              </article>
            ))}
          </section>
        )
      ) : (
        <section className="reports-empty">
          <FileText size={28} />
          <strong>{query ? 'No matching reports' : 'No reports shared yet'}</strong>
          <span>{query ? 'Try a different search.' : 'Client-facing reports shared by the team will appear here.'}</span>
        </section>
      )}
    </main>
  );
};
