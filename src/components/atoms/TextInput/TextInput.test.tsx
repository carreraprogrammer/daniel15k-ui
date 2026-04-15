import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { TextInput } from './TextInput';
test('calls onChange while typing', async ()=>{ const user=userEvent.setup(); const onChange=vi.fn(); const view = render(<TextInput name='text' label='Text' value='' onChange={onChange} />); await user.type(view.getByLabelText('Text'),'abc'); expect(onChange).toHaveBeenCalled(); });
