import { render } from '@testing-library/react';
import { TextareaInput } from './TextareaInput';
test('shows counter',()=>{ const view = render(<TextareaInput name='bio' label='Bio' value='abc' onChange={()=>undefined} maxLength={10} showCount />); expect(view.getByText('3 / 10')).toBeInTheDocument(); });
