import { render } from '@testing-library/react';
import { PhoneInput } from './PhoneInput';
test('renders validity hint',()=>{ const view = render(<PhoneInput name='phone' label='Phone' value='' onChange={()=>undefined} />); expect(view.getByText('Número incompleto')).toBeInTheDocument(); });
