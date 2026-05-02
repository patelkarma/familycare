import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorState from './ErrorState';

describe('<ErrorState />', () => {
  it('renders the title and description', () => {
    render(
      <ErrorState
        title="Could not load schedule"
        description="Check your connection."
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Could not load schedule')).toBeInTheDocument();
    expect(screen.getByText('Check your connection.')).toBeInTheDocument();
  });

  it('does not render the retry button when no onRetry handler is given', () => {
    render(<ErrorState title="Oops" description="Bad things." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onRetry when the user clicks the retry button', async () => {
    const onRetry = vi.fn();
    render(
      <ErrorState
        title="Oops"
        description="Bad things."
        onRetry={onRetry}
        retryLabel="Try again"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
