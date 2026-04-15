import { render } from '@testing-library/react';
import { ImageInput } from './ImageInput';
test('renders aspect ratio hint',()=>{ const view = render(<ImageInput name='avatar' label='Avatar' value={null} onChange={()=>undefined} aspectRatio='1:1' />); expect(view.getByText('Proporción esperada: 1:1')).toBeInTheDocument(); });
