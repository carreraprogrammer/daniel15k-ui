import { render } from '@testing-library/react';
import { Label } from './Label';
test('renders label text',()=>{ const view = render(<Label text='Username' />); expect(view.getByText('Username')).toBeInTheDocument(); });
