'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, ErrorBanner, Field, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';
import { getAgentMail, sendAgentMail } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { notifySuccess } from '@/lib/feedback';
import { useUser } from '@/components/UserProvider';
import { useAgent } from '@/components/agent/AgentData';
import { Card, Empty, PageTitle, plural } from '@/components/agent/parts';

// Customer service: write to the businesses you registered. The email goes to the owner from LogBase's address and
// replies come back to the agent. {shop} {owner} {agent} {code} {link} are filled in for each business.

const MAX_SHOPS = 20;

const TEMPLATES = [
  {
    id: 'welcome',
    label: 'Welcome',
    subject: 'Welcome to LogBase, {shop}',
    message:
      'Thank you for joining LogBase. I am {agent}, your Sales Agent, and I am here to help {shop} get the best out of it.\n\nA good first week looks like this: add your products, record your first sales, and invite your staff. If you get stuck on anything, just reply to this email and I will help you.',
  },
  {
    id: 'start',
    label: 'Get going',
    subject: 'Let us get {shop} fully set up on LogBase',
    message:
      'I noticed {shop} is still getting started on LogBase. The quickest way to see its value is to add your products and record a few sales: it only takes a few minutes, and from then on LogBase keeps your stock, profit and debts for you.\n\nWould you like me to walk you through it? Reply to this email or call me and we will do it together.',
  },
  {
    id: 'trial',
    label: 'Trial ending',
    subject: 'Your LogBase free trial is ending soon',
    message:
      'Your free trial of LogBase for {shop} is ending soon. To keep your sales, stock and customer records safe and carry on without a break, subscribe on mylogbase.com. It takes about two minutes.\n\nIf you have any question about the plans, reply to this email and I will gladly help.',
  },
  {
    id: 'checkin',
    label: 'Check-in',
    subject: 'How is LogBase working for {shop}?',
    message:
      'I am checking in to see how LogBase is working for {shop}. Is there anything confusing, or something you would like it to do?\n\nTell me and I will make sure you get an answer. Your feedback also helps us make LogBase better for every shop.',
  },
  { id: 'blank', label: 'Write my own', subject: '', message: '' },
];

const FIELDS = [
  ['{owner}', 'Their first name'],
  ['{shop}', 'Business name'],
  ['{agent}', 'Your name'],
  ['{code}', 'Your code'],
  ['{link}', 'Sign-up link'],
];

function fillIn(text, { shop, owner, agent }) {
  const link = `https://mylogbase.com/signup?ref=${agent.code}`;
  return text
    .replace(/\{shop\}/gi, shop)
    .replace(/\{owner\}/gi, owner)
    .replace(/\{agent\}/gi, agent.name)
    .replace(/\{code\}/gi, agent.code)
    .replace(/\{link\}/gi, link);
}

function stateLabel(s) {
  if (s.state === 'activated') return s.paying ? 'Paying' : 'Plan ended';
  if (s.state === 'activating') return 'Getting started';
  if (s.trial) return s.trial.ended ? 'Trial ended' : `Trial: ${s.trial.daysLeft}d left`;
  return 'Not paid yet';
}

function preselected(shops) {
  try {
    const want = new URLSearchParams(window.location.search).get('shop');
    return want && shops.some((s) => String(s._id) === want) ? [want] : [];
  } catch {
    return [];
  }
}

export default function AgentMailPage() {
  const { user } = useUser();
  const { data } = useAgent();
  const { agent, shops } = data;

  const [picked, setPicked] = useState(() => preselected(shops));
  const [query, setQuery] = useState('');
  const [template, setTemplate] = useState(picked.length ? 'welcome' : '');
  const [subject, setSubject] = useState(() => (picked.length ? TEMPLATES[0].subject : ''));
  const [message, setMessage] = useState(() => (picked.length ? TEMPLATES[0].message : ''));
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(null); // { limit, configured, items }
  const [showHistory, setShowHistory] = useState(false);
  const area = useRef(null);

  const loadHistory = useCallback(() => {
    getAgentMail()
      .then(setHistory)
      .catch(() => {});
  }, []);
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? shops.filter((s) => s.name.toLowerCase().includes(q)) : shops;
  }, [shops, query]);

  const chosen = shops.filter((s) => picked.includes(String(s._id)));
  const left = history ? history.limit.left : null;
  const first = chosen[0];
  const ctx = first ? { shop: first.name, owner: 'there', agent } : { shop: 'Your Shop', owner: 'there', agent };
  const previewSubject = fillIn(subject || 'Your subject', ctx);
  const previewBody = fillIn(message || 'Your message will show here.', ctx);

  const toggle = (id) => {
    setResult(null);
    setConfirming(false);
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_SHOPS ? p : [...p, id]));
  };

  function applyTemplate(id) {
    const t = TEMPLATES.find((x) => x.id === id);
    setTemplate(id);
    setSubject(t.subject);
    setMessage(t.message);
    setConfirming(false);
    setResult(null);
  }

  function insert(token) {
    const el = area.current;
    if (!el) return setMessage((m) => m + token);
    const start = el.selectionStart ?? message.length;
    const end = el.selectionEnd ?? message.length;
    const next = message.slice(0, start) + token + message.slice(end);
    setMessage(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  const ready = chosen.length > 0 && subject.trim().length >= 3 && message.trim().length >= 10;
  const overLimit = left !== null && chosen.length > left;

  async function send() {
    setProblem('');
    setSending(true);
    try {
      const out = await sendAgentMail({ shopIds: chosen.map((s) => String(s._id)), subject, message });
      setResult(out);
      setConfirming(false);
      if (out.sent > 0) {
        notifySuccess('Email sent', `${plural(out.sent, 'business')} will see your message. Replies come to ${user.email}.`);
        setPicked(out.results.filter((r) => !r.ok).map((r) => r.businessId));
      }
      loadHistory();
    } catch (err) {
      setProblem(err.message || 'The email could not be sent');
      setConfirming(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageTitle title="Mail" subtitle="Write to the shops you registered. Replies come straight to your own email." />

      {history && history.configured === false && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Email sending is not switched on yet. Contact the Programme Desk.</div>
      )}

      {shops.length === 0 ? (
        <Empty>You have no shops yet. When a business signs up with your code, you can write to it from here.</Empty>
      ) : (
        <div className="space-y-4">
          {/* 1. who */}
          <Card
            title="1. Who is it for?"
            action={<Badge tone={chosen.length ? 'teal' : 'gray'}>{chosen.length ? `${chosen.length} chosen` : 'None chosen'}</Badge>}
          >
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your shops" className={inputClass} />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={`${secondaryButtonClass} !px-3 !py-1.5 !text-xs`} onClick={() => setPicked(list.slice(0, MAX_SHOPS).map((s) => String(s._id)))}>
                Select shown
              </button>
              <button
                type="button"
                className={`${secondaryButtonClass} !px-3 !py-1.5 !text-xs`}
                onClick={() => setPicked(shops.filter((s) => s.state === 'not_paid' && s.trial && (s.trial.ended || s.trial.daysLeft <= 3)).slice(0, MAX_SHOPS).map((s) => String(s._id)))}
              >
                Trials ending
              </button>
              <button type="button" className={`${secondaryButtonClass} !px-3 !py-1.5 !text-xs`} onClick={() => setPicked([])}>
                Clear
              </button>
            </div>
            <ul className="mt-3 max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200">
              {list.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-500">No shop matches that.</li>}
              {list.map((s) => {
                const id = String(s._id);
                const on = picked.includes(id);
                return (
                  <li key={id}>
                    <label className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition ${on ? 'bg-teal-50' : 'hover:bg-gray-50'}`}>
                      <input type="checkbox" checked={on} onChange={() => toggle(id)} className="h-4 w-4 rounded border-gray-300 accent-teal-600" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{s.name}</span>
                      <span className="shrink-0 text-xs text-gray-500">{stateLabel(s)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-gray-400">Up to {MAX_SHOPS} at a time. The email goes to the shop owner. You do not see their address.</p>
          </Card>

          {/* 2. what */}
          <Card title="2. What do you want to say?">
            <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t.id)}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${template === t.id ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              <Field label="Subject">
                <input value={subject} onChange={(e) => { setSubject(e.target.value); setConfirming(false); }} maxLength={120} className={inputClass} placeholder="e.g. Welcome to LogBase, {shop}" />
              </Field>
              <Field label="Message" hint={`${message.length}/3000. A blank line starts a new paragraph. Plain text only.`}>
                <textarea ref={area} value={message} onChange={(e) => { setMessage(e.target.value); setConfirming(false); }} rows={9} maxLength={3000} className={`${inputClass} resize-y leading-relaxed`} placeholder="Write your message…" />
              </Field>
              <div>
                <p className="mb-1.5 text-xs font-medium text-gray-500">Tap to put it in your message. It is filled in for each shop.</p>
                <div className="flex flex-wrap gap-1.5">
                  {FIELDS.map(([token, label]) => (
                    <button key={token} type="button" onClick={() => insert(token)} title={label} className="rounded-md bg-gray-100 px-2.5 py-1 font-mono text-xs text-gray-700 transition hover:bg-gray-200">
                      {token}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* 3. preview and send */}
          <Card title="3. Check and send">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
              <div className="border-b border-gray-200 bg-white px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-400">Subject</p>
                <p className="text-sm font-semibold text-gray-900">{previewSubject}</p>
                <p className="mt-1 text-xs text-gray-500">
                  From LogBase · replies go to {user.email}
                </p>
              </div>
              <div className="whitespace-pre-line px-4 py-4 text-sm leading-relaxed text-gray-700">
                {`Hi there,\n\n${previewBody}\n\n`}
                <span className="font-semibold text-gray-900">{agent.name}</span>
                {'\nYour LogBase Sales Agent'}
              </div>
            </div>
            {first && <p className="mt-2 text-xs text-gray-400">Shown for {first.name}. Each shop gets its own name and its owner&apos;s first name.</p>}

            <div className="mt-4">
              <ErrorBanner message={problem} />
              {overLimit && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">You can send {left} more email{left === 1 ? '' : 's'} today. Choose fewer shops.</p>}
              {!confirming ? (
                <button type="button" disabled={!ready || overLimit || (history && history.configured === false)} onClick={() => setConfirming(true)} className={`${primaryButtonClass} w-full sm:w-auto`}>
                  {chosen.length ? `Review and send to ${plural(chosen.length, 'shop')}` : 'Choose who it is for'}
                </button>
              ) : (
                <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                  <p className="text-sm font-semibold text-teal-900">Send this to {plural(chosen.length, 'business')} now?</p>
                  <p className="mt-1 text-xs text-teal-800">It cannot be taken back. Please check the spelling and that nothing in it is a promise LogBase has not made.</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" disabled={sending} onClick={send} className={primaryButtonClass}>
                      {sending ? 'Sending…' : 'Yes, send it'}
                    </button>
                    <button type="button" disabled={sending} onClick={() => setConfirming(false)} className={secondaryButtonClass}>
                      Go back
                    </button>
                  </div>
                </div>
              )}
              {left !== null && <p className="mt-3 text-xs text-gray-400">{left} of {history.limit.perDay} emails left today.</p>}
            </div>
          </Card>

          {result && (
            <Card title="Result" action={<Badge tone={result.failed ? 'amber' : 'green'}>{result.sent} sent{result.failed ? `, ${result.failed} failed` : ''}</Badge>}>
              <ul className="divide-y divide-gray-100">
                {result.results.map((r) => (
                  <li key={r.businessId} className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="min-w-0 truncate text-gray-900">{r.name}</span>
                    <span className={`shrink-0 text-xs font-medium ${r.ok ? 'text-emerald-600' : 'text-red-600'}`}>{r.ok ? 'Sent' : r.reason || 'Failed'}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* history */}
          <Card
            title="Sent emails"
            action={
              <button type="button" onClick={() => setShowHistory((v) => !v)} className="text-xs font-semibold text-primary hover:underline">
                {showHistory ? 'Hide' : 'Show'}
              </button>
            }
          >
            {!showHistory ? (
              <p className="text-sm text-gray-500">{history ? `${plural(history.items.length, 'email')} in your history.` : 'Loading…'}</p>
            ) : !history || history.items.length === 0 ? (
              <Empty>You have not written to any shop yet.</Empty>
            ) : (
              <ul className="divide-y divide-gray-100">
                {history.items.map((m) => (
                  <li key={m._id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{m.subject}</p>
                        <p className="truncate text-xs text-gray-500">To {m.businessName || 'a shop'} · {formatDateTime(m.createdAt)}</p>
                      </div>
                      <Badge tone={m.status === 'sent' ? 'green' : 'red'}>{m.status === 'sent' ? 'Sent' : 'Failed'}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
