import { Link } from 'react-router-dom';
import { Scale, Shield, Users, AlertTriangle, Mail, FileText, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SEO from '@/components/SEO';
import PageHeader from '@/components/v2/PageHeader';

const Terms = () => {
  return (
    <div className="w-full max-w-4xl px-4">
      <SEO
        title="Terms of Service | SoulFlow Australia"
        description="The terms and conditions governing your use of SoulFlow."
      />
      <PageHeader
        eyebrow="Legal"
        title="Terms of service"
        description="Last updated: October 2026. Please read these terms before using SoulFlow."
      />

      <div className="space-y-8 mb-16 text-foreground leading-relaxed">
        <section className="organic-card rounded-[1.75rem] p-6 space-y-3">
          <h2 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" /> 1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using SoulFlow ("the Service"), you agree to be bound by these Terms of Service
            ("Terms"). If you do not agree to these Terms, please do not use the Service. We reserve the right
            to update these Terms at any time, and continued use constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className="organic-card rounded-[1.75rem] p-6 space-y-3">
          <h2 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> 2. Your Account
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You must provide accurate and complete information when creating an account.</li>
            <li>You must be at least 16 years of age to use the Service.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
          </ul>
        </section>

        <section className="organic-card rounded-[1.75rem] p-6 space-y-3">
          <h2 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> 3. Event Listings
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Event submissions are reviewed by our team before publication and may be declined at our discretion.</li>
            <li>You warrant that you have the right to publish the event and all associated content (including images).</li>
            <li>You agree not to submit misleading, fraudulent, or harmful content.</li>
            <li>SoulFlow is a discovery platform only and is not responsible for the quality, safety, or delivery of listed events.</li>
            <li>We reserve the right to remove or modify any listing that violates our community guidelines or these Terms.</li>
          </ul>
        </section>

        <section className="organic-card rounded-[1.75rem] p-6 space-y-3">
          <h2 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <Ban className="h-6 w-6 text-primary" /> 4. Prohibited Conduct
          </h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Use the Service for any unlawful purpose.</li>
            <li>Submit false, misleading, or fraudulent event information.</li>
            <li>Harass, abuse, or harm other users.</li>
            <li>Attempt to gain unauthorised access to the Service or other users' accounts.</li>
            <li>Use automated tools to scrape or overload the Service.</li>
            <li>Post content that is hateful, discriminatory, or violent.</li>
          </ul>
        </section>

        <section className="organic-card rounded-[1.75rem] p-6 space-y-3">
          <h2 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> 5. Intellectual Property
          </h2>
          <p>
            The SoulFlow name, logo, and branding are our property. Event content submitted by users remains
            the property of the respective event organisers. By submitting an event, you grant us a
            non-exclusive licence to display and promote it on the platform.
          </p>
        </section>

        <section className="organic-card rounded-[1.75rem] p-6 space-y-3">
          <h2 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" /> 6. Limitation of Liability
          </h2>
          <p>
            SoulFlow is provided "as is" without warranties of any kind, express or implied. We are not liable
            for any indirect, incidental, special, or consequential damages arising from your use of the Service.
            We do not guarantee the accuracy, completeness, or reliability of any event listing.
          </p>
        </section>

        <section className="organic-card rounded-[1.75rem] p-6 space-y-3">
          <h2 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" /> 7. Contact
          </h2>
          <p>
            Questions about these terms? Reach out via our <Link to="/contact" className="text-primary hover:underline">contact page</Link>
            or email <a href="mailto:daniele.buatti@gmail.com" className="text-primary hover:underline">daniele.buatti@gmail.com</a>.
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

export default Terms;