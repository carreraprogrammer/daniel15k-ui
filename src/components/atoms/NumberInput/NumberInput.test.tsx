import { render } from '@testing-library/react';
import { NumberInput } from './NumberInput';
test('renders validation error from props',()=>{ const view = render(<NumberInput name='amount' label='Amount' value={1} onChange={()=>undefined} error='El valor mínimo es 2' />); expect(view.getByText('El valor mínimo es 2')).toBeInTheDocument(); });
