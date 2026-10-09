import { ArrowRight, Link2, Wand2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface HostCTAProps {
  hasUser: boolean;
}

/** The "Hosting a gathering?" banner at the foot of the page. */
const HostCTA = ({ hasUser }: HostCTAProps) => (
  <section className="night-band mt-20 rounded-[2rem] overflow-hidden px-6 py-12 sm:px-12 sm:py-16 grid gap-10 lg:grid-cols-[1.1fr_1fr] items-center">
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent mb-4">For hosts &amp; facilitators</p>
      <h2 className="text-4xl sm:text-5xl font-heading font-semibold leading-[1.05] text-ink-foreground">
        Hosting a gathering?
        <br />
        <span className="italic font-medium text-accent">List it in under a minute.</span>
      </h2>
      <p className="mt-5 text-ink-foreground/70 max-w-md leading-relaxed">
        Paste your Humanitix, Eventbrite or Megatix link, or just your flyer text. Our assistant fills in the details for you. Free, always.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Button asChild size="lg" className="rounded-full h-12 px-7 font-semibold bg-primary hover:bg-primary/90">
          <Link to="/submit-event">List your event <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
        {!hasUser && (
          <Button asChild size="lg" variant="ghost" className="rounded-full h-12 px-7 font-semibold text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground">
            <Link to="/login">Create a free account</Link>
          </Button>
        )}
      </div>
    </div>

    <ol className="space-y-3">
      {[
        { icon: Link2, title: 'Paste a link or flyer', body: 'Ticketing page, Instagram caption or email. Anything works.' },
        { icon: Wand2, title: 'We fill in the details', body: 'Date, time, venue, price and a cover image, ready to review.' },
        { icon: Send, title: 'Publish & share', body: 'Your event appears in the guide and on the map straight away.' },
      ].map((step, i) => (
        <li key={step.title} className="flex gap-4 items-start rounded-2xl bg-ink-foreground/[0.06] border border-ink-foreground/10 p-4 sm:p-5">
          <span className="h-10 w-10 shrink-0 rounded-full bg-accent/15 text-accent flex items-center justify-center">
            <step.icon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-ink-foreground"><span className="text-ink-foreground/40 mr-1.5">{i + 1}.</span>{step.title}</p>
            <p className="text-sm text-ink-foreground/60 mt-0.5">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  </section>
);

export default HostCTA;