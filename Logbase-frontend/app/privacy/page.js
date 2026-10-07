import Link from 'next/link';
import LegalPage, { Section, List, Mail } from '@/components/site/LegalPage';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Privacy Policy',
  description: `How ${SITE.name} collects, uses and protects your information.`,
  alternates: { canonical: '/privacy' },
};

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`This policy explains what information ${SITE.name} (run by ${SITE.company}) collects, why, who it is shared with, and the choices you have. We handle personal information in line with the Nigeria Data Protection Act 2023.`}
    >
      <Section title="1. Who is responsible">
        <p>
          {SITE.company} is responsible for the information we collect about you as a {SITE.name} user. For the information you enter about your own customers, suppliers and staff, you (the business) decide what is collected and why, and {SITE.company} only stores and processes it for you to provide the service. Contact: <Mail />.
        </p>
      </Section>

      <Section title="2. What we collect">
        <List
          items={[
            'Account details: your name, email address, business name and a password. Passwords are stored only in scrambled (hashed) form; we cannot read them.',
            'Business records you enter: products, stock, sales, purchases, expenses, customers and suppliers (which may include names and phone numbers), staff accounts and the activity on your account.',
            'Pictures you upload, such as product photos.',
            'Billing information: your plan, payment history and Paystack payment references. If you choose automatic renewal, we keep a token from Paystack that lets us charge your saved card, together with the card brand, last four digits and expiry date. We never see or store your full card number or security code.',
            'Technical information needed to run the service, such as the device and browser type and when you signed in, and error information that helps us fix problems.',
          ]}
        />
      </Section>

      <Section title="3. How we use it">
        <List
          items={[
            'To provide and secure the service: signing you in, saving your records, syncing offline sales and showing your reports.',
            'To take payment and manage your subscription, including renewals.',
            'To send you messages about your account, such as password resets, receipts and billing or trial notices.',
            'To answer your questions and fix problems.',
            'To meet our legal obligations and to protect against fraud and misuse.',
          ]}
        />
        <p>We do not sell your information, and we do not show adverts or use advertising trackers.</p>
      </Section>

      <Section title="4. Who we share it with">
        <p>We use trusted companies to run parts of the service. They handle your information only to do that job for us.</p>
        <List
          items={[
            'Paystack, to process card payments and renewals.',
            'Cloudinary, to store and deliver the pictures you upload.',
            'Resend, to send our emails.',
            'Our hosting and database providers, who store your data on our behalf.',
          ]}
        />
        <p>We may also share information if the law requires it, or to protect the rights and safety of our users or ourselves. Other businesses on {SITE.name} can never see your records.</p>
      </Section>

      <Section title="5. Information stored on your device">
        <p>
          {SITE.name} keeps some information in your browser or app so that it can keep you signed in and work without internet. This includes your sign-in token, your light or dark mode choice and, for offline use, a copy of data needed to record sales and the sales waiting to sync. It is not used to track you across other websites. Signing out, or clearing your browser data, removes it, so make sure offline sales have synced first.
        </p>
      </Section>

      <Section title="6. How long we keep it">
        <p>We keep your information while your account is open. If you ask us to delete your account we will remove your business data, except for what we must keep to meet legal or accounting duties (such as payment records) or to settle a dispute, and then only for as long as needed. Backups are overwritten in the normal course.</p>
      </Section>

      <Section title="7. Keeping it safe">
        <p>We use measures such as hashed passwords, encrypted connections (HTTPS), access controls between businesses and limits on who at {SITE.company} can see data. No system is perfectly secure, so please use a strong password and keep it private.</p>
      </Section>

      <Section title="8. Your rights">
        <p>Under the Nigeria Data Protection Act you may ask to see the personal information we hold about you, correct it, have it deleted, object to or limit how it is used, or receive a copy of it. You can export your business data from the app. To use any of these rights, email <Mail />. You also have the right to complain to the Nigeria Data Protection Commission.</p>
        <p>If your information is in a business&apos;s records because you are one of its customers, please contact that business first, since it decides how that information is used.</p>
      </Section>

      <Section title="9. Children">
        <p>{SITE.name} is for businesses and is not meant for anyone under 18. We do not knowingly collect information from children.</p>
      </Section>

      <Section title="10. Changes">
        <p>We may update this policy. The date at the top shows when it was last changed, and we will tell you in the app or by email about significant changes.</p>
      </Section>

      <Section title="11. Contact">
        <p>
          Questions about this policy? Email <Mail /> or visit our <Link href="/contact" className="font-medium text-primary hover:underline">contact page</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
