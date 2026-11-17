'use client';

import { useState } from 'react';
import { ErrorBanner, Field, inputClass, primaryButtonClass } from '@/components/ui';
import { saveAgentLog } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { notifySuccess } from '@/lib/feedback';
import { useAgent } from '@/components/agent/AgentData';
import { Card, Empty, PageTitle } from '@/components/agent/parts';

function lastDays(today) {
  const base = new Date(`${today}T00:00:00Z`).getTime();
  return Array.from({ length: 7 }, (_, i) => new Date(base - i * 86400000).toISOString().slice(0, 10));
}

function DailyLog({ data, onSaved }) {
  const days = lastDays(data.today);
  const [day, setDay] = useState(data.today);
  const existing = data.logs.find((l) => l.day === day);
  const [visits, setVisits] = useState(existing ? String(existing.visits) : '');
  const [demos, setDemos] = useState(existing ? String(existing.demos) : '');
  const [notes, setNotes] = useState(existing ? existing.notes : '');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');

  function pick(value) {
    setDay(value);
    const found = data.logs.find((l) => l.day === value);
    setVisits(found ? String(found.visits) : '');
    setDemos(found ? String(found.demos) : '');
    setNotes(found ? found.notes : '');
    setProblem('');
  }

  async function submit(e) {
    e.preventDefault();
    setProblem('');
    setSaving(true);
    try {
      await saveAgentLog({ day, visits: Number(visits || 0), demos: Number(demos || 0), notes });
      notifySuccess('Saved', `Your day for ${formatDate(day)} is written up`);
      onSaved();
    } catch (err) {
      setProblem(err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 sm:col-span-1">
        <Field label="Day">
          <select value={day} onChange={(e) => pick(e.target.value)} className={inputClass}>
            {days.map((d) => (
              <option key={d} value={d}>
                {d === data.today ? 'Today' : formatDate(d)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Shops visited">
        <input type="number" min="0" max="500" inputMode="numeric" value={visits} onChange={(e) => setVisits(e.target.value)} className={inputClass} placeholder="0" />
      </Field>
      <Field label="Demos given">
        <input type="number" min="0" max="500" inputMode="numeric" value={demos} onChange={(e) => setDemos(e.target.value)} className={inputClass} placeholder="0" />
      </Field>
      <div className="col-span-2 flex items-end sm:col-span-1">
        <button type="submit" disabled={saving} className={`${primaryButtonClass} w-full`}>
          {saving ? 'Saving…' : 'Save my day'}
        </button>
      </div>
      <div className="col-span-2 sm:col-span-4">
        <Field label="Note (optional)" hint="Who was interested, who to follow up. Only you and the Programme Desk see this.">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} className={inputClass} />
        </Field>
      </div>
      <div className="col-span-2 sm:col-span-4">
        <ErrorBanner message={problem} />
      </div>
    </form>
  );
}

function LogTab({ data, reload }) {
  const { logs } = data;
  return (
    <div className="space-y-4">
      <Card title="Write up your day">
        <DailyLog key={data.today} data={data} onSaved={() => reload({ quiet: true })} />
      </Card>
      <Card title="Your last days">
        {logs.length === 0 ? (
          <Empty>Nothing written up yet. Add today's visits and demos above.</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {logs.map((l) => (
              <li key={l.day} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{formatDate(l.day)}</p>
                  {l.notes && <p className="truncate text-xs text-gray-500">{l.notes}</p>}
                </div>
                <p className="tabular shrink-0 text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">{l.visits}</span> visits · <span className="font-semibold text-gray-900">{l.demos}</span> demos
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function AgentLogPage() {
  const { data, reload } = useAgent();
  return (
    <>
      <PageTitle title="Daily log" subtitle="Write up the shops you visited and the demos you gave. They count towards your weekly bonus." />
      <LogTab data={data} reload={reload} />
    </>
  );
}
