import { fireEvent, render } from '@testing-library/react';
import { GoogleButton } from './GoogleButton';

test('renders the default google button label', () => {
  const view = render(<GoogleButton />);
  expect(view.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument();
});

test('calls onClick when pressed', () => {
  const onClick = vi.fn();
  const view = render(<GoogleButton onClick={onClick} />);

  fireEvent.click(view.getByRole('button', { name: 'Continuar con Google' }));

  expect(onClick).toHaveBeenCalledTimes(1);
});
