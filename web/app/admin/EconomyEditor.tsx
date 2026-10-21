'use client';

import React, { useState } from 'react';
import {
  CONSTANT_META,
  JOB_META,
  MISSION_META,
  type EconomyConfig,
  type EconomyConstants,
} from '@/lib/economy';

export default function EconomyEditor({ initial }: { initial: EconomyConfig }) {
  const [constants, setConstants] = useState<EconomyConstants>({ ...initial.constants });
  const [jobs, setJobs] = useState<Record<string, number>>({ ...initial.job_payouts });
  const [missions, setMissions] = useState<Record<string, number>>({ ...initial.mission_rewards });
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(initial.updated_at);
  const [tab, setTab] = useState<'constants' | 'jobs' | 'missions'>('constants');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>('');

  async function handleSave() {
    setSaving(true);
    setStatus('Saving to Supabase…');
    try {
      const res = await fetch('/api/economy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          constants,
          job_payouts: jobs,
          mission_rewards: missions,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus(`Error: ${data.error ?? 'Failed to save'}`);
      } else {
        setConstants(data.config.constants);
        setJobs(data.config.job_payouts);
        setMissions(data.config.mission_rewards);
        setUpdatedAt(data.config.updated_at);
        setStatus('Saved live to Supabase — active for clients on next boot.');
      }
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : 'Network error'}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setStatus('Resetting to defaults…');
    try {
      const res = await fetch('/api/economy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setConstants(data.config.constants);
        setJobs(data.config.job_payouts);
        setMissions(data.config.mission_rewards);
        setUpdatedAt(data.config.updated_at);
        setStatus('Reset to default economy values in Supabase.');
      } else {
        setStatus(`Error: ${data.error ?? 'Failed to reset'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : 'Network error'}`);
    } finally {
      setSaving(false);
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.55rem 1rem',
    borderRadius: 6,
    border: active ? '1px solid #f5b82e' : '1px solid rgba(255,255,255,0.16)',
    background: active ? 'rgba(245,184,46,0.18)' : 'rgba(255,255,255,0.04)',
    color: active ? '#f5b82e' : '#e4ece9',
    cursor: 'pointer',
    fontWeight: 600,
  });

  const inputStyle: React.CSSProperties = {
    width: 130,
    padding: '0.4rem 0.6rem',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(0,0,0,0.35)',
    color: '#ffffff',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <section
      style={{
        marginTop: '2.5rem',
        padding: '1.5rem',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(12, 24, 20, 0.72)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Live Economy, Job Payouts &amp; Mission Rewards</h2>
          <p style={{ margin: '0.35rem 0 0', opacity: 0.8, fontSize: '0.92rem' }}>
            Edit economy constants, job shift pay, and story/co-op mission rewards in Supabase without rebuilding the Unity client.
            {updatedAt ? ` · Last updated ${new Date(updatedAt).toLocaleString()}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.22)',
              background: 'transparent',
              color: '#cbd5d1',
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '0.55rem 1.15rem',
              borderRadius: 6,
              border: '1px solid #2bd47d',
              background: '#198754',
              color: '#ffffff',
              fontWeight: 600,
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save Live Config'}
          </button>
        </div>
      </div>

      {status && (
        <p
          style={{
            marginTop: '0.85rem',
            padding: '0.6rem 0.85rem',
            borderRadius: 6,
            background: status.startsWith('Error') ? 'rgba(220,53,69,0.2)' : 'rgba(25,135,84,0.22)',
            border: status.startsWith('Error') ? '1px solid #dc3545' : '1px solid #2bd47d',
          }}
        >
          {status}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.1rem', marginBottom: '1.1rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setTab('constants')} style={tabStyle(tab === 'constants')}>
          Economy Constants ({CONSTANT_META.length})
        </button>
        <button type="button" onClick={() => setTab('jobs')} style={tabStyle(tab === 'jobs')}>
          Job Shift Payouts ({JOB_META.length})
        </button>
        <button type="button" onClick={() => setTab('missions')} style={tabStyle(tab === 'missions')}>
          Mission &amp; Co-op Rewards ({MISSION_META.length})
        </button>
      </div>

      {tab === 'constants' && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
              <th align="left" style={{ padding: '0.5rem 0' }}>Constant</th>
              <th align="left">Key</th>
              <th align="right">Unit</th>
              <th align="right">Live Value</th>
            </tr>
          </thead>
          <tbody>
            {CONSTANT_META.map((c) => (
              <tr key={c.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={{ padding: '0.5rem 0' }}>{c.label}</td>
                <td><code>{c.key}</code></td>
                <td align="right">{c.unit}</td>
                <td align="right">
                  <input
                    type="number"
                    min={0}
                    step={c.unit === '₦' ? 100 : 1}
                    value={constants[c.key] ?? 0}
                    onChange={(e) =>
                      setConstants((prev) => ({ ...prev, [c.key]: Math.max(0, Number(e.target.value) || 0) }))
                    }
                    style={inputStyle}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'jobs' && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
              <th align="left" style={{ padding: '0.5rem 0' }}>Job Title</th>
              <th align="left">Location</th>
              <th align="right">Default</th>
              <th align="right">Live Payout (₦)</th>
            </tr>
          </thead>
          <tbody>
            {JOB_META.map((j) => (
              <tr key={j.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={{ padding: '0.5rem 0' }}>
                  {j.title} <small style={{ opacity: 0.65 }}>({j.id})</small>
                </td>
                <td>{j.where}</td>
                <td align="right" style={{ opacity: 0.7 }}>₦{j.defaultPay.toLocaleString()}</td>
                <td align="right">
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={jobs[j.id] ?? j.defaultPay}
                    onChange={(e) =>
                      setJobs((prev) => ({ ...prev, [j.id]: Math.max(0, Number(e.target.value) || 0) }))
                    }
                    style={inputStyle}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'missions' && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
              <th align="left" style={{ padding: '0.5rem 0' }}>Mission / Co-op Operation</th>
              <th align="left">Arc</th>
              <th align="right">Default</th>
              <th align="right">Live Reward (₦)</th>
            </tr>
          </thead>
          <tbody>
            {MISSION_META.map((m) => (
              <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={{ padding: '0.5rem 0' }}>
                  {m.title} <small style={{ opacity: 0.65 }}>({m.id})</small>
                </td>
                <td>{m.arc}</td>
                <td align="right" style={{ opacity: 0.7 }}>₦{m.defaultReward.toLocaleString()}</td>
                <td align="right">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={missions[m.id] ?? m.defaultReward}
                    onChange={(e) =>
                      setMissions((prev) => ({ ...prev, [m.id]: Math.max(0, Number(e.target.value) || 0) }))
                    }
                    style={inputStyle}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
