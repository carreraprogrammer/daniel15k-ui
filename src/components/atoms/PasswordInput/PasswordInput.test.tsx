import { render } from '@testing-library/react';
import { PasswordInput } from './PasswordInput';
test('renders strength bars',()=>{ const view = render(<PasswordInput name='password' label='Password' value='Abc123!!' onChange={()=>undefined} showStrength />); expect(view.getByText('Mostrar')).toBeInTheDocument(); });
