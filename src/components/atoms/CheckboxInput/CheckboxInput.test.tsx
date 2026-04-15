import { render } from '@testing-library/react';
import { CheckboxInput } from './CheckboxInput';
test('renders checkbox label',()=>{ const view = render(<CheckboxInput name='terms' label='Terms' checked={false} onChange={()=>undefined} />); expect(view.getByText('Terms')).toBeInTheDocument(); });
