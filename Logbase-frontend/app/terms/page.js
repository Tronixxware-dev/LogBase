import Link from 'next/link';
import LegalPage, { Section, List, Mail } from '@/components/site/LegalPage';
import { SITE, PLANS, naira } from '@/lib/site';

export const metadata = {
  title: 'Terms of Service',
  description: `The terms for using ${SITE.name}, the inventory and sales app from ${SITE.company}.`,
  alternates: { canonical: '/terms' },
};

export default function Terms() {
  const starter = PLANS.find((p) => p.key === 'starter');
  const business = PLANS.find((p) => p.key === 'business');
  return (
    <LegalPage
      title="Terms of Service"
      intro={`These terms are the agreement between you and ${SITE.company} about your use of ${SITE.name}. Please read them. By creating an account or using ${SITE.name} you agree to them.`}
    >
      <Section title="1. Who we are and what the service is">
        <p>
          {SITE.name} is an online and offline-capable application, owned and run by {SITE.company} (&quot;we&quot;, &quot;us&quot;), that lets a business keep track of its products, stock, sales, purchases, customers, suppliers and expenses (the &quot;service&quot;). You can reach us at <Mail />.
        </p>
      </Section>

      <Section title="2. Who can use it">
        <p>You must be at least 18 years old and able to enter into a binding agreement. If you use {SITE.name} for a business, you confirm that you are allowed to act for that business.</p>
      </Section>

      <Section title="3. Your account">
        <List
          items={[
            'Give true information when you sign up and keep it up to date.',
            'Keep your password private. You are responsible for what happens under your account, including the actions of staff accounts you create.',
            'Tell us at once if you think someone else has got into your account.',
            'Each business account has an owner. The owner decides who else can use the business account and what they can do.',
          ]}
        />
      </Section>

      <Section title="4. Free trial, plans and limits">
        <p>
          New businesses get a {SITE.trialDays}-day free trial of the Business plan, with no card needed. When the trial or a paid period ends, the business moves to the Free plan.
        </p>
        <p>
          The plans are Free, Starter ({naira(starter.monthly)} a month or {naira(starter.yearly)} a year) and Business ({naira(business.monthly)} a month or {naira(business.yearly)} a year). Each plan has limits, for example on the number of products and staff accounts, which are shown on our <Link href="/#pricing" className="font-medium text-primary hover:underline">pricing section</Link> and in the app. Limits only stop you adding new items beyond the allowance. We do not delete or hide data you have already entered because of a plan change.
        </p>
        <p>We may change our prices or plans. A change to the price you pay will not affect a period you have already paid for, and we will tell you before it applies to your next payment.</p>
      </Section>

      <Section title="5. Payment and automatic renewal">
        <List
          items={[
            'Prices are in Nigerian naira (NGN).',
            'Payments are processed by Paystack. We do not see or store your full card number or card security code. See our Privacy Policy for what we do keep.',
            'If you choose to save your card for automatic renewal, we will charge the same plan for the next period when the current one ends. You can turn automatic renewal off at any time in the Billing page of the app, and no further charge will be made.',
            'If a payment fails, your plan will not be extended and the business moves to the Free plan when the paid period ends.',
          ]}
        />
        <p>
          Our <Link href="/refund-policy" className="font-medium text-primary hover:underline">Refund Policy</Link> explains refunds and cancellation.
        </p>
      </Section>

      <Section title="6. Your data">
        <p>
          The information you put into {SITE.name}, such as your products, sales and customer records, is yours. You give us permission to store it and process it only as needed to run the service for you, as described in our <Link href="/privacy" className="font-medium text-primary hover:underline">Privacy Policy</Link>.
        </p>
        <p>You can export your data from the app. If you ask us to delete your account, we will do so, subject to anything we are required by law to keep.</p>
        <p>You are responsible for having the right to enter your customers&apos; and suppliers&apos; information into {SITE.name}, and for using it lawfully.</p>
      </Section>

      <Section title="7. Using the service properly">
        <p>You agree not to:</p>
        <List
          items={[
            'use the service for anything unlawful, or to record or promote fraud;',
            'try to get into other businesses’ data, or interfere with or overload the service;',
            'copy, resell or reverse-engineer the service, except as the law allows;',
            'upload harmful code or content you have no right to share.',
          ]}
        />
        <p>We may suspend or close an account that breaks these terms, after warning you where it is reasonable to do so.</p>
      </Section>

      <Section title="8. Offline use">
        <p>
          {SITE.name} can keep recording sales when there is no internet. Those records are stored on your device first and are sent to your account when you are back online. Until then they exist only on that device, so please do not clear the browser or app data, or uninstall the app, on a device that has not finished syncing.
        </p>
      </Section>

      <Section title="9. Availability">
        <p>
          We work to keep {SITE.name} running and your data safe, but we cannot promise that it will always be available or free of errors. We may carry out maintenance or make changes to the service. Please keep your own records of anything that is critical to your business, and use the export feature regularly.
        </p>
      </Section>

      <Section title="10. Our responsibility">
        <p>
          The service is provided &quot;as is&quot;. To the extent the law allows, we are not liable for lost profits, lost business or indirect losses arising from your use of {SITE.name}, and our total liability to you for any claim is limited to the amount you paid us in the 3 months before the claim arose. Nothing in these terms limits liability that cannot lawfully be limited.
        </p>
        <p>The figures and reports in {SITE.name} depend on what is entered into it. They are tools to help you, not accounting, tax or legal advice.</p>
      </Section>

      <Section title="11. Ending the agreement">
        <p>You can stop using {SITE.name} at any time. We may stop providing the service, or end your access, if you break these terms or if we have to by law. If we end the service as a whole, we will give you reasonable notice and a chance to export your data.</p>
      </Section>

      <Section title="12. Changes to these terms">
        <p>We may update these terms from time to time. The date at the top shows when they were last changed. If a change is significant we will tell you in the app or by email. Using {SITE.name} after a change means you accept it.</p>
      </Section>

      <Section title="13. Governing law">
        <p>These terms are governed by the laws of the Federal Republic of Nigeria. We hope to settle any disagreement by talking first, so please contact us at <Mail /> before taking other steps.</p>
      </Section>

      <Section title="14. Contact">
        <p>
          {SITE.company}, <Mail />. See also our <Link href="/contact" className="font-medium text-primary hover:underline">contact page</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
