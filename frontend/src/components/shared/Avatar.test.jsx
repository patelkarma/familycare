import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Avatar from './Avatar';

describe('<Avatar />', () => {
  it('renders the user\'s initials when no image is provided', () => {
    render(<Avatar name="Karma Patel" />);
    expect(screen.getByText('KP')).toBeInTheDocument();
  });

  it('renders an <img> when imageUrl is provided', () => {
    render(<Avatar name="Karma Patel" imageUrl="https://example.com/face.jpg" />);

    const img = screen.getByRole('img', { name: 'Karma Patel' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/face.jpg');
  });

  it('falls back to "?" when no name is given', () => {
    render(<Avatar />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
