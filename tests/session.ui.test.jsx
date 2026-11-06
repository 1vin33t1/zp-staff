import {act, renderHook} from '@testing-library/react';
import {beforeEach, expect, it, vi} from 'vitest';
import {useStaffSession} from '../src/hooks/useStaffSession';
import * as storage from '../src/lib/authStorage';

const {navigate} = vi.hoisted(() => ({navigate: vi.fn()}));
vi.mock('react-router-dom', () => ({useNavigate: () => navigate}));
beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-07T00:00:00Z'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetch.mockResolvedValue({status: 200, json: async () => ({accessToken: 'new-token', user: 'staff@example.invalid'})});
});
const seed = (age = 0) => {
    storage.setStaffAccessToken('token'); storage.setStaffUserEmail('staff@example.invalid');
    storage.setStaffLastActivity(new Date(Date.now() - age).toISOString()); storage.setStaffLastRefresh();
};

it('initializes an anonymous session without network activity', () => {
    const {result} = renderHook(() => useStaffSession());
    expect(result.current.authReady).toBe(true); expect(result.current.isAuthenticated).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
});
it('restores a recent complete session', () => {
    seed(); const {result} = renderHook(() => useStaffSession());
    expect(result.current.isAuthenticated).toBe(true); expect(result.current.userEmail).toBe('staff@example.invalid');
});
it('expires stale sessions at startup', () => {
    seed(16 * 60_000); const {result} = renderHook(() => useStaffSession());
    expect(result.current.isAuthenticated).toBe(false); expect(storage.getStaffAccessToken()).toBeNull();
});
it.each(['token', 'email'])('does not restore a session missing %s', field => {
    seed(); localStorage.removeItem(field === 'token' ? storage.STAFF_STORAGE_KEYS.accessToken : storage.STAFF_STORAGE_KEYS.userEmail);
    const {result} = renderHook(() => useStaffSession()); expect(result.current.isAuthenticated).toBe(false);
});
it('login persists identity and honors the requested internal destination', () => {
    const {result} = renderHook(() => useStaffSession());
    act(() => result.current.handleLogin('staff@example.invalid', 'token', '/zp-staff/drive/applicants'));
    expect(storage.getStaffAccessToken()).toBe('token'); expect(result.current.isAuthenticated).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/zp-staff/drive/applicants', {replace: true});
});
it('refreshes after five minutes and saves token and metadata', async () => {
    seed(); fetch.mockResolvedValue({status: 200, json: async () => ({accessToken: 'fresh', user: 'staff@example.invalid', meta: {designation: 'CDPO'}})});
    renderHook(() => useStaffSession()); await act(() => vi.advanceTimersByTimeAsync(5 * 60_000));
    expect(storage.getStaffAccessToken()).toBe('fresh'); expect(storage.getStaffUserInfo()).toEqual({designation: 'CDPO'});
    expect(fetch.mock.calls[0][0]).toContain('/auth/refresh/zp-staff');
    expect(fetch.mock.calls[0][1].credentials).toBe('include');
});
it.each([401, 403])('refresh status %s clears the session without a second logout call', async status => {
    seed(); fetch.mockResolvedValue({status, json: async () => ({})});
    const {result} = renderHook(() => useStaffSession()); await act(() => vi.advanceTimersByTimeAsync(5 * 60_000));
    expect(result.current.isAuthenticated).toBe(false); expect(storage.getStaffAccessToken()).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
});
it('a late refresh cannot resurrect an explicitly logged-out session', async () => {
    seed(); let resolve; fetch.mockReturnValue(new Promise(done => { resolve = done; }));
    const {result} = renderHook(() => useStaffSession());
    await act(() => vi.advanceTimersByTimeAsync(5 * 60_000));
    await act(() => result.current.handleLogout(false));
    await act(async () => resolve({status: 200, json: async () => ({accessToken: 'stale', user: 'staff@example.invalid'})}));
    expect(storage.getStaffAccessToken()).toBeNull(); expect(result.current.isAuthenticated).toBe(false);
});
it('logout clears local state even when the network fails', async () => {
    seed(); fetch.mockRejectedValue(new Error('Offline'));
    const {result} = renderHook(() => useStaffSession()); await act(() => result.current.handleLogout());
    expect(result.current.isAuthenticated).toBe(false); expect(storage.getStaffAccessToken()).toBeNull();
});
it('idle timeout invokes server logout after fifteen minutes', async () => {
    seed(); const {result} = renderHook(() => useStaffSession());
    await act(() => vi.advanceTimersByTimeAsync(15 * 60_000));
    expect(result.current.isAuthenticated).toBe(false);
    expect(fetch.mock.calls.some(([url]) => url.endsWith('/auth/logout/zp-staff'))).toBe(true);
});
