// Plain helpers for the Billing page and the plan banner (no React in here, so they are easy to test).

import { formatDate, formatMoney } from '@/lib/format';

// "Unlimited" or the number
export function limitText(limit) {
  return limit == null ? 'Unlimited' : Number(limit).toLocaleString();
}

// How full a meter is, 0 to 100. No limit = nothing to fill.
export function usagePercent(used, limit) {
  if (limit == null) return 0;
  if (limit === 0) return used > 0 ? 100 : 0;
  return Math.min(100, Math.round((Number(used) / limit) * 100));
}

// "3 days" / "1 day" / "today"
export function daysText(days) {
  if (days <= 0) return 'less than a day';
  return `${days} day${days === 1 ? '' : 's'}`;
}

// Why a laundromat's free trial or plan ended (the server says: sub.trialEndedBy is 'orders' or 'days'; an ended paid plan has neither)
function ordersEndedText(sub) {
  if (sub.state === 'expired') return `Your ${sub.lastPaidPlan ? `${sub.lastPaidPlan.charAt(0).toUpperCase()}${sub.lastPaidPlan.slice(1)} ` : ''}plan has ended.`;
  if (sub.trialEndedBy === 'orders' && sub.trialOrders) return `Your free trial has ended: you have taken ${sub.trialOrders.limit} orders.`;
  return 'Your free trial has ended.';
}

// The line at the top of the Billing page.
//   tone: 'good' | 'warn' | 'bad'
export function statusOf(sub) {
  if (!sub) return null;
  if (sub.state === 'trialing') {
    const orders = sub.trialOrders;
    if (orders) {
      const left = Math.max(0, orders.limit - orders.used);
      return {
        tone: sub.daysLeft <= 5 || left <= 10 ? 'warn' : 'good',
        label: 'Free trial',
        detail: `You are trying the ${sub.planName} plan free. The trial ends after ${orders.limit} orders or ${daysText(sub.daysLeft)} (${formatDate(sub.endsAt)}), whichever comes first. You have taken ${orders.used} of ${orders.limit} orders.`,
      };
    }
    return {
      tone: sub.daysLeft <= 5 ? 'warn' : 'good',
      label: 'Free trial',
      detail: `You are trying the ${sub.planName} plan free. ${daysText(sub.daysLeft)} left (ends ${formatDate(sub.endsAt)}).`,
    };
  }
  if (sub.state === 'active') {
    return {
      tone: sub.daysLeft <= 5 ? 'warn' : 'good',
      label: 'Active',
      detail: `Paid until ${formatDate(sub.endsAt)} (${daysText(sub.daysLeft)} left).`,
    };
  }
  if (sub.ordersBlocked) {
    return {
      tone: 'bad',
      label: 'Ended',
      detail: `${ordersEndedText(sub)} You cannot take new laundry orders until you choose a plan. Your existing orders are all still here.`,
    };
  }
  if (sub.state === 'expired') {
    return {
      tone: 'bad',
      label: 'Ended',
      detail: `Your ${sub.lastPaidPlan ? `${sub.lastPaidPlan.charAt(0).toUpperCase()}${sub.lastPaidPlan.slice(1)} ` : ''}plan ended, so you are back on the Free plan. Nothing was deleted.`,
    };
  }
  return {
    tone: 'warn',
    label: 'Free',
    detail: 'Your free trial has ended, so you are on the Free plan. Nothing was deleted.',
  };
}

// The strip shown at the top of every page for the administrator. null = nothing to say.
// autoRenew (optional) is what the server says about automatic renewal: when it is on, a plan that is about to
// end is not a worry (it renews by itself), but a charge that failed is.
// usage (optional) is what the business uses now ({ stocks: units in stock, staff }): the plan holds a number of units
// in stock, and the strip says so when the business is at or near that number.
export function bannerFor(sub, autoRenew, usage) {
  if (!sub) return null;
  if (sub.state === 'active' && autoRenew && autoRenew.enabled) {
    if (autoRenew.failedAttempts > 0) {
      return { tone: 'warn', text: 'We could not charge your card to renew your plan. We will try again, or you can renew it yourself.', cta: 'Fix it' };
    }
    return null;
  }
  if (sub.state !== 'active' && autoRenew && !autoRenew.enabled && autoRenew.failedAttempts >= 3) {
    return { tone: 'bad', text: 'Automatic renewal was switched off after your card was declined three times, so your plan was not renewed.', cta: 'Renew' };
  }
  // a laundromat: the free trial is counted in orders, and when it is over no new orders can be taken
  if (sub.ordersBlocked) {
    return { tone: 'bad', text: `${ordersEndedText(sub)} Choose a plan to take new laundry orders. Your existing orders stay here.`, cta: 'Choose a plan' };
  }
  if (sub.state === 'trialing' && sub.trialOrders) {
    const left = Math.max(0, sub.trialOrders.limit - sub.trialOrders.used);
    if (left <= 10) {
      return {
        tone: 'warn',
        text: `Your free trial ends after ${sub.trialOrders.limit} orders (or in ${daysText(sub.daysLeft)}, if that comes first). You have taken ${sub.trialOrders.used}, so ${left === 1 ? '1 order is' : `${left} orders are`} left.`,
        cta: 'Choose a plan',
      };
    }
  }
  const limit = sub.limits ? sub.limits.stocks : null;
  const units = usage ? Number(usage.stocks) : NaN;
  if (limit != null && Number.isFinite(units)) {
    if (units > limit) {
      return {
        tone: 'bad',
        text: `You have ${limitText(units)} units in stock, but the ${sub.planName} plan holds up to ${limitText(limit)}. You can keep selling, but you cannot add more stock until you upgrade.`,
        cta: 'Upgrade',
      };
    }
    if (units >= limit) {
      return {
        tone: 'bad',
        text: `You have reached the ${limitText(limit)} units in stock that the ${sub.planName} plan holds. Upgrade to add more stock.`,
        cta: 'Upgrade',
      };
    }
    if (limit > 0 && units >= limit * 0.9) {
      return {
        tone: 'warn',
        text: `You are using ${limitText(units)} of the ${limitText(limit)} units in stock that the ${sub.planName} plan holds.`,
        cta: 'Upgrade',
      };
    }
  }
  if (sub.state === 'trialing' && sub.daysLeft <= 5) {
    return {
      tone: 'warn',
      text: `Your free trial of the ${sub.planName} plan ends in ${daysText(sub.daysLeft)}.`,
      cta: 'Choose a plan',
    };
  }
  if (sub.state === 'active' && sub.daysLeft <= 5) {
    return {
      tone: 'warn',
      text: `Your ${sub.planName} plan ends in ${daysText(sub.daysLeft)}.`,
      cta: 'Renew',
    };
  }
  if (sub.state === 'expired' || sub.state === 'trial_ended') {
    const staff = sub.limits.staff === 0 ? 'no staff accounts' : `${limitText(sub.limits.staff)} staff`;
    return {
      tone: 'bad',
      text: `You are on the Free plan (up to ${limitText(sub.limits.stocks)} units in stock, ${staff}).`,
      cta: 'See plans',
    };
  }
  return null;
}

// What the plan card says about its limits
// For a laundromat (opts.laundromat) the stock line is about orders instead, since a laundromat holds no stock.
export function planLines(plan, opts = {}) {
  if (opts.laundromat) {
    const orders = plan.key === 'free' ? 'Free trial: 50 orders or 14 days, then upgrade' : 'Unlimited laundry orders';
    let staffLine;
    if (plan.limits.staff === 0) staffLine = 'No staff accounts (just you)';
    else if (plan.limits.staff == null) staffLine = 'Unlimited staff accounts';
    else staffLine = `Up to ${plan.limits.staff} staff accounts`;
    return [
      { text: orders, included: true },
      { text: staffLine, included: plan.limits.staff !== 0 },
      { text: 'Customers, receipts and payments', included: true },
      { text: 'Activity log: who did what', included: Boolean(plan.features.activityLog) },
    ];
  }
  const stocks = plan.limits.stocks == null ? 'Unlimited stock' : `Up to ${limitText(plan.limits.stocks)} units in stock`;
  let staff;
  if (plan.limits.staff === 0) staff = 'No staff accounts (just you)';
  else if (plan.limits.staff == null) staff = 'Unlimited staff accounts';
  else staff = `Up to ${plan.limits.staff} staff accounts`;
  return [
    { text: stocks, included: true },
    { text: staff, included: plan.limits.staff !== 0 },
    { text: 'Sales, returns, customers, receipts and statements', included: true },
    { text: 'Activity log: who did what', included: Boolean(plan.features.activityLog) },
  ];
}

// "₦10,000 a year, ₦2,000 less than paying monthly"
export function yearlySaving(plan) {
  return Math.max(0, plan.monthly * 12 - plan.yearly);
}

export function priceText(plan, interval) {
  return plan[interval] === 0 ? 'Free' : formatMoney(plan[interval]);
}

const CARD_BRANDS = { visa: 'Visa', mastercard: 'Mastercard', verve: 'Verve', amex: 'American Express' };

// "Visa ending 4081" (and when it expires, if known: "expires 12/30")
export function cardText(card) {
  if (!card || !card.last4) return '';
  const brand = CARD_BRANDS[String(card.brand || '').toLowerCase()] || 'Card';
  let text = `${brand} ending ${card.last4}`;
  if (card.expMonth && card.expYear) {
    const mm = String(card.expMonth).padStart(2, '0');
    const yy = String(card.expYear).slice(-2);
    text += ` (expires ${mm}/${yy})`;
  }
  return text;
}

// What to say about charges that failed, when there is something to say. null = nothing.
export function autoRenewNotice(autoRenew) {
  if (!autoRenew || !autoRenew.failedAttempts) return null;
  const why = autoRenew.lastFailure ? ` (${autoRenew.lastFailure})` : '';
  if (autoRenew.enabled) {
    return {
      tone: 'warn',
      text: `We could not charge your card${why}. We will try again tomorrow (attempt ${autoRenew.failedAttempts} of 3). You can also renew yourself below.`,
    };
  }
  return {
    tone: 'bad',
    text: `Automatic renewal was switched off after your card was declined${why}. Renew below to carry on.`,
  };
}

// What to tell the person about automatic renewal right after a payment (the server's answer for that payment)
export function autoRenewResultMessage(result) {
  if (result === 'on') return { tone: 'good', text: 'Automatic renewal is on. You can turn it off any time on this page.' };
  if (result === 'unsupported') {
    return { tone: 'warn', text: 'That payment method cannot be charged again automatically, so nothing will renew by itself. Pay with a debit card to use automatic renewal.' };
  }
  return null;
}

export const PAYMENT_STATUS = {
  success: { label: 'Paid', style: 'bg-green-100 text-green-700' },
  pending: { label: 'Not completed', style: 'bg-amber-100 text-amber-700' },
  failed: { label: 'Failed', style: 'bg-red-100 text-red-700' },
  flagged: { label: 'Needs review', style: 'bg-red-100 text-red-700' },
};

// What to tell the person after we asked the server about a payment
export function outcomeMessage(outcome, planName) {
  switch (outcome) {
    case 'success':
      return { tone: 'good', text: `Payment received. Your ${planName} plan is active.` };
    case 'pending':
      return { tone: 'warn', text: 'Paystack has not confirmed this payment yet. If you were charged, wait a minute and check again.' };
    case 'failed':
      return { tone: 'bad', text: 'The payment did not go through, so you were not charged. You can try again.' };
    case 'flagged':
      return { tone: 'bad', text: 'This payment did not match what we asked for, so it was not applied. Please contact support with your payment reference.' };
    default:
      return null;
  }
}
