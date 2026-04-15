import { render } from '@testing-library/react';
import { DateInput } from './DateInput';
test('renders date input',()=>{ const view = render(<DateInput name='date' label='Date' value='2026-03-21' onChange={()=>undefined} />); expect(view.getByDisplayValue('2026-03-21')).toBeInTheDocument(); });
