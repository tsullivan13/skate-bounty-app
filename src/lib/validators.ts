// src/lib/validators.ts
export function normalizeInstagramUrl(url: string): string {
    const trimmed = (url ?? '').trim();
    const u = new URL(trimmed);
    if (!/instagram\.com$/i.test(u.hostname)) throw new Error('Not an Instagram URL');
    // Allow /reel/, /reels/, /p/, /tv/, /stories/
    if (!/\/(reel|reels|p|tv|stories)\//i.test(u.pathname)) {
        throw new Error('Use a post/reel/stories URL (not a profile/home link)');
    }
    u.protocol = 'https:';           // force https
    if (!/^www\./i.test(u.hostname)) u.hostname = 'www.' + u.hostname; // force www
    u.search = '';                   // strip tracking params
    u.hash = '';
    return u.toString();
}

export function assertPostedAfter(
    bountyCreatedAt: string | Date,
    postedAt: string | Date
) {
    const b = new Date(bountyCreatedAt);
    const p = new Date(postedAt);
    if (isNaN(b.getTime()) || isNaN(p.getTime())) {
        throw new Error('Invalid date(s)');
    }
    if (p < b) {
        throw new Error('Instagram post must be on/after the bounty creation date');
    }
}
