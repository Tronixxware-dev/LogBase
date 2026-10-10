'use client';

import { notifySuccess } from '@/lib/feedback';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createExpense, deleteExpense, listExpenses } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import {
  EXPENSE_CATEGORIES,
  PAY_METHODS,
  PERIODS,
  categoryLabel,
  dayInput,
  expenseProblem,
  methodLabel,
  periodQuery,
} from '@/lib/expenses';
import PageHeader from '@/components/PageHeader';
import { BarList, SERIES_PURCHASES } from '@/components/charts';
import { ErrorBanner, Field, LoadingState, cardClass, inputClass, primaryButtonClass } from '@/components/ui';

// Money spent that is not stock: rent, salaries, transport, power... It is taken off the profit on the
// Overview to give the net profit. Administrator only.
export default function ExpensesPage() {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState('');
  const latest = useRef(0);

  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => dayInput());
  const [method, setMethod] = useState('cash');

  const load = useCallback(async () => {
    const ticket = ++latest.current;
    try {
      const result = await listExpenses(periodQuery(period));
      if (ticket === latest.current) setData(result); // an older answer arriving late is ignored
    } catch (err) {
      if (ticket === latest.current) setError(err.message);
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const problem = expenseProblem({ category, amount, description });
    if (problem) return setError(problem);

    setSaving(true);
    try {
      await createExpense({
        category,
        amount: Number(amount),
        description: description.trim(),
        date: date || undefined,
        paymentMethod: method,
      });
      setSuccess(`Saved: ${formatMoney(amount)} for ${categoryLabel(category)}.`);
      notifySuccess('Expense saved', `${formatMoney(amount)} for ${categoryLabel(category)}`);
      setAmount('');
      setDescription('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(expense) {
    if (!window.confirm(`Delete this expense of ${formatMoney(expense.amount)}?`)) return;
    setError('');
    setSuccess('');
    setRemoving(expense._id);
    try {
      await deleteExpense(expense._id);
      setSuccess('Expense deleted.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving('');
    }
  }

  const expenses = data ? data.expenses : [];
  const periodLabel = (PERIODS.find((p) => p.key === period) || PERIODS[0]).label.toLowerCase();

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Rent, salaries, transport, power and other money you spend that is not stock. It is taken off your profit on the Overview. Only you can see this page."
      />

      <ErrorBanner message={error} />
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700" role="status">
          {success}
        </div>
      )}

      <form onSubmit={submit} className={`${cardClass} mb-6 space-y-4 p-4 sm:p-5`} noValidate>
        <h2 className="text-base font-semibold text-gray-900">Add an expense</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="What was it for?">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} aria-label="Category">
              <option value="">Choose…</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount (₦)">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
              aria-label="Amount"
              placeholder="0.00"
            />
          </Field>
          <Field label={category === 'other' ? 'What was it for? (required)' : 'Note (optional)'}>
            <input
              type="text"
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              aria-label="Note"
              placeholder="e.g. October rent"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date">
              <input type="date" max={dayInput()} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} aria-label="Date" />
            </Field>
            <Field label="Paid by">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass} aria-label="Paid by">
                {PAY_METHODS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? 'Saving…' : 'Save expense'}
        </button>
      </form>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">Spending</h2>
        <div className="inline-flex flex-wrap rounded-lg border border-gray-200 bg-white p-0.5" role="group" aria-label="Period">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              aria-pressed={period === p.key}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                period === p.key ? 'bg-primary/10 font-medium text-primary' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading expenses…" />
      ) : (
        <>
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <section className={`${cardClass} p-4 sm:p-5`}>
              <p className="text-sm text-gray-500">Total spent ({periodLabel})</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900" data-testid="expense-total">
                {formatMoney(data ? data.total : 0)}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
              </p>
            </section>
            <section className={`${cardClass} p-4 sm:p-5`}>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Where it went</h3>
              <BarList
                color={SERIES_PURCHASES}
                empty="No expenses in this period"
                items={(data ? data.byCategory : []).map((c) => ({
                  label: categoryLabel(c.category),
                  value: c.amount,
                  display: formatMoney(c.amount),
                }))}
              />
            </section>
          </div>

          {data && data.truncated && (
            <p className="mb-3 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
              Only the newest 1,000 expenses are shown. Pick a shorter period to see the rest.
            </p>
          )}

          {expenses.length === 0 ? (
            <div className={`${cardClass} p-8 text-center text-sm text-gray-500`}>Nothing recorded for this period yet.</div>
          ) : (
            <ul className={`${cardClass} divide-y divide-gray-100`}>
              {expenses.map((e) => (
                <li key={e._id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{categoryLabel(e.category)}</p>
                    {e.description && <p className="break-words text-sm text-gray-600">{e.description}</p>}
                    <p className="text-xs text-gray-400">
                      {formatDate(e.date)} · {methodLabel(e.paymentMethod)}
                      {e.createdByName ? ` · added by ${e.createdByName}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">{formatMoney(e.amount)}</span>
                    <button
                      type="button"
                      onClick={() => remove(e)}
                      disabled={removing === e._id}
                      aria-label={`Delete expense ${categoryLabel(e.category)} ${formatMoney(e.amount)}`}
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                    >
                      {removing === e._id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
