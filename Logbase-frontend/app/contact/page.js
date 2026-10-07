import LegalPage, { Section, Mail } from '@/components/site/LegalPage';
import { Icon } from '@/components/Icons';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Contact us',
  description: `Get in touch with the ${SITE.name} team at ${SITE.company}.`,
  alternates: { canonical: '/contact' },
};

export default function Contact() {
  return (
    <LegalPage
      title="Contact us"
      showUpdated={false}
      intro={`Questions about ${SITE.name}, your subscription or your data? Send us an email and a real person will reply.`}
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon name="mail" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="mt-0.5 text-lg">
              <Mail />
            </p>
            <p className="mt-2 text-sm text-gray-600">We aim to reply within 2 working days.</p>
          </div>
        </div>
      </div>

      <Section title="Helping us help you faster">
        <p>When you write, please tell us the email you signed up with and your business name. For a payment question, add the Paystack payment reference. Never send your password or your full card number; we will never ask for them.</p>
      </Section>

      <Section title="About us">
        <p>
          {SITE.name} is a product of {SITE.company}, a software business building tools for small and growing businesses.
        </p>
      </Section>
    </LegalPage>
  );
}
