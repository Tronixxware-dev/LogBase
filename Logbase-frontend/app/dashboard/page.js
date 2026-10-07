'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listProducts, listSales, listPurchases, listReturns, listStockAdjustments, listExpenses, listSuppliers } from '@/lib/api';
import { useUser } from '@/components/UserProvider';
import { formatMoney } from '@/lib/format';
import { buildAnalytics, STOCK_STATUS } from '@/lib/analytics';
import { categoryLabel, periodQuery } from '@/lib/expenses';
import { suppliersOwed, totalOwed } from '@/lib/payables';
import StaffHome from '@/components/StaffHome';
import AnimatedNumber from '@/components/AnimatedNumber';
import { Icon } from '@/components/Icons';
import { cardClass, LoadingState } from '@/components/ui';
import {
  TrendChart,
  BarList,
  SegmentBar,
  SERIES_SALES,
  SERIES_PURCHASES,
  STATUS_COLORS,
} from '@/components/charts';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

// A link when the person may open the page, plain text when they may not.
function MaybeLink({ href, children, ...props }) {
  return href ? (
    <Link href={href} {...props}>
      {children}
    </Link>
  ) : (
    <div {...props}>{children}</div>
  );
}

// The four headline numbers at the top of the Overview: a white card, a coloured icon and a big number.
// The "warn" card (low stock) gets an amber outline and number instead.
const TINTS = {
  teal: { chip: 'bg-teal-100 text-teal-700', glow: 'bg-teal-300/40' },
  violet: { chip: 'bg-violet-50 text-violet-700', glow: 'bg-violet-300/40' },
  green: { chip: 'bg-green-100 text-green-700', glow: 'bg-green-300/40' },
  amber: { chip: 'bg-amber-100 text-amber-700', glow: 'bg-amber-300/50' },
};

function StatCard({ href, label, value, note, warn, icon, tint = 'teal' }) {
  const t = TINTS[warn ? 'amber' : tint];
  return (
    <MaybeLink
      href={href}
      className={`group relative min-w-0 overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition duration-200 sm:p-5 ${
        href ? 'hover-lift' : ''
      } ${warn ? 'border-amber-300' : 'border-gray-200'}`}
    >
      <span
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100 ${t.glow}`}
        aria-hidden="true"
      />
      <div className="relative flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.chip}`}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
        {href && (
          <Icon
            name="arrowUpRight"
            className="h-4 w-4 text-gray-300 transition duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gray-500"
          />
        )}
      </div>
      <p className="relative mt-4 text-sm text-gray-500">{label}</p>
      <p
        className={`tabular relative mt-1 break-words text-2xl font-semibold tracking-tight sm:text-3xl ${
          warn ? 'text-amber-600' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
      {note && <p className="relative mt-1 text-xs text-gray-400">{note}</p>}
    </MaybeLink>
  );
}

// A number with a label, used in the grid of totals above the charts.
// accent: 'green' | 'red' colours the number (profit, loss).
function Kpi({ label, value, note, accent }) {
  const color = accent === 'green' ? 'text-green-700' : accent === 'red' ? 'text-red-600' : 'text-gray-900';
  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 shadow-xs">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`tabular mt-1 truncate text-lg font-semibold ${color}`}>{value}</p>
      {note && <p className="mt-0.5 truncate text-xs text-gray-400">{note}</p>}
    </div>
  );
}

function Panel({ title, note, action, children, className = '' }) {
  return (
    <section className={`${cardClass} p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {note && <p className="mt-0.5 text-xs text-gray-400">{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// A button on the green banner. The first one is solid white, the others are see-through.
function HeroLink({ href, solid, icon, children }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition active:scale-[0.97] ${
        solid
          ? 'bg-[#ffffff] text-[#0f766e] shadow-md hover:shadow-lg hover:brightness-95'
          : 'bg-white/15 text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/25'
      }`}
    >
      <Icon name={icon} className="h-4 w-4" />
      {children}
    </Link>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function plural(n, word) {
  return `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;
}

// Owners get the full overview; staffs get a small home screen with no money figures.
export default function DashboardPage() {
  const { can } = useUser();
  return can('viewInsights') ? <OwnerOverview /> : <StaffHome />;
}

function OwnerOverview() {
  const { user, can, isOwner } = useUser();
  // Profit, what stock cost, delivery fees and cost values are for the owner only.
  // pages this person may open (a link is only shown when they can)
  // products and stock are one page now
  const productsHref = can('viewStock', 'manageProducts') ? '/dashboard/products' : undefined;
  const stockHref = productsHref;
  const lowStockHref = productsHref ? '/dashboard/products?lowStock=true' : undefined;
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    async function load() {
      try {
        const [productsData, salesData, purchasesData, returnsData, adjustmentsData, expensesData, suppliersData] = await Promise.all([
          listProducts(),
          listSales(),
          listPurchases(),
          // returns and stock adjustments only refine the numbers, so a failure here does not hide the rest
          listReturns().catch(() => ({ returns: [] })),
          isOwner ? listStockAdjustments().catch(() => ({ adjustments: [] })) : Promise.resolve({ adjustments: [] }),
          // the longest period on this page is 90 days
          isOwner ? listExpenses(periodQuery('90')).catch(() => ({ expenses: [] })) : Promise.resolve({ expenses: [] }),
          // what is owed to suppliers right now (administrator only; a failure just hides that number)
          isOwner ? listSuppliers().catch(() => ({ suppliers: [] })) : Promise.resolve({ suppliers: [] }),
        ]);
        const returns = returnsData.returns || [];
        // stock written off costs money; found or counted-up stock gives some back (administrator only)
        const losses = [
          ...(adjustmentsData.adjustments || [])
            .filter((a) => a.costValue != null)
            .map((a) => ({ date: a.date, amount: -a.costValue })),
          ...returns.filter((r) => r.writtenOffCost > 0).map((r) => ({ date: r.date, amount: r.writtenOffCost })),
        ];
        setData({
          products: productsData.products || [],
          sales: salesData.sales || [],
          purchases: purchasesData.purchases || [],
          returns,
          losses,
          expenses: expensesData.expenses || [],
          suppliers: suppliersData.suppliers || [],
        });
      } catch {
        // The numbers are nice-to-have, so a failure shows a small note instead of an error screen.
        setFailed(true);
      }
    }

    load();
  }, [isOwner]);

  const insights = useMemo(() => (data ? buildAnalytics({ ...data, days }) : null), [data, days]);
  const today = useMemo(() => (data ? buildAnalytics({ ...data, days: 1 }).summary : null), [data]);

  const stock = insights ? insights.stock : null;
  const s = insights ? insights.summary : null;
  const payablesOwed = data ? totalOwed(data.suppliers) : 0;

  return (
    <>
      <section className="brand-gradient relative mb-6 overflow-hidden rounded-3xl px-6 py-7 text-white shadow-lg sm:px-8 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
            backgroundSize: '24px 24px',
            maskImage: 'linear-gradient(110deg, #000, transparent 65%)',
            WebkitMaskImage: 'linear-gradient(110deg, #000, transparent 65%)',
          }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-teal-50/85">
              {greeting()} ·{' '}
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">{`Welcome back, ${user.name}`}</h1>
            <p className="mt-1.5 text-sm text-teal-50/85">Here&apos;s what&apos;s happening with your business.</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {can('recordSales') && (
              <HeroLink href="/dashboard/sales/new" solid icon="plus">
                Record sale
              </HeroLink>
            )}
            {can('managePurchases') && (
              <HeroLink href="/dashboard/purchases/new" icon="purchases">
                Record purchase
              </HeroLink>
            )}
            {can('manageProducts') && (
              <HeroLink href="/dashboard/products/new" icon="products">
                Add product
              </HeroLink>
            )}
            {can('addCustomers', 'manageCustomers') && (
              <HeroLink href="/dashboard/customers/new" icon="customers">
                Add customer
              </HeroLink>
            )}
          </div>
        </div>
      </section>

      <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          href={productsHref}
          icon="products"
          tint="teal"
          label="Products"
          value={stock ? <AnimatedNumber value={data.products.length} /> : '—'}
        />
        <StatCard
          href={stockHref}
          icon="stock"
          tint="violet"
          label="Total stock"
          value={stock ? <AnimatedNumber value={stock.totals.units} /> : '—'}
          note={stock ? 'units across all products' : undefined}
        />
        <StatCard
          href="/dashboard/sales"
          icon="sales"
          tint="green"
          label="Today's sales"
          value={today ? <AnimatedNumber value={today.revenue} format={(n) => formatMoney(Math.round(n))} /> : '—'}
          note={today ? plural(today.salesCount, 'sale') : undefined}
        />
        <StatCard
          href={lowStockHref}
          icon="alert"
          tint="amber"
          label="Low stock"
          value={stock ? <AnimatedNumber value={stock.totals.low + stock.totals.out} /> : '—'}
          note={stock && stock.totals.out > 0 ? `${stock.totals.out} out of stock` : undefined}
          warn={stock && stock.totals.low + stock.totals.out > 0}
        />
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Insights                                                    */}
      {/* ---------------------------------------------------------- */}
      <div className="mb-4 mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Icon name="sparkle" className="h-5 w-5 text-primary" />
          Insights
        </h2>
        <div className="inline-flex rounded-xl bg-gray-100 p-1" role="group" aria-label="Period">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              aria-pressed={days === r.days}
              className={`rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${
                days === r.days
                  ? 'bg-white font-medium text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Last {r.label}
            </button>
          ))}
        </div>
      </div>

      {failed && (
        <p className={`${cardClass} p-5 text-sm text-gray-500`}>
          The insights could not be loaded right now. Refresh the page to try again.
        </p>
      )}
      {!insights && !failed && <LoadingState />}

      {insights && (
        <div className="space-y-4">
          {/* totals for the chosen period */}
          <div className={`stagger grid grid-cols-2 gap-3 ${isOwner ? 'sm:grid-cols-3 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
            <Kpi
              label="Revenue"
              value={formatMoney(s.revenue)}
              note={
                s.returnedValue > 0
                  ? `${plural(s.salesCount, 'sale')} · ${formatMoney(s.returnedValue)} returned`
                  : plural(s.salesCount, 'sale')
              }
            />
            {isOwner && (
              <Kpi label="Est. profit" value={formatMoney(s.profit)} accent={s.profit < 0 ? 'red' : 'green'} note="sales minus cost price, delivery and written-off stock" />
            )}
            {isOwner && (
              <Kpi
                label="Expenses"
                value={formatMoney(s.expenseTotal)}
                note={s.expenseCount > 0 ? plural(s.expenseCount, 'expense') : 'none recorded'}
              />
            )}
            {isOwner && <Kpi label="Net profit" value={formatMoney(s.netProfit)} accent={s.netProfit < 0 ? 'red' : 'green'} note="est. profit minus expenses" />}
            <Kpi label="Units sold" value={s.soldUnits.toLocaleString()} />
            {isOwner && (
              <Kpi label="Spent on stock" value={formatMoney(s.spend)} note={`${s.receivedUnits.toLocaleString()} units bought`} />
            )}
            {isOwner && (
              <Kpi
                label="Delivery paid"
                value={formatMoney(s.deliveryCost)}
                note={s.deliveryCount > 0 ? plural(s.deliveryCount, 'delivery') : 'none in this period'}
              />
            )}
            <Kpi
              label="Still owed by customers"
              value={formatMoney(s.owed)}
              note={s.revenue > 0 ? `${formatMoney(s.collected)} collected` : undefined}
            />
            {isOwner && payablesOwed > 0 && (
              <Kpi
                label="You owe suppliers"
                value={formatMoney(payablesOwed)}
                note={plural(suppliersOwed(data.suppliers).length, 'supplier')}
              />
            )}
          </div>

          <Panel
            title={isOwner ? 'Sales and purchases' : 'Sales'}
            note={
              isOwner
                ? `Money in and money spent on stock, per day, over the last ${days} days`
                : `Money in, per day, over the last ${days} days`
            }
          >
            <TrendChart
              data={insights.daily}
              series={[
                { key: 'sales', label: 'Sales', color: SERIES_SALES },
                ...(isOwner ? [{ key: 'purchases', label: 'Purchases', color: SERIES_PURCHASES }] : []),
              ]}
            />
          </Panel>

          {isOwner && (
            <Panel
              title="Expenses"
              note={`Running costs recorded over the last ${days} days`}
              action={
                <Link href="/dashboard/expenses" className="text-sm text-primary hover:underline">
                  {s.expenseCount > 0 ? 'Manage' : 'Add expenses'}
                </Link>
              }
            >
              {s.expenseCount > 0 ? (
                <BarList
                  color={SERIES_PURCHASES}
                  items={insights.expenseByCategory.map((c) => ({
                    label: categoryLabel(c.category),
                    value: c.amount,
                    display: formatMoney(c.amount),
                  }))}
                />
              ) : (
                <p className="py-4 text-sm text-gray-500">
                  No expenses recorded in this period. Add rent, salaries, transport and other costs to see your real (net) profit.
                </p>
              )}
            </Panel>
          )}

          {/* what is on the shelves now */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel
              title="Stock breakdown"
              note="What is on your shelves right now"
              action={
                stockHref ? (
                  <Link href={stockHref} className="text-sm text-primary hover:underline">
                    See all
                  </Link>
                ) : undefined
              }
            >
              <SegmentBar
                segments={['ok', 'low', 'out'].map((key) => ({
                  label: STOCK_STATUS[key],
                  value: stock.totals[key],
                  color: STATUS_COLORS[key],
                  display: plural(stock.totals[key], 'product'),
                }))}
              />
              <div className={`mt-5 grid gap-3 border-t border-gray-100 pt-4 ${isOwner ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {isOwner && (
                  <div>
                    <p className="text-xs text-gray-500">Stock value (cost)</p>
                    <p className="mt-0.5 font-semibold text-gray-900">{formatMoney(stock.totals.costValue)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Stock value (selling)</p>
                  <p className="mt-0.5 font-semibold text-gray-900">{formatMoney(stock.totals.retailValue)}</p>
                </div>
              </div>
            </Panel>

            <Panel title="Stock by category" note="Units in stock">
              <BarList
                empty="Add products to see your stock by category"
                items={stock.categories.map((c) => ({
                  label: c.label,
                  value: c.units,
                  display: `${c.units.toLocaleString()} units`,
                  sub: isOwner
                    ? `${plural(c.products, 'product')} · ${formatMoney(c.costValue)} at cost`
                    : plural(c.products, 'product'),
                }))}
              />
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Best sellers" note={`Most units sold in the last ${days} days`}>
              <BarList
                empty="No sales in this period yet"
                items={insights.topProducts.map((p) => ({
                  label: p.label,
                  value: p.units,
                  display: `${p.units.toLocaleString()} sold`,
                  sub: formatMoney(p.revenue),
                }))}
              />
            </Panel>

            <Panel title="Payments" note="Collected vs still owed, and how customers paid">
              <SegmentBar
                segments={[
                  { label: 'Collected', value: s.collected, color: STATUS_COLORS.ok, display: formatMoney(s.collected) },
                  { label: 'Still owed', value: s.owed, color: STATUS_COLORS.low, display: formatMoney(s.owed) },
                ]}
              />
              {insights.methods.length > 0 && (
                <div className="mt-5 border-t border-gray-100 pt-4">
                  <BarList
                    items={insights.methods.map((m) => ({
                      label: m.label,
                      value: m.value,
                      display: formatMoney(m.value),
                    }))}
                  />
                </div>
              )}
            </Panel>
          </div>

          {/* what delivering to customers cost the business */}
          {isOwner && (
          <Panel title="Delivery fees" note={`What you paid for deliveries, to customers and on purchases, in the last ${days} days`}>
            {s.deliveryCount === 0 ? (
              <p className="py-2 text-sm text-gray-400">
                No delivery fees paid in this period. They appear here when a sale or purchase is recorded with
                “Are you paying for the delivery?” set to Yes.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-gray-500">Total paid</p>
                  <p className="mt-0.5 text-lg font-semibold text-gray-900">{formatMoney(s.deliveryCost)}</p>
                  <p className="text-xs text-gray-400">
                    {plural(s.deliveryCount, 'delivery')} · avg {formatMoney(Math.round(s.deliveryCost / s.deliveryCount))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">On sales (to customers)</p>
                  <p className="mt-0.5 text-lg font-semibold text-gray-900">{formatMoney(s.salesDeliveryCost)}</p>
                  <p className="text-xs text-gray-400">{plural(s.salesDeliveryCount, 'delivery')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">On purchases (stock coming in)</p>
                  <p className="mt-0.5 text-lg font-semibold text-gray-900">{formatMoney(s.purchaseDeliveryCost)}</p>
                  <p className="text-xs text-gray-400">{plural(s.purchaseDeliveryCount, 'delivery')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Share of revenue</p>
                  <p className="mt-0.5 text-lg font-semibold text-gray-900">
                    {s.revenue > 0 ? `${((s.deliveryCost / s.revenue) * 100).toFixed(1)}%` : '—'}
                  </p>
                </div>
              </div>
            )}
          </Panel>
          )}

          {stock.needsRestock.length > 0 && (
            <Panel title="Needs restocking" note="Products that are out of stock or at their reorder level">
              <ul className="divide-y divide-gray-100">
                {stock.needsRestock.slice(0, 6).map((p) => (
                  <li key={p._id}>
                    <MaybeLink
                      href={can('manageProducts') ? `/dashboard/products/${p._id}` : undefined}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary"
                    >
                      <span className="min-w-0 truncate text-gray-800">{p.name}</span>
                      <span className="inline-flex shrink-0 items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: STATUS_COLORS[p.status] }}
                        />
                        <span className="text-gray-600">
                          {p.status === 'out' ? 'Out of stock' : `${p.quantity} left`}
                        </span>
                      </span>
                    </MaybeLink>
                  </li>
                ))}
              </ul>
              {stock.needsRestock.length > 6 && lowStockHref && (
                <Link
                  href={lowStockHref}
                  className="mt-3 inline-block text-sm text-primary hover:underline"
                >
                  See all {stock.needsRestock.length}
                </Link>
              )}
            </Panel>
          )}

        </div>
      )}

    </>
  );
}
