// What the app knows about the business settings (they arrive with the signed-in user), and a few words for them.

export const DEFAULT_SETTINGS = {
  organization: {
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    taxId: '',
    logoUrl: '',
    receipt: { showLogo: true, showAddress: true, showPhone: true, showSeller: true, footer: '', closing: '' },
  },
  preferences: { defaultPaymentMethod: 'cash', defaultReorderLevel: 0, expressPercent: 50 },
  approvalPolicies: {
    returns: { enabled: false, minAmount: 0 },
    stockAdjustments: { enabled: false, minUnits: 0 },
    discounts: { enabled: false, maxPercent: 0 },
    creditSales: { enabled: false, minAmount: 0 },
  },
};

// The line at the very bottom of a receipt: the business's own words, or this one when it has not written any.
export const DEFAULT_CLOSING = 'We appreciate your patronage';
export const closingOf = (org) => ((org && org.receipt && org.receipt.closing) || '').trim() || DEFAULT_CLOSING;

// The user's settings with anything missing filled in (an older copy kept on a phone may lack some)
export function settingsOf(user) {
  const s = (user && user.settings) || {};
  const o = s.organization || {};
  return {
    organization: { ...DEFAULT_SETTINGS.organization, ...o, name: o.name || (user && user.businessName) || '', receipt: { ...DEFAULT_SETTINGS.organization.receipt, ...(o.receipt || {}) } },
    preferences: { ...DEFAULT_SETTINGS.preferences, ...(s.preferences || {}) },
    approvalPolicies: {
      returns: { ...DEFAULT_SETTINGS.approvalPolicies.returns, ...((s.approvalPolicies || {}).returns || {}) },
      stockAdjustments: { ...DEFAULT_SETTINGS.approvalPolicies.stockAdjustments, ...((s.approvalPolicies || {}).stockAdjustments || {}) },
      discounts: { ...DEFAULT_SETTINGS.approvalPolicies.discounts, ...((s.approvalPolicies || {}).discounts || {}) },
      creditSales: { ...DEFAULT_SETTINGS.approvalPolicies.creditSales, ...((s.approvalPolicies || {}).creditSales || {}) },
    },
  };
}

export function anyPolicyOn(policies) {
  return Object.values(policies || {}).some((p) => p && p.enabled);
}

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card / POS' },
  { value: 'other', label: 'Other' },
];

// The lines that go under the business name on receipts and slips, following the owner's choices
export function identityLines(org, { forReceipt = true } = {}) {
  const o = org || DEFAULT_SETTINGS.organization;
  const r = o.receipt || DEFAULT_SETTINGS.organization.receipt;
  const lines = [];
  if (o.address && (!forReceipt || r.showAddress)) lines.push(o.address);
  const contact = [];
  if (o.phone && (!forReceipt || r.showPhone)) contact.push(o.phone);
  if (o.website) contact.push(o.website);
  if (contact.length) lines.push(contact.join('  |  '));
  if (o.taxId) lines.push(`Tax no: ${o.taxId}`);
  return lines;
}

// Plain-text version for WhatsApp / copy: the lines under the name, and the owner's message at the end
export function identityText(org) {
  return identityLines(org).join('\n');
}
