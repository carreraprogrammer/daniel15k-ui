import { render } from '@testing-library/react';
import { EmailInput } from './EmailInput';
test('renders error message from props',()=>{ const view = render(<EmailInput name='email' label='Email' value='bad' onChange={()=>undefined} error='Correo electrónico inválido' />); expect(view.getByText('Correo electrónico inválido')).toBeInTheDocument(); });
