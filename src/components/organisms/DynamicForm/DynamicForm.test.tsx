import { render } from '@testing-library/react';
import { DynamicForm } from './DynamicForm';
test('renders submit button for writable forms',()=>{ const view = render(<DynamicForm schema={{ slug:'test', title:'Test', submit_endpoint:'/x', submit_method:'POST', fields:[{ name:'email', type:'email', label:'Email' }] }} />); expect(view.getByText('Enviar')).toBeInTheDocument(); });
