import Link from 'next/link';
import LegalPage, { Section, List, Mail } from '@/components/site/LegalPage';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Refund Policy',
  description: `How refunds and cancellation work for ${SITE.name} subscriptions.`,
  alternates: { canonical: '/refund-policy' },
};

export default function RefundPolicy() {
  return (
    <LegalPage
      title="Refund Policy"
      intro={`We want you to be sure ${SITE.name} suits your business before you pay anything, which is why every new business gets a free trial with no card needed.`}
    >
      <Section title="Try it first">
        <p>
          Every new business has a {SITE.trialDays}-day free trial of the Business plan. You do not need to enter a card. Use that time to check that {SITE.name} works for your shop. You are only charged if you choose a paid plan and pay for it.
        </p>
      </Section>

      <Section title="Payments are not refundable">
        <p>
          Because of the free trial, subscription payments are not refunded once made. This applies to monthly and yearly payments, and we do not give part refunds for the unused part of a period.
        </p>
      </Section>

      <Section title="Mistaken or duplicate charges">
        <p>
          If you have been charged by mistake, for example twice for the same period, or charged after you had switched off automatic renewal, tell us at <Mail /> within 14 days of the charge. Please include the email on your account and the Paystack payment reference. If we confirm the error, we will refund the amount in question to the card that was charged.
        </p>
      </Section>

      <Section title="Cancelling">
        <List
          items={[
            'You can cancel at any time by turning off automatic renewal in the Billing page of the app.',
            'Once it is off we will not charge you again.',
            'You keep your paid plan until the end of the period you already paid for.',
            'After that your business moves to the Free plan. Your data is kept, and you can subscribe again whenever you like.',
          ]}
        />
      </Section>

      <Section title="How refunds are paid">
        <p>An approved refund goes back to the original card through Paystack. The time it takes to show in your account depends on your bank and is usually several working days.</p>
      </Section>

      <Section title="Questions">
        <p>
          Write to us at <Mail /> or see our <Link href="/contact" className="font-medium text-primary hover:underline">contact page</Link>. You can also read our <Link href="/terms" className="font-medium text-primary hover:underline">Terms of Service</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
