import {expect, it} from 'vitest';
import * as storage from '../src/lib/authStorage';
import {createAuthHeaders, uploadPublicFile, toAbsoluteFileUrl} from '../src/lib/api';
import {convertDateToInput, convertDateToApi, formatDateDisplay} from '../src/lib/date';
import {naturalSort} from '../src/lib/sort';

it.each([null, undefined, ''])('empty token %j clears only the staff token', value => {
    localStorage.setItem('access_token', 'applicant-token');
    storage.setStaffAccessToken('staff-token'); storage.setStaffAccessToken(value);
    expect(storage.getStaffAccessToken()).toBeNull(); expect(localStorage.getItem('access_token')).toBe('applicant-token');
});
it('session cleanup removes staff state and filters but preserves unrelated portal state', () => {
    storage.setStaffAccessToken('token'); storage.setStaffUserEmail('staff@example.invalid');
    storage.setStaffUserInfo({designation: 'CDPO'}); storage.setApplicantsFilters('drive', {search: 'test'});
    localStorage.setItem('access_token', 'applicant-token'); storage.clearStaffSession();
    expect(storage.getStaffAccessToken()).toBeNull(); expect(storage.getStaffUserInfo()).toBeNull();
    expect(storage.getApplicantsFilters('drive')).toBeNull(); expect(localStorage.getItem('access_token')).toBe('applicant-token');
});
it('corrupted metadata and filters do not crash storage reads', () => {
    localStorage.setItem(storage.STAFF_STORAGE_KEYS.userInfo, '{');
    localStorage.setItem(storage.STAFF_STORAGE_KEYS.applicantsFilters, '{');
    expect(storage.getStaffUserInfo()).toBeNull(); expect(storage.getApplicantsFilters('drive')).toBeNull();
});
it('filters remain scoped to their application', () => {
    storage.setApplicantsFilters('a', {search: 'Alice'}); storage.setApplicantsFilters('b', {search: 'Bob'});
    expect(storage.getApplicantsFilters('a')).toEqual({search: 'Alice'});
    expect(storage.getApplicantsFilters('b')).toEqual({search: 'Bob'});
});
it.each(['https://evil.invalid', '//evil.invalid', '/applicants', '/zp-staff'])('rejects unrelated pending redirect %s', path => {
    storage.setStaffPendingRedirect(path); expect(storage.getStaffPendingRedirect()).toBeNull();
});
it('keeps an internal pending redirect with query and fragment', () => {
    storage.setStaffPendingRedirect('/zp-staff/drive/applicants?search=test#row');
    expect(storage.getStaffPendingRedirect()).toBe('/zp-staff/drive/applicants?search=test#row');
});
it('auth headers use the staff token and preserve caller headers', () => {
    expect(createAuthHeaders({'Accept-Language': 'mr'})).toEqual({'Accept-Language': 'mr'});
    storage.setStaffAccessToken('staff-token');
    expect(createAuthHeaders({'Accept-Language': 'mr'})).toEqual({'Accept-Language': 'mr', Authorization: 'Bearer staff-token'});
});
it('public upload uses multipart rather than a forged JSON content type', async () => {
    storage.setStaffAccessToken('token'); fetch.mockResolvedValue({json: async () => ({result: true, data: 'asset'})});
    const file = new File(['test'], 'test.pdf', {type: 'application/pdf'});
    await uploadPublicFile(file);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://api.gramsamruddhi.in/upload');
    expect(options.headers).toEqual({'X-Bucket-Name': 'public', Authorization: 'Bearer token'});
    expect(options.body.get('file').name).toBe('test.pdf');
});
it.each([[null, ''], ['', ''], ['abc', 'https://files.gramsamruddhi.in/abc'], ['https://example.invalid/doc', 'https://example.invalid/doc']])( 'file URL mapping preserves valid absolute destinations (%j)', (value, expected) => expect(toAbsoluteFileUrl(value)).toBe(expected));
it.each([
    ['2026-07-15T18:30:00Z', '2026-07-16', '16-07-2026'],
    ['2026-07-15T18:29:59Z', '2026-07-15', '15-07-2026'],
    ['2026-01-01', '2026-01-01', '01-01-2026'],
    ['31-12-2026', '2026-12-31', '31-12-2026'],
    ['', '', ''],
])('dates retain IST day boundaries for %s', (input, html, api) => {
    expect(convertDateToInput(input)).toBe(html); expect(convertDateToApi(input)).toBe(api);
});
it('invalid display dates remain readable and natural sorting sorts numeric identifiers', () => {
    expect(formatDateDisplay('invalid')).toBe('invalid');
    expect(['Centre 10', 'Centre 2', 'Centre 1'].sort(naturalSort)).toEqual(['Centre 1', 'Centre 2', 'Centre 10']);
});
