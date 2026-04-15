import { render } from '@testing-library/react';
import { ErrorMessage } from './ErrorMessage';
test('renders error message',()=>{ const view = render(<ErrorMessage message='Oops' />); expect(view.getByRole('alert')).toHaveTextContent('Oops'); });
