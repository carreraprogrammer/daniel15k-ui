import { render } from '@testing-library/react';
import { Spinner } from './Spinner';
test('renders spinner',()=>{ const view = render(<Spinner />); expect(view.getByLabelText('loading')).toBeInTheDocument(); });
