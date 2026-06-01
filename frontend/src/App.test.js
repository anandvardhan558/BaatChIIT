import { render, screen } from '@testing-library/react';
import LandingPage from './pages/landing';

jest.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useNavigate: () => jest.fn(),
}), { virtual: true });

test('renders the landing page brand', () => {
  render(<LandingPage />);
  expect(screen.getAllByText(/BaatChIIT/i).length).toBeGreaterThan(0);
});
