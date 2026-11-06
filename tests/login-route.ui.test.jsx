import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom';
import {beforeEach, expect, it, vi} from 'vitest';
import LoginPage from '../src/pages/LoginPage';
import ProtectedRoute from '../src/components/ProtectedRoute';
import {fetchJson} from '../src/lib/api';

vi.mock('../src/lib/api', () => ({fetchJson: vi.fn()}));
let onLogin;
beforeEach(() => { fetchJson.mockReset(); onLogin = vi.fn(); });
const showLogin = (entry = '/zp-staff') => render(<MemoryRouter initialEntries={[entry]}><LoginPage onLogin={onLogin}/></MemoryRouter>);
const send = async () => {
    fireEvent.change(screen.getByPlaceholderText('Enter your email address'), {target: {value: 'staff@example.invalid'}});
    fireEvent.click(screen.getByRole('button', {name: 'Send OTP'}));
    await screen.findByRole('button', {name: 'Verify OTP'});
};
it.each([['', 'Please enter your email address'], ['invalid', 'Please enter a valid email address']])( 'validates staff email %j before delivery', (email, error) => {
    showLogin(); fireEvent.change(screen.getByPlaceholderText('Enter your email address'), {target: {value: email}});
    fireEvent.click(screen.getByRole('button', {name: 'Send OTP'}));
    expect(screen.getByText(error)).toBeInTheDocument(); expect(fetchJson).not.toHaveBeenCalled();
});
it('requests staff-only OTP and honors the server resend cooldown', async () => {
    fetchJson.mockResolvedValue({success: true, nextAttemptAt: Date.now() + 60_000}); showLogin(); await send();
    expect(fetchJson.mock.calls[0][0]).toContain('role=ZP_STAFF&email=staff%40example.invalid');
    expect(screen.getByRole('button', {name: /Resend in/})).toBeDisabled();
});
it('accepts four pasted digits and follows a safe internal redirect', async () => {
    fetchJson.mockResolvedValueOnce({success: true}).mockResolvedValueOnce({verified: true, accessToken: 'token', meta: {designation: 'CDPO'}});
    showLogin('/zp-staff?redirect=%2Fzp-staff%2Fdrive%2Fapplicants'); await send();
    fireEvent.paste(document.getElementById('otp-0'), {clipboardData: {getData: () => '1234'}});
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('staff@example.invalid', 'token', '/zp-staff/drive/applicants'));
    expect(fetchJson.mock.calls[1][1].credentials).toBe('include');
});
it('does not use an external redirect supplied through the login URL', async () => {
    fetchJson.mockResolvedValueOnce({success: true}).mockResolvedValueOnce({verified: true, accessToken: 'token'});
    showLogin('/zp-staff?redirect=https%3A%2F%2Fevil.invalid'); await send();
    fireEvent.paste(document.getElementById('otp-0'), {clipboardData: {getData: () => '1234'}});
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('staff@example.invalid', 'token', '/zp-staff/dashboard'));
});
it('invalid OTP does not invoke login and clears digits', async () => {
    fetchJson.mockResolvedValueOnce({success: true}).mockResolvedValueOnce({verified: false, failureReason: 'Invalid OTP'});
    showLogin(); await send(); fireEvent.paste(document.getElementById('otp-0'), {clipboardData: {getData: () => '1234'}});
    expect(await screen.findByText('Invalid OTP')).toBeInTheDocument(); expect(onLogin).not.toHaveBeenCalled();
    expect(document.getElementById('otp-0')).toHaveValue('');
});
const Location = () => {
    const location = useLocation(); return <div data-testid="location">{location.pathname}{location.search}</div>;
};
it('protected routes preserve the requested path, query and fragment', () => {
    render(<MemoryRouter initialEntries={['/zp-staff/drive/applicants?search=abc#row']}><Routes>
        <Route path="/zp-staff" element={<Location/>}/>
        <Route path="/zp-staff/drive/applicants" element={<ProtectedRoute isAuthenticated={false}><div>Private</div></ProtectedRoute>}/>
    </Routes></MemoryRouter>);
    expect(screen.queryByText('Private')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('redirect=%2Fzp-staff%2Fdrive%2Fapplicants%3Fsearch%3Dabc%23row');
    expect(localStorage.getItem('staffPendingRedirect')).toBe('/zp-staff/drive/applicants?search=abc#row');
});
it('authenticated staff can render protected children', () => {
    render(<MemoryRouter><ProtectedRoute isAuthenticated><div>Private</div></ProtectedRoute></MemoryRouter>);
    expect(screen.getByText('Private')).toBeInTheDocument();
});
