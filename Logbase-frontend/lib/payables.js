// What the business owes its suppliers. Only the administrator gets these numbers from the server.

// Adds up what is owed across suppliers (suppliers without a balance, or that are fully paid, add nothing).
export function totalOwed(suppliers) {
  const sum = (suppliers || []).reduce((total, s) => total + Math.max(Number(s.balance) || 0, 0), 0);
  return Math.round(sum * 100) / 100;
}

export function suppliersOwed(suppliers) {
  return (suppliers || []).filter((s) => Number(s.balance) > 0.004);
}

// "Paid", "Part paid" or "On credit" for a purchase line (older purchases were all paid in full).
// The administrator's records carry the amounts; for a staff only the on-credit flag is known.
export function purchasePayment(purchase) {
  if (!purchase || !purchase.onCredit) return { status: 'paid', label: 'Paid' };
  const paid = Number(purchase.amountPaid);
  if (Number.isFinite(paid) && paid > 0) return { status: 'partial', label: 'Part paid' };
  return { status: 'credit', label: 'On credit' };
}
