import { Event } from '@/types/event';
import { formatPrice } from '@/utils/event-utils';

/**
 * How a visitor can actually secure a place at an event.
 *
 * Not every organiser sells through a ticketing platform. Plenty run bookings
 * through a DM, a PayID/Stripe link, or a post that holds all the details, so
 * "ticket link" is too narrow a concept to hang the UI on.
 */
export type BookingMode = 'link' | 'contact' | 'none';

export type ContactKind = 'instagram' | 'email' | 'phone' | 'plain';

export interface BookingTarget {
  mode: BookingMode;
  /** Where the CTA sends the visitor. `null` means there is nothing to open. */
  href: string | null;
  /** Primary button text. */
  label: string;
  /** One-line explanation shown under the button (optional). */
  note?: string;
  /** Whether the link leaves the app (opens a new tab). */
  external: boolean;
}

export const ensureProtocol = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INSTAGRAM_URL_PATTERN = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)/i;
// Requires the @ to start a word so the domain part of an email never matches.
const HANDLE_PATTERN = /(?:^|[\s,;|/])@([A-Za-z0-9._]{2,30})/;
const PHONE_SHAPE_PATTERN = /^\+?[\d\s\-().]{7,}$/;

const firstEmail = (raw: string): string | null => {
  const match = raw.match(/[^\s,;|]+@[^\s,;|]+\.[A-Za-z]{2,}/);
  return match && EMAIL_PATTERN.test(match[0]) ? match[0] : null;
};

const phoneDigits = (raw: string): string | null => {
  const candidate = raw.trim();
  if (!PHONE_SHAPE_PATTERN.test(candidate)) return null;
  const digits = candidate.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
};

/**
 * Works out what an organiser contact string ("Cara @handle", an email, a phone
 * number, or just a name) should link to. Plain names are kept as text rather
 * than guessed at.
 */
export const parseOrganiserContact = (
  raw?: string | null,
): { kind: ContactKind; href: string | null; handle?: string; name?: string } => {
  const value = (raw ?? '').trim();
  if (!value) return { kind: 'plain', href: null };

  const instagram = value.match(INSTAGRAM_URL_PATTERN);
  if (instagram) {
    return {
      kind: 'instagram',
      href: `https://instagram.com/${instagram[1]}`,
      handle: instagram[1],
    };
  }

  const email = firstEmail(value);
  if (email) return { kind: 'email', href: `mailto:${email}` };

  const handle = value.match(HANDLE_PATTERN);
  if (handle) {
    return {
      kind: 'instagram',
      href: `https://instagram.com/${handle[1]}`,
      handle: handle[1],
    };
  }

  const digits = phoneDigits(value);
  if (digits) return { kind: 'phone', href: `tel:${digits}` };

  // "Cara" or "Cara from Embodied Abundance" -> usable for "Contact Cara".
  const name = value.split(/[,;|]/)[0].trim();
  return {
    kind: 'plain',
    href: null,
    name: name.length > 0 && name.length <= 24 && name.split(/\s+/).length <= 3 ? name : undefined,
  };
};

type BookableEvent = Pick<Event, 'ticket_link' | 'organizer_contact' | 'price'>;

/**
 * Some organisers point the booking link at the post that holds all the
 * details rather than at a checkout. Calling that "Get tickets" would lie.
 */
const INFO_POST_PATTERN = /(^|\.)(instagram\.com|facebook\.com|fb\.me|threads\.net|tiktok\.com)$/i;

const hostOf = (url: string): string | null => {
  try {
    return new URL(ensureProtocol(url)).hostname;
  } catch {
    return null;
  }
};

export const getBookingTarget = (event: BookableEvent): BookingTarget => {
  const link = event.ticket_link?.trim();
  if (link) {
    const href = ensureProtocol(link);
    const host = hostOf(href);

    if (host && INFO_POST_PATTERN.test(host)) {
      return {
        mode: 'link',
        href,
        label: 'See full details',
        note: 'The organiser posts booking details here.',
        external: true,
      };
    }

    const price = event.price?.trim();
    const showPrice = !!price && price.toLowerCase() !== 'free';
    return {
      mode: 'link',
      href,
      label: showPrice ? `Get tickets · ${formatPrice(price)}` : 'Get tickets',
      external: true,
    };
  }

  const contact = parseOrganiserContact(event.organizer_contact);
  if (contact.href) {
    const label =
      contact.kind === 'instagram' && contact.handle
        ? `Message @${contact.handle}`
        : contact.kind === 'email'
          ? 'Email to book'
          : 'Call to book';
    return {
      mode: 'contact',
      href: contact.href,
      label,
      note: 'Bookings are arranged directly with the host.',
      external: contact.kind === 'instagram',
    };
  }

  return {
    mode: 'none',
    href: null,
    label: contact.name ? `Contact ${contact.name}` : 'Contact the host',
    note: contact.name
      ? 'Get in touch with the host to reserve a spot.'
      : 'No booking link was provided. Check the event details for how to book.',
    external: false,
  };
};
