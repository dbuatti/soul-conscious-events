import { describe, expect, it } from 'vitest';
import { getUtmAttribution } from './analytics';

// Columns that exist on page_visit_logs (migration 0016). Sending any other
// key makes PostgREST reject the insert with PGRST204.
const PAGE_VISIT_UTM_COLUMNS = ['utm_source', 'utm_medium', 'utm_campaign'];

describe('getUtmAttribution', () => {
  it('only produces keys that exist as page_visit_logs columns', () => {
    const utm = getUtmAttribution('?utm_source=instagram&utm_medium=social&utm_campaign=weekly-picks&utm_content=bio&utm_term=x');
    expect(Object.keys(utm).sort()).toEqual([...PAGE_VISIT_UTM_COLUMNS].sort());
  });

  it('reads and trims UTM parameters', () => {
    expect(getUtmAttribution('?utm_source=%20instagram%20&utm_campaign=weekly-picks')).toEqual({
      utm_source: 'instagram',
      utm_medium: undefined,
      utm_campaign: 'weekly-picks',
    });
  });
});
