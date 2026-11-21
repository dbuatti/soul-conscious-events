// Shared relevance vocabulary for imported and user-submitted events.
//
// Imported by the Deno edge functions and by the Vite client, so this file must
// stay free of Deno/browser globals and network or database access.
//
// A city-wide listing on a ticketing platform is mostly noise: one Melbourne
// source yielded 114 events of which 17 were relevant. Nothing is dropped on
// the strength of this -- every verdict is recorded and shown in the review
// inbox behind a toggle -- but it lets an admin see the plausible events first.

export type Relevance = 'on-topic' | 'off-topic' | 'unsure';

/** Terms that mark an event as belonging to the site's remit. */
const ON_TOPIC_TERMS = [
  // Practices and modalities
  /sound\s*bath/i, /sound\s*healing/i, /sound\s*journey/i, /sound\s*meditation/i,
  /sound\s*scape/i, /gong/i, /singing\s*bowl/i, /crystal\s*bowl/i,
  /meditat/i, /breath\s?work/i, /pranayama/i, /yoga/i, /pilates/i,
  /kundalini/i, /reiki/i, /chiropract/i, /bodywork/i, /bowen/i, /somatic/i,
  /craniosacral/i, /shiatsu/i, /ayurved/i, /naturopath/i, /homeopath/i,
  /eurythmy/i, /healing/i, /chakra/i, /aura/i, /vibrational/i, /holistic/i,
  /energy\s*healing/i, /tibetan/i, /ayurvedic/i, /herbal/i, /intuitive/i,
  // Ritual, circle and community practice
  /chant/i, /kirtan/i, /mantra/i, /drum\s*circle/i, /singing\s*circle/i,
  /shamanic/i, /ritual/i, /ceremon(y|ies)/i, /sacred/i, /feminine/i, /womb/i,
  /embodied/i, /tantra/i, /\bspiritual\b/i, /\bmythic\b/i, /transformational/i,
  /healing\s*circle/i, /support\s*circle/i, /women[’']?s?\s*(circle|gathering|group)/i,
  /\bcircles?\s+for\b/i, /big-hearted/i,
  // Expression
  /\bvoice\b/i, /\bvocal\b/i, /\bsinging\b/i, /\bchant\b/i,
  /\bdance\b/i, /ecstatic/i, /belly\s*dance/i,
  // Wellbeing framing. Deliberately generous: an on-topic signal beats an
  // off-topic one, so a "sound bath at a music festival" survives.
  /wellbeing/i, /\bwellness\b/i, /self\s*love/i, /inner\s*work/i,
  /\bsoul\s*work/i, /restorative/i, /\bnourish/i, /\bretreat\b/i,
  /\bsleep\b/i, /\binsomnia\b/i, /\btrauma\b/i, /\bhealing\b/i,
  /mind[\s-]?body/i, /body\s*(and|&)\s*mind/i, /emotional\s*health/i,
  // Intention and community framing. These carry no practice of their own --
  // they rescue descriptions of events that are about connection rather than
  // about a named modality. Verified as inert against the 122 real event names
  // imported so far (it flips none of them) while flipping a community-framed
  // listing that the format words "party" and "DJ" would otherwise bury.
  /\bmeaningful\b/i, /\bmagical\b/i, /\bintention\w*/i, /\bconscious\w*/i,
  /awak(e|en|ing)\b/i, /\bpresence\b/i, /\bauthentic\w*/i, /\bvulnerab\w*/i,
  /holding\s+space/i, /safe\s?space/i, /all\s+welcome/i, /inner\s+child/i,
  /\bdivine\b/i, /\buniverse\b/i, /\bbliss\b/i, /\btransformation\b/i,
  /whole\s*self/i,
];

/**
 * Weak signals. They keep a listing in the review queue but do not publish it
 * on their own. "Mindful calligraphy" and "mindful pottery" are craft classes
 * using wellness language, not the conscious events the front page promises.
 * A stronger practice word elsewhere in the text still wins.
 */
const SOFT_ON_TOPIC_TERMS = [
  /mindful/i,
];

/**
 * Terms that mark an event as outside the remit. Deliberately narrow: these are
 * genres and formats, not the venue words that legitimate events also use
 * ("festival", "workshop" and "market" are absent -- "Battle of the Bands"
 * arrives via "gig", and "Battle of the Bands" is caught by that).
 */
const OFF_TOPIC_TERMS = [
  // Live music. "bands?" not "band": "Battle of the Bands" is the plural.
  /\bgigs?\b/i, /concerts?\b/i, /\bbands?\b/i, /\bthe band\b/i, /\bdj\b/i,
  /orchestra/i, /choir/i, /chorus/i, /quartet/i, /\btrio\b/i, /\bduo\b/i,
  /violin|cello|viola|piano|trumpet|saxophone|clarinet|flute\b/i,
  /jazz|blues|reggae|classical|hip.?hop|metal|punk|indie\b/i,
  /\blive\b/i, /\btour\b/i, /tribute/i, /cover\s*band/i,
  // Comedy and performance formats
  /comedy/i, /stand\s?up/i, /open\s*mic/i, /poetry\s*slam/i, /\bdrag\b/i,
  /pageant|parade|karaoke|cabaret/i, /magic\s*show/i, /murder\s*mystery/i,
  // Trade, expo and professional
  /\bexpos?\b/i, /trade\s*show/i, /careers?\s*(fair|expo|market)/i,
  /seminar/i, /symposium/i, /congress/i, /convention/i, /\bconference\b/i,
  /masterclass/i, /certification/i, /webinar/i, /\blecture\b/i, /\bsummit\b/i,
  /career|networking|startup|\bb2b\b/i,
  /exhibition|\bexhibit\b/i, /\bprize\b|\baward\b/i, /photograph/i,
  /\bshowcase\b/i, /music\s*industry/i, /\bplush\b/i,
  /silent\s*disco/i, /board\s*game/i, /yo-?yo/i, /\bskate\b/i,
  // Clinical and medical
  /neonat|obstetric|gynaec|gynec|oncolog|psychiatr|dermatolog|immunolog|cardio/i,
  /diabet|celiac|coeliac|syndrome|\bpatients?\b/i, /\bclinical\b/i,
  /blood\s*drive|vaccination|screening\s*clinic/i,
  // Fashion, market and retail
  /fashion/i, /runway/i, /\bbazaar\b/i, /\bmarket\b/i, /\bsale\b/i,
  /\bpre-loved\b|\bsecond\s*hand\b/i, /swap\s*me/i,
  // Party and club
  /\brave\b/i, /\bdoof\b/i, /psytrance|\bedm\b/i, /club\s*night/i,
  /\bparty\b/i, /\bhalloween\b/i, /takeover/i, /\bdj\s*set\b/i,
  // Social and leisure
  /wedding/i, /\bdinner\b/i, /brunch\b/i, /tasting/i, /ferris|wheel\b|carnival/i,
  /film\s*(night|screening)|cinema/i, /quiz\s*night|trivia/i,
  /garage\s*sale|market\s*day/i, /kids?\s*party/i,
];

/**
 * A strong on-topic word wins a tie, so a "sound bath at a festival" stays.
 * A soft word alone is deliberately not a publishing verdict: it leaves the
 * event as 'unsure' so a human decides. Only an event with off-topic signals
 * and no on-topic signal at all is called off-topic.
 */
export const scoreRelevance = (...texts: (string | null | undefined)[]): Relevance => {
  const text = texts.filter(Boolean).join(' \n ');
  if (!text) return 'unsure';
  if (ON_TOPIC_TERMS.some((re) => re.test(text))) return 'on-topic';
  if (OFF_TOPIC_TERMS.some((re) => re.test(text))) return 'off-topic';
  // Kept as an explicit branch so the demotion is visible to the next reader.
  if (SOFT_ON_TOPIC_TERMS.some((re) => re.test(text))) return 'unsure';
  return 'unsure';
};

/**
 * Set-and-forget triage for imports: a confident wellness match goes live
 * immediately, an obvious miss is stored rejected so it is never re-imported,
 * and anything in between waits for a human. Rejected is stored rather than
 * skipped -- dropping it would make the daily run import the same noise forever.
 */
export const approvalFor = (relevance: Relevance | null | undefined): 'approved' | 'pending' | 'rejected' =>
  relevance === 'on-topic' ? 'approved' : relevance === 'off-topic' ? 'rejected' : 'pending';
