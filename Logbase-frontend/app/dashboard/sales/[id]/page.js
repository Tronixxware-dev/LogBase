'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getSale } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { describePhone } from '@/lib/phone';
import { reasonLabel, refundMethodLabel } from '@/lib/returns';
import { warrantyLabel, warrantyStatus } from '@/lib/serials';
import { useUser } from '@/components/UserProvider';
import PageHeader from '@/components/PageHeader';
import SaleGallery from '@/components/SaleGallery';
import ReturnPanel from '@/components/ReturnPanel';
import { ErrorBanner, LoadingState, StatusBadge, cardClass } from '@/components/ui';
import { PersonChip } from '@/components/Avatar';
import { Detail, DetailCard, DetailGrid, DetailSubhead, MoneyStrip } from '@/components/DetailParts';

function lineName(line) {
  return `${line.product?.name || line.productName || 'Product'}${line.variantLabel ? ` · ${line.variantLabel}` : ''}`;
}

export default function SaleDetailPage() {
  const { id } = useParams();
  const { isOwner, can } = useUser(); // the delivery fee the business paid is for the owner only
  const [sale, setSale] = useState(null);
  const [group, setGroup] = useState([]); // every line of the same sale, oldest first
  const [returns, setReturns] = useState([]); // returns made on this sale
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const data = await getSale(id);
    setSale(data.sale);
    setGroup(data.group || []);
    setReturns(data.returns || []);
  }, [id]);

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [load]);

  if (loading) return <LoadingState />;

  if (!sale) {
    return (
      <>
        <PageHeader title="Sale not found" backHref="/dashboard/sales" backLabel="Back to sales" />
        <ErrorBanner message={error} />
      </>
    );
  }

  const customerPhone = describePhone(sale.customer?.phone);
  const isGroup = group.length > 1;
  const lines = isGroup ? group : [sale];
  // Photos added while the sale was recorded. A recorded sale cannot be changed, so they are only shown.
  const photos = lines.flatMap((line) => line.images || []);
  // quantity, total and paid are what is left after returns
  const groupTotal = lines.reduce((sum, l) => sum + l.totalAmount, 0);
  const groupPaid = lines.reduce((sum, l) => sum + l.amountPaid, 0);
  const balance = Math.max(groupTotal - groupPaid, 0);
  const returnedUnits = lines.reduce((sum, l) => sum + (l.returnedQuantity || 0), 0);
  const returnedValue = lines.reduce((sum, l) => sum + (l.returnedAmount || 0), 0);
  // lines with IMEI / serial numbers or a warranty
  const tracked = lines.filter((l) => (l.serials || []).length > 0 || (l.returnedSerials || []).length > 0 || l.warrantyEndsAt);
  // the delivery fee is kept on the first line of a multi-item sale
  const deliveryCost = lines.reduce((sum, l) => sum + (l.deliveryPaidByUs ? Number(l.deliveryCost) || 0 : 0), 0);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={sale.product?.name || 'Sale'}
        subtitle={[sale.variantLabel, formatDateTime(sale.date || sale.createdAt)].filter(Boolean).join(' · ')}
        backHref="/dashboard/sales"
        backLabel="Back to sales"
        action={
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/sales/${sale._id}/receipt`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Receipt
            </Link>
            <StatusBadge status={sale.paymentStatus} />
          </div>
        }
      />

      <ErrorBanner message={error} />
      {notice && <p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</p>}

      {isGroup && (
        <div className={`${cardClass} mb-6 p-6`}>
          <h2 className="mb-1 text-lg font-medium text-gray-900">Everything in this sale</h2>
          <p className="mb-4 text-xs text-gray-400">The customer bought {group.length} items at the same time.</p>
          <ul className="divide-y divide-gray-100">
            {group.map((line) => (
              <li key={line._id} className="flex items-center justify-between gap-4 py-2 text-sm">
                <span className={line._id === sale._id ? 'font-semibold text-gray-900' : 'text-gray-700'}>
                  {line._id === sale._id ? (
                    <>{lineName(line)}</>
                  ) : (
                    <Link href={`/dashboard/sales/${line._id}`} className="hover:text-primary hover:underline">
                      {lineName(line)}
                    </Link>
                  )}
                  <span className="ml-2 text-gray-400">
                    {line.quantity} × {formatMoney(line.unitPrice)}
                  </span>
                  {line.returnedQuantity > 0 && (
                    <span className="ml-2 text-xs text-gray-500">({line.returnedQuantity} returned)</span>
                  )}
                </span>
                <span className="font-medium text-gray-900">{formatMoney(line.totalAmount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-sm">
            <span className="text-gray-500">Total for the whole sale</span>
            <span className="font-semibold text-gray-900">{formatMoney(groupTotal)}</span>
          </div>
        </div>
      )}

      <DetailCard title="Details" icon="sales">
        <MoneyStrip
          items={[
            { label: isGroup ? 'Total (whole sale)' : 'Total', value: formatMoney(groupTotal), tone: 'brand' },
            { label: isGroup ? 'Paid (whole sale)' : 'Paid', value: formatMoney(groupPaid), tone: 'good' },
            balance > 0
              ? { label: isGroup ? 'Still owed (whole sale)' : 'Still owed', value: formatMoney(balance), tone: 'bad' }
              : { label: isGroup ? 'Still owed (whole sale)' : 'Still owed', value: formatMoney(0), tone: 'good', note: 'All settled' },
          ]}
        />
        <DetailGrid>
          <Detail label="Quantity" icon="hash" color="teal">
            {sale.quantity}
            {sale.returnedQuantity > 0 && (
              <span className="ml-1 text-xs font-normal text-gray-500">(of {sale.quantity + sale.returnedQuantity} sold)</span>
            )}
          </Detail>
          <Detail label="Unit price" icon="naira" color="green">{formatMoney(sale.unitPrice)}</Detail>
          <Detail label="Payment method" icon="wallet" color="teal">{sale.paymentMethod}</Detail>
          {returnedUnits > 0 && (
            <Detail label="Returned" icon="returns" color="amber">
              {returnedUnits} {returnedUnits === 1 ? 'unit' : 'units'} · {formatMoney(returnedValue)}
            </Detail>
          )}
          {isOwner && (
            <Detail label="Delivery" icon="deliveries" color="violet">
              {deliveryCost > 0 ? `You paid ${formatMoney(deliveryCost)}` : 'Not paid by you'}
            </Detail>
          )}
          <Detail label="Sold by" icon="user" color="sky">
            {sale.sellerName && <PersonChip name={sale.sellerName} photoUrl={sale.sellerPhotoUrl} />}
          </Detail>
          <Detail label="Recorded" icon="calendar" color="violet">{formatDateTime(sale.createdAt)}</Detail>
        </DetailGrid>

        <DetailSubhead title="Customer" icon="customers" />
        <DetailGrid>
          <Detail label="Name" icon="user" color="sky">{sale.customerName || sale.customer?.name || 'Walk-in'}</Detail>
          <Detail label="Country" icon="pin" color="rose">{customerPhone.country}</Detail>
          <Detail label="Phone number" icon="phone" color="sky">{customerPhone.display}</Detail>
          <Detail label="Address" icon="pin" color="rose" wide>{sale.customer?.address}</Detail>
        </DetailGrid>
      </DetailCard>

      {sale.tradeIn?.description && (
        <DetailCard title="Item swap" icon="swap" subtitle="The customer handed in an old item. Its value was taken off the price of the new one.">
          <DetailGrid>
            <Detail label="Item handed in" icon="swap" color="amber">{sale.tradeIn.description}</Detail>
            <Detail label="Its IMEI / serial" icon="hash" color="teal" mono>{sale.tradeIn.imei}</Detail>
            <Detail label="Condition" icon="note" color="amber">{sale.tradeIn.condition}</Detail>
            <Detail label="Valued at" icon="naira" color="green">{formatMoney(sale.tradeIn.value)}</Detail>
            <Detail label="Taken off the price" icon="naira" color="green">{formatMoney(sale.tradeIn.creditApplied)}</Detail>
            {sale.tradeIn.refundGiven > 0 ? (
              <Detail label="You gave back" icon="naira" color="red">{formatMoney(sale.tradeIn.refundGiven)}</Detail>
            ) : (
              <Detail label="Customer added" icon="naira" color="green">{formatMoney(sale.tradeIn.cashTopUp)}</Detail>
            )}
          </DetailGrid>
          <p className="mt-4 text-xs text-gray-500">
            A swap cannot be returned from here, because the old item was part of the payment. To undo one, speak to your administrator.
          </p>
        </DetailCard>
      )}

      {tracked.length > 0 && (
        <div className={`${cardClass} mb-6 p-6`}>
          <h2 className="mb-1 text-lg font-medium text-gray-900">IMEI / serial numbers and warranty</h2>
          <p className="mb-4 text-xs text-gray-400">Tap a number to see where that unit came from and where its warranty stands.</p>
          <ul className="divide-y divide-gray-100">
            {tracked.map((line) => {
              const w = line.quantity > 0 && line.warrantyEndsAt ? warrantyStatus(line.warrantyEndsAt) : null;
              return (
                <li key={line._id} className="py-3 text-sm">
                  <p className="font-medium text-gray-900">{lineName(line)}</p>
                  {w && (
                    <p className={`mt-0.5 text-xs ${w.state === 'expired' ? 'text-red-600' : 'text-green-700'}`}>
                      {warrantyLabel(line.warrantyMonths)} warranty · {w.text}
                    </p>
                  )}
                  {(line.serials || []).length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {line.serials.map((serial) => (
                        <li key={serial}>
                          <Link
                            href={`/dashboard/serials?q=${encodeURIComponent(serial)}`}
                            className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-800 hover:bg-gray-200"
                          >
                            {serial}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(line.returnedSerials || []).length > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      Returned:{' '}
                      {line.returnedSerials.map((serial, i) => (
                        <span key={serial}>
                          {i > 0 && ', '}
                          <Link href={`/dashboard/serials?q=${encodeURIComponent(serial)}`} className="font-mono hover:underline">
                            {serial}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {can('processReturns') && !sale.tradeIn?.description && (
        <ReturnPanel
          lines={lines}
          hasCustomer={Boolean(sale.customer)}
          onDone={async (message) => {
            setError('');
            setNotice(message || '');
            try {
              await load();
            } catch (err) {
              setError(err.message);
            }
          }}
        />
      )}

      {returns.length > 0 && (
        <div className={`${cardClass} mb-6 p-6`}>
          <h2 className="mb-4 text-lg font-medium text-gray-900">Returns on this sale</h2>
          <ul className="space-y-4">
            {returns.map((ret) => (
              <li key={ret._id} className="rounded-lg border border-gray-200 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-gray-900">{formatDateTime(ret.date || ret.createdAt)}</span>
                  <span className="text-xs text-gray-500">
                    {reasonLabel(ret.reason)}
                    {ret.processedByName ? ` · by ${ret.processedByName}` : ''}
                  </span>
                </div>
                <ul className="mt-2 text-gray-700">
                  {(ret.items || []).map((item, i) => (
                    <li key={`${item.sale}-${i}`} className="flex justify-between gap-3">
                      <span>
                        {item.quantity} × {item.productName || 'Item'}
                        {item.variantLabel ? ` · ${item.variantLabel}` : ''}
                        {!item.restocked && <span className="ml-2 text-xs text-amber-700">not put back in stock</span>}
                        {(item.serials || []).length > 0 && (
                          <span className="block break-all font-mono text-[11px] text-gray-500">{item.serials.join(', ')}</span>
                        )}
                      </span>
                      <span>{formatMoney(item.value)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-gray-500">
                  {ret.owedReduction > 0 && <>{formatMoney(ret.owedReduction)} taken off what they owed. </>}
                  {ret.refundAmount > 0 && (
                    <>
                      {formatMoney(ret.refundAmount)} {ret.refundMethod === 'credit' ? 'kept as' : 'given back as'}{' '}
                      {refundMethodLabel(ret.refundMethod)}.{' '}
                    </>
                  )}
                  {isOwner && ret.writtenOffCost > 0 && <>Cost written off: {formatMoney(ret.writtenOffCost)}. </>}
                </p>
                {ret.note && <p className="mt-1 text-xs italic text-gray-500">“{ret.note}”</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {photos.length > 0 && (
        <div className={`${cardClass} p-6`}>
          <h2 className="mb-4 text-lg font-medium text-gray-900">Sale photos</h2>
          <SaleGallery images={photos} />
        </div>
      )}
    </div>
  );
}
