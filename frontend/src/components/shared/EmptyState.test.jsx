import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyState from './EmptyState';

describe('<EmptyState />', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        title="No medicines yet"
        description="Add the first medicine to start tracking doses."
      />
    );

    expect(screen.getByRole('heading', { name: 'No medicines yet' })).toBeInTheDocument();
    expect(screen.getByText(/Add the first medicine/)).toBeInTheDocument();
  });

  it('does not render an action button unless both label and handler are given', () => {
    render(<EmptyState title="Nothing" description="Empty." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onAction when the action button is clicked', async () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        title="No reports"
        description="Upload your first medical report."
        actionLabel="Upload report"
        onAction={onAction}
      />
    );

    const button = screen.getByRole('button', { name: 'Upload report' });
    await userEvent.click(button);

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
