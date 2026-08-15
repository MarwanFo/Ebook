import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../app/App';
import { api } from '../services/api-client';

describe('App Component', () => {
  it('renders application brand, header, and home page without crashing', () => {
    vi.spyOn(api, 'getHealth').mockResolvedValue({
      status: 'ok',
      uptime: 10,
      timestamp: '2026-08-14T20:00:00.000Z',
    });
    vi.spyOn(api, 'getReady').mockResolvedValue({
      status: 'ok',
      database: 'connected',
      timestamp: '2026-08-14T20:00:00.000Z',
    });

    render(<App />);

    expect(screen.getAllByText('BookFlow')[0]).toBeInTheDocument();
    expect(screen.getByText(/Realistic Ebook Reading/i)).toBeInTheDocument();
  });
});
