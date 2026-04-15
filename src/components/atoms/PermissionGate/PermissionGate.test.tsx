import { render } from '@testing-library/react';
import { PermissionGate } from './PermissionGate';
import { useAuthStore } from '../../../store/authStore';
test('renders children when permitted',()=>{ useAuthStore.setState({ user:{ id:1,email:'a',name:'A',superAdmin:false,permissions:['users:read'] }, accessToken:'t', isAuthenticated:true, isLoading:false }); const view = render(<PermissionGate permission='users:read'><span>Allowed</span></PermissionGate>); expect(view.getByText('Allowed')).toBeInTheDocument(); });
