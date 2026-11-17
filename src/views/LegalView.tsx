import React, { useEffect } from 'react';
import { ArrowLeft, ShieldCheck, FileText, Mail } from 'lucide-react';
import { useRouter } from '../context/RouterContext';

/** Legal pages (/privacypolicy, /terms). Content is plain JSX so it stays
 *  easy to edit — Google's app verification reviewers expect to find the
 *  privacy policy reachable from the app UI, hence the footer link too. */

const CONTACT_EMAIL = 'support@enistream.com';
const LAST_UPDATED = 'November 17, 2026';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="flex items-center gap-2.5 text-base sm:text-lg font-extrabold tracking-tight text-white">
      <span className="w-1 h-5 rounded-full bg-gradient-to-b from-[#c084fc] to-[#a855f7] shrink-0" />
      {title}
    </h2>
    <div className="space-y-2.5 text-sm text-slate-300 leading-relaxed">{children}</div>
  </section>
);

const Bullets: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <ul className="space-y-1.5 pl-1">
    {items.map((item, i) => (
      <li key={i} className="flex gap-2.5 text-sm text-slate-300 leading-relaxed">
        <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#a855f7]/70 shrink-0" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const LegalShell: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  docTitle: string;
  children: React.ReactNode;
}> = ({ icon, title, subtitle, docTitle, children }) => {
  const { navigate } = useRouter();

  useEffect(() => {
    document.title = docTitle;
    return () => {
      document.title = 'EniStream - Anime Streaming';
    };
  }, [docTitle]);

  return (
    <div className="w-full pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        {/* Header */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#c084fc] transition-colors cursor-pointer mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </button>
        <div className="flex items-start gap-4 mb-8">
          <span className="w-12 h-12 rounded-2xl bg-[#8b5cf6]/15 border border-[#8b5cf6]/30 flex items-center justify-center text-[#c4b5fd] shrink-0">
            {icon}
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{title}</h1>
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-8 rounded-3xl border border-white/[0.08] bg-[#0d0b16]/80 backdrop-blur-md p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          {children}

          {/* Contact */}
          <section className="rounded-2xl border border-[#a855f7]/25 bg-[#a855f7]/[0.07] p-4 sm:p-5 flex items-start gap-3">
            <Mail className="w-4 h-4 text-[#c084fc] mt-0.5 shrink-0" />
            <div className="text-sm text-slate-300 leading-relaxed">
              Questions about this document? Contact us at{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-bold text-[#c084fc] hover:text-[#d8b4fe] transition-colors underline underline-offset-2"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Privacy Policy                                                      */
/* ------------------------------------------------------------------ */

export const PrivacyPolicyView: React.FC = () => (
  <LegalShell
    icon={<ShieldCheck className="w-6 h-6" />}
    title="Privacy Policy"
    subtitle={`Last updated: ${LAST_UPDATED}`}
    docTitle="Privacy Policy · EniStream"
  >
    <p className="text-sm text-slate-300 leading-relaxed">
      EniStream (&quot;we&quot;, &quot;our&quot;, &quot;the service&quot;) is an anime discovery and
      streaming interface available as a website and an Android application. This policy explains
      what information the service handles, why, and the choices you have. By using EniStream you
      agree to this policy.
    </p>

    <Section title="1. Information We Collect">
      <Bullets
        items={[
          <>
            <strong className="text-white">Account data</strong> — when you create an account or
            sign in (including with &quot;Continue with Google&quot;), our authentication provider
            Clerk processes your name, email address, and profile picture so we can identify your
            account and sync your lists.
          </>,
          <>
            <strong className="text-white">Watch data</strong> — your watchlist and watch history
            (titles, episode numbers, playback progress, timestamps). This is stored locally on
            your device and, when you are signed in, synced to your account so it follows you
            between the website and the Android app.
          </>,
          <>
            <strong className="text-white">Technical data</strong> — our hosting provider
            (Cloudflare) processes standard request logs such as IP address, user agent, and
            requested URLs for security and availability. We do not run advertising networks or
            third-party analytics trackers.
          </>,
        ]}
      />
    </Section>

    <Section title="2. Google User Data — Limited Use Disclosure">
      <p>
        If you sign in with Google, EniStream receives only your basic Google account profile
        (name, email address, profile picture) for authentication purposes.
      </p>
      <p className="font-semibold text-slate-200">
        EniStream&apos;s use and transfer to any other app of information received from Google
        APIs will adhere to the{' '}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noreferrer noopener"
          className="text-[#c084fc] hover:text-[#d8b4fe] underline underline-offset-2"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements.
      </p>
    </Section>

    <Section title="3. How We Use Information">
      <Bullets
        items={[
          'To provide the service: browse, search, and stream anime; maintain your watchlist and watch history; sync them across devices when signed in.',
          'To operate your account and keep you signed in securely.',
          'To protect the service from abuse, fraud, and technical attacks.',
          'We do not sell your personal information, and we do not use it for advertising.',
        ]}
      />
    </Section>

    <Section title="4. Third-Party Services">
      <p>EniStream relies on the following providers, each processing data under its own policy:</p>
      <Bullets
        items={[
          'Clerk — account creation, sign-in, and account management (clerk.com).',
          'Cloudflare — website hosting and content delivery (cloudflare.com).',
          'AniList — anime metadata, titles, and artwork via its public GraphQL API (anilist.co).',
          'Consumet API — aggregated anime metadata and stream-source information.',
          'Yenime — third-party embed player used for video playback.',
          'Google — identity provider when you choose "Continue with Google".',
        ]}
      />
      <p className="text-xs text-slate-400">
        Video playback happens inside embeds served by third parties. When you play an episode,
        those third parties may process technical data according to their own privacy policies.
      </p>
    </Section>

    <Section title="5. Data Retention & Deletion">
      <Bullets
        items={[
          'Local watch data stays on your device until you clear it (Profile → Continue Watching / My List management).',
          'When signed in, your synced watchlist and history are stored with your Clerk account and removed when you delete the account.',
          'You can delete your account from the profile menu (Manage Account). After deletion, synced account data is removed in line with Clerk\'s data practices.',
          'You may also email us to request access to, correction of, or deletion of your data.',
        ]}
      />
    </Section>

    <Section title="6. Cookies & Local Storage">
      <p>
        EniStream does not use advertising or tracking cookies. We use browser local storage to
        remember your session token, watchlist, watch history, and interface preferences. Clerk
        may set session cookies necessary to keep you signed in.
      </p>
    </Section>

    <Section title="7. Children's Privacy">
      <p>
        EniStream is not directed to children under 13, and we do not knowingly collect personal
        information from children under 13. If you believe a child has provided us personal
        information, contact us and we will delete it.
      </p>
    </Section>

    <Section title="8. Security">
      <p>
        Traffic to EniStream is encrypted in transit (HTTPS). Authentication and account data are
        handled by Clerk, a dedicated security-focused authentication provider. We do not collect
        payment information — the service is free.
      </p>
    </Section>

    <Section title="9. Changes to This Policy">
      <p>
        We may update this policy as the service evolves. Changes are published on this page with
        a new &quot;Last updated&quot; date at the top.
      </p>
    </Section>
  </LegalShell>
);

/* ------------------------------------------------------------------ */
/* Terms of Service                                                    */
/* ------------------------------------------------------------------ */

export const TermsView: React.FC = () => (
  <LegalShell
    icon={<FileText className="w-6 h-6" />}
    title="Terms of Service"
    subtitle={`Last updated: ${LAST_UPDATED}`}
    docTitle="Terms of Service · EniStream"
  >
    <p className="text-sm text-slate-300 leading-relaxed">
      These terms govern your use of the EniStream website and Android application. By using
      EniStream you agree to them.
    </p>

    <Section title="1. About the Service">
      <p>
        EniStream is a free anime discovery interface. Titles, synopses, artwork, and schedules
        come from the AniList community database via its public API, and playback is provided
        through third-party embed players. Creating an account is optional and only needed to
        sync your watchlist and watch history.
      </p>
    </Section>

    <Section title="2. Eligibility & Accounts">
      <Bullets
        items={[
          'You must be at least 13 years old to use EniStream.',
          'You are responsible for the accuracy of your account information and for keeping your credentials safe.',
          'You may delete your account at any time from the profile menu.',
        ]}
      />
    </Section>

    <Section title="3. Acceptable Use">
      <p>You agree not to:</p>
      <Bullets
        items={[
          'Use EniStream for any unlawful purpose or in violation of any applicable law or regulation.',
          'Scrape, harvest, or attempt to re-host EniStream\'s interface, or place abnormal automated load on the service or the APIs it relies on.',
          'Circumvent technical restrictions, regional controls, or the terms of the third-party services EniStream uses.',
          'Misrepresent EniStream as your own service or imply endorsement or affiliation with us or with any studio, publisher, or rights holder.',
        ]}
      />
    </Section>

    <Section title="4. Third-Party Content & Availability">
      <p>
        EniStream does not host, upload, or store any video files on its own servers. Episodes
        play through embeds served by independent third parties, and metadata is supplied by
        AniList and related public APIs. We do not control and are not responsible for the
        availability, quality, accuracy, legality, or safety of third-party content, and we make
        no guarantee that any title or feature will remain available.
      </p>
    </Section>

    <Section title="5. Intellectual Property">
      <p>
        The EniStream name, interface, and code are the property of the EniStream operators. All
        anime titles, artwork, and related content belong to their respective rights holders.
        Metadata from AniList is used in accordance with AniList&apos;s API terms. Nothing in
        these terms transfers ownership of any content to you.
      </p>
    </Section>

    <Section title="6. Copyright & Takedowns">
      <p>
        We respect the rights of copyright owners. If you are a rights holder (or an authorized
        agent) and believe content accessible through EniStream infringes your copyright, email
        us with: identification of the work, the exact URL(s) involved, your contact details, a
        statement of good-faith belief, and a statement made under penalty of perjury that you
        are authorized to act. We will review and remove or disable access where appropriate.
      </p>
    </Section>

    <Section title="7. Suspension & Termination">
      <p>
        We may suspend or terminate access to EniStream — with or without notice — for conduct
        that violates these terms, abuses the service or its providers, or creates risk for
        other users. Sections that by their nature should survive termination (disclaimers,
        liability limits, intellectual property) do so.
      </p>
    </Section>

    <Section title="8. Disclaimers & Liability">
      <p>
        EniStream is provided &quot;as is&quot; and &quot;as available&quot; without warranties
        of any kind, express or implied, including merchantability, fitness for a particular
        purpose, and non-infringement. To the maximum extent permitted by law, the EniStream
        operators are not liable for any indirect, incidental, special, consequential, or
        punitive damages, or for any loss of data, profits, or enjoyment arising from your use
        of the service or third-party content reached through it.
      </p>
    </Section>

    <Section title="9. Changes to These Terms">
      <p>
        We may update these terms as the service evolves. Continued use of EniStream after a
        change is published on this page constitutes acceptance of the updated terms.
      </p>
    </Section>
  </LegalShell>
);
