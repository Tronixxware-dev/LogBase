'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { ErrorBanner, Field, cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui';
import { adminBusinesses, adminSendEmail } from '@/lib/api';
import { notifySuccess } from '@/lib/feedback';

const AUDIENCES = [
  { key: 'me', label: 'Only me (send a test first)', hint: 'Sent to your own email so you can see how it looks.' },
  { key: 'business', label: 'One business', hint: 'The owner of the business you pick.' },
  { key: 'trialing', label: 'Everyone on a free trial', hint: 'Owners whose trial is still running.' },
  { key: 'paid', label: 'Everyone with a paid plan', hint: 'Owners whose Starter or Business plan is running.' },
  { key: 'ended', label: 'Trial or plan has ended', hint: 'Owners who are now on the Free plan. A good place for a "come back" offer.' },
  { key: 'everyone', label: 'Every business owner', hint: 'Everyone, except suspended businesses.' },
];

export default function AdminEmailPage() {
  const [audience, setAudience] = useState('me');
  const [businessQuery, setBusinessQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [picked, setPicked] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [check, setCheck] = useState(null); // { recipients, sample }
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  // look up businesses while typing (only when "One business" is chosen)
  useEffect(() => {
    if (audience !== 'business' || picked || businessQuery.trim().length < 2) {
      setMatches([]);
      return undefined;
    }
    const t = setTimeout(() => {
      adminBusinesses({ search: businessQuery.trim() })
        .then((data) => setMatches(data.items.slice(0, 6)))
        .catch(() => setMatches([]));
    }, 300);
    return () => clearTimeout(t);
  }, [audience, businessQuery, picked]);

  // a changed audience or text means the earlier check no longer applies
  function reset(changes) {
    setCheck(null);
    setSure(false);
    setDone('');
    return changes;
  }

  const payload = (dryRun) => ({ audience, businessId: picked ? picked._id : undefined, subject, message, dryRun });

  async function checkRecipients() {
    setError('');
    setDone('');
    if (audience === 'business' && !picked) {
      setError('Pick the business first.');
      return;
    }
    setBusy(true);
    try {
      setCheck(await adminSendEmail(payload(true)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function send(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await adminSendEmail(payload(false));
      notifySuccess('Sending started', result.message);
      setDone(result.message);
      setCheck(null);
      setSure(false);
      if (audience !== 'me') {
        setSubject('');
        setMessage('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const ready = subject.trim() && message.trim();

  return (
    <>
      <PageHeader title="Email owners" subtitle="Send an announcement, a notice or a thank-you to the owners of businesses on LogBase." />

      <form onSubmit={send} className="grid max-w-3xl gap-5">
        <div className={`${cardClass} p-4 sm:p-5`}>
          <p className="mb-3 text-sm font-semibold text-gray-900">Who should get it?</p>
          <div className="space-y-2">
            {AUDIENCES.map((a) => (
              <label key={a.key} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition ${audience === a.key ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  name="audience"
                  checked={audience === a.key}
                  onChange={() => {
                    setAudience(a.key);
                    reset();
                  }}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900">{a.label}</span>
                  <span className="block text-xs text-gray-500">{a.hint}</span>
                </span>
              </label>
            ))}
          </div>

          {audience === 'business' && (
            <div className="mt-4">
              {picked ? (
                <p className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-2.5 text-sm">
                  <span>
                    <span className="font-medium text-gray-900">{picked.name}</span> <span className="text-gray-500">({picked.ownerEmail})</span>
                  </span>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary"
                    onClick={() => {
                      setPicked(null);
                      setBusinessQuery('');
                      reset();
                    }}
                  >
                    Change
                  </button>
                </p>
              ) : (
                <>
                  <input value={businessQuery} onChange={(e) => setBusinessQuery(e.target.value)} placeholder="Type the business name or owner email" className={inputClass} />
                  {matches.length > 0 && (
                    <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
                      {matches.map((b) => (
                        <li key={b._id}>
                          <button
                            type="button"
                            onClick={() => {
                              setPicked(b);
                              reset();
                            }}
                            className="block w-full px-3.5 py-2.5 text-left text-sm hover:bg-gray-50"
                          >
                            <span className="font-medium text-gray-900">{b.name}</span> <span className="text-gray-500">{b.ownerEmail}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className={`${cardClass} space-y-4 p-4 sm:p-5`}>
          <Field label="Subject">
            <input
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                reset();
              }}
              maxLength={150}
              className={inputClass}
              placeholder="e.g. New: send receipts as a picture on WhatsApp"
            />
          </Field>
          <Field label="Message" hint="Plain text. Leave a blank line between paragraphs. Each person is greeted by name (“Hi Tolu,”) and the email is signed “The LogBase team”.">
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                reset();
              }}
              rows={9}
              maxLength={5000}
              className={`${inputClass} resize-y`}
              placeholder="Write your message here…"
            />
          </Field>
        </div>

        <ErrorBanner message={error} />
        {done && (
          <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {done}
          </p>
        )}

        <div className={`${cardClass} space-y-4 p-4 sm:p-5`}>
          {!check ? (
            <>
              <p className="text-sm text-gray-600">First check how many people will get it. Nothing is sent yet.</p>
              <button type="button" onClick={checkRecipients} disabled={busy || !ready} className={secondaryButtonClass}>
                {busy ? 'Checking…' : 'Check who will get it'}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-700">
                This will be emailed to <span className="font-semibold text-gray-900">{check.recipients}</span> {check.recipients === 1 ? 'person' : 'people'}
                {check.sample && check.sample.length > 0 && (
                  <>
                    {' '}
                    (for example {check.sample.slice(0, 3).join(', ')}
                    {check.recipients > 3 ? '…' : ''})
                  </>
                )}
                .
              </p>
              {check.recipients === 0 ? (
                <p className="text-sm text-amber-700">Nobody matches that audience right now.</p>
              ) : (
                <>
                  <label className="flex items-start gap-2.5 text-sm text-gray-700">
                    <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="mt-0.5" />
                    <span>I have read the subject and message, and I want to send this now. Emails cannot be taken back.</span>
                  </label>
                  <button type="submit" disabled={busy || !sure || !ready} className={primaryButtonClass}>
                    {busy ? 'Starting…' : `Send to ${check.recipients} ${check.recipients === 1 ? 'person' : 'people'}`}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </form>
    </>
  );
}
