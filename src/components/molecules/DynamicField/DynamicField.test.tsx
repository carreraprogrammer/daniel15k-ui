import { render } from '@testing-library/react';
import { DynamicField } from './DynamicField';
test('renders mapped text input',()=>{ const view = render(<DynamicField field={{ name:'email', type:'email', label:'Email' }} value='' onChange={()=>undefined} />); expect(view.getByLabelText('Email')).toBeInTheDocument(); });
