import { render } from '@testing-library/react';
import { SelectInput } from './SelectInput';
test('renders placeholder option',()=>{ const view = render(<SelectInput name='role' label='Role' value='' onChange={()=>undefined} options={[]} />); expect(view.getByText('Seleccionar...')).toBeInTheDocument(); });
