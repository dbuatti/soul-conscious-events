import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Database, Mail, Globe, UserCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SEO from '@/components/SEO';
import PageHeader from '@/components/v2/PageHeader';

const Privacy = () => {
  return (
    <div className="w-full max-w-4xl px-4">
      <SEO
        title="Privacy Policy | SoulFlow Australia"
        description="How SoulFlow collects, uses, and protects your personal information."
      />
      <PageHeader
        eyebrow="Legal"
        title="Privacy policy"
        description="Last updated: October 2026. Your privacy matters to us — here's how we handle your data."
      />

      <div className="space-y-8 mb-16 text-foreground leading-relaxed">
        <section className="organic-card rounded-[1.75rem] p-6 space-y-3">
          <h2 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> 1. Introduction
          </h2>
          <p>
            SoulFlow ("we", "us", "our") operates the website at soulflowau.vercel.app and related services
            (collectively, the "Service"). This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you use our Service. Please read this policy carefully. If you
            do not agree with the terms of this policy, please do not access the Service.
          </p>
        </section>

        <section className="organic-card rounded-[1.75rem] p-6 space-y-3">
          <h2 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" /> 2. Information We Collect
          </h2>
          <h3 className="text-lg font-semibold mt-2">2.1 Personal Information</h3>
          <p>When you create an account or interact with our Service, we may collect:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Name and email address</strong> — when you sign up via email or Google OAuth.</li>
            <li><strong>Profile picture</strong> — retrieved from your Google account if you sign in with Google.</li>
            <li><strong>Account preferences</strong> — bookmarked events, favourite venues, and saved filters.</li>
          </ul>
          <h3 className="text-lg font-semibold mt-4">2.2 Event Submission Data</h3>
          <p>If you submit an event, we collect:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Event name, description, date, time, and recurring pattern.</li>
            <li>Venue name, full address, and geographic coordinates (if provided).</li>
            <li>Ticket link, price, and contact information (organiser name, email, phone).</li>
            <li>Event images you upload.</li>
            <li>Discount codes and special notes.</li>
          </ul>
          <h3 className="text-lg font-semibold mt-4">2.3 Automatically Collected Information</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Usage data:</strong> pages visited, events viewed, search queries, and filter selections.</li>
            <li><strong>Device information:</strong> browser type, operating system, and screen size.</li>
            <li><strong>Location data:</strong> approximate geographic location derived from your IP address or browser geolocation (only with your permission) to show nearby events.</li>
            <li><strong>Analytics:</strong> anonymised interaction data via our analytics system.</li>
          </ul>
        </section>

        <section className="organic-card rounded-[1.75rem] p-6 space-y-3">
          <h2 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" /> 3. How We Use Your Information
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>To provide the Service:</strong> display events, process submissions, and manage your account.</li>
            <li><strong>To review events:</strong> our team reviews submitted events before publication.</li>
            <li><strong>To communicate:</strong> send transactional emails (account confirmation, event approval/rejection, password resets).</li>
            <li><strong>To personalise:</strong> show events relevant to your location and preferences.</li>
            <li><strong>To improve:</strong> analyse usage patterns to enhance features and fix bugs.</li>
            <li><strong>To protect:</strong> detect and prevent fraud, abuse, and security incidents.</li>
          </ul>
          <p className="mt-2">We do not sell, rent, or trade your personal information to third parties.</p>
        </section>

        <section className="organic-card rounded-[1.75rem] p-6 space-y-3">
          <h2 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" /> 4. Information Sharing
          </h2>
          <p>We may share your information in the following circumstances:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Public event listings:</strong> event details you submit are displayed publicly on the platform.</li>
            <li><strong>Service providers:</strong> we use Supabase (database, auth, storage), Resend (email), and Google (OAuth, Maps) to operate the Service. These providers process data on our behalf under their own privacy policies.</li>
            <li><strong>Legal requirements:</strong> we may disclose information if required by law or to protect our rights.</li>
            <li><strong>Business transfers:</strong> in the event of a merger or acquisition, your data may be transferred to the new owner.</li>
          </ul>
        </section>

        <section className="organic-card rounded-[1.75rem] p-6 space-y-3">
          <h2 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <Lock className="h-6 w-6 text-primary" /> 5. Data Storage & Security
          </h2>
          <p>
            Your data is stored securely on Supabase (PostgreSQL) with row-level security policies.
            We use industry-standard encryption in transit (HTTPS/TLS) and at rest.
            Authentication is handled by Supabase Auth, including Google OAuth where you choose to use it.
            While we take reasonable precautions, no method of transmission over the internet is 100% secure.
          </p>
        </section>

        <section className="organic-card rounded-[1.75rem] p-6 space-y-3">
          <h2 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" /> 6. Cookies & Tracking
          </h2>
          <p>
            We use essential cookies to maintain your session and preferences. We may also use analytics
            cookies to understand how the Service is used. You can disable cookies in your browser settings,
            though this may affect functionality.
          </p>
        </section>

        <section className="organic-card rounded-[1.75rem] p-6 space-y-3">
          <h2 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-primary" /> 7. Your Rights
          </h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Access:</strong> request a copy of the personal data we hold about you.</li>
            <li><strong>Correction:</strong> request correction of inaccurate data.</li>
            <li><strong>Deletion:</strong> request deletion of your account and associated data.</li>
            <li><strong>Portability:</strong> request your data in a machine-readable format.</li>
            <li><strong>Objection:</strong> object to certain processing of your data.</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, contact us via the <Link to="/contact" className="text-primary hover:underline">contact page</Link>.
            We will respond within 14 days. You can also delete your account from your account settings.
          </p>
        </section>

        <section className="organic-card rounded-[1.75rem] p-6 space-y-3">
          <h2 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" /> 8. Contact Us
          </h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at{' '}
            <a href="mailto:daniele.buatti@gmail.com" className="text-primary hover:underline">daniele.buatti@gmail.com</a>{' '}
            or via our <Link to="/contact" className="text-primary hover:underline">contact page</Link>.
          </p>
        </section>

        <div className="text-center pt-4">
          <Button asChild variant="outline" className="rounded-full px-6">
            <Link to="/contact">Contact us</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Privacy;