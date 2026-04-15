import { render } from '@testing-library/react';
import { Button } from './Button';
test('renders button label',()=>{ const view = render(<Button label='Save' />); expect(view.getByText('Save')).toBeInTheDocument(); });
