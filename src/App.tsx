import { Admin } from './Admin';
import { Wedding } from './Wedding';
import { isLocalPreview } from './types';

export function App() {
  return !isLocalPreview() && window.location.pathname.startsWith('/admin') ? <Admin/> : <Wedding/>;
}
