import Link from 'next/link';
import LegalPage, { Section, List, Mail } from '@/components/site/LegalPage';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Delete your account',
  description: `How to delete your ${SITE.name} account and its data, what is deleted and what is kept.`,
  alternates: { canonical: '/delete-account' },
};

// The page the Google Play "Data safety" form links to ("Delete account URL").
export default function DeleteAccount() {
  return (
    <LegalPage
      title={`Delete your ${SITE.name} account`}
      intro={`${SITE.name} is made by ${SITE.company}. You can delete your account and its data yourself, at any time, in the ${SITE.name} app or on the website. This page shows how, what is deleted and what is kept.`}
    >
      <Section title="How to delete your account">
        <ol className="list-decimal space-y-2 pl-5 marker:text-gray-400">
          <li>Open the {SITE.name} app (or go to mylogbase.com) and sign in.</li>
          <li>
            Open <strong>Your profile</strong> from the menu.
          </li>
          <li>
            Scroll down to <strong>Delete account</strong> and choose <strong>Delete my account</strong>.
          </li>
          <li>Enter your password. If you are the owner of the business, also type DELETE to confirm.</li>
          <li>
            Choose <strong>Delete my business forever</strong> (owner) or <strong>Delete my login forever</strong> (staff).
          </li>
        </ol>
        <p>
          The deletion happens straight away. If you would like a copy of your records first, open <strong>Import &amp; export</strong> in the menu and download them before you delete.
        </p>
      </Section>

      <Section title="What is deleted">
        <p>When the owner of a business deletes the account, the whole business is deleted, and nobody can sign in to it again:</p>
        <List
          items={[
            'Your account details: name, email address, phone number and password.',
            'All business records: products, stock, sales, purchases, expenses, customers, suppliers, repairs, orders and the activity log.',
            'All pictures you uploaded, such as product photos and your logo.',
            'Every staff login of that business.',
          ]}
        />
        <p>
          When a staff member deletes their own account, only their login is removed. The sales and other records they made stay in the business&apos;s history, because they belong to the business, and the owner can still see them.
        </p>
      </Section>

      <Section title="What is kept, and for how long">
        <p>
          We keep only what the law and accounting require: records of plan payments (the amount, date and Paystack payment reference), without your name, email address, phone number or address. Backups are overwritten in the normal course. Nothing else is kept.
        </p>
      </Section>

      <Section title="If you cannot sign in">
        <p>
          If you have forgotten your password, use <Link href="/forgot-password" className="font-medium text-primary hover:underline">Forgot password</Link> first, then follow the steps above. If you still cannot get into your account, email <Mail /> from the email address you signed up with, tell us your business name, and ask us to delete the account. We will confirm by email once it is done.
        </p>
      </Section>

      <Section title="More information">
        <p>
          See our <Link href="/privacy" className="font-medium text-primary hover:underline">Privacy Policy</Link> for what we collect and how it is used.
        </p>
      </Section>
    </LegalPage>
  );
}
