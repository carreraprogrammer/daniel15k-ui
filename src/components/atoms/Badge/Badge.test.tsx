import { render } from '@testing-library/react';
import { Badge } from './Badge';
test('renders badge label',()=>{ const view = render(<Badge label='Admin' />); expect(view.getByText('Admin')).toBeInTheDocument(); });
