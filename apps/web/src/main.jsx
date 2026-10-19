import React from 'react';
import {createRoot} from 'react-dom/client';
import {Home} from './features/desktop-shell/Shell.jsx';
import {TooltipProvider} from './components/Tooltip.jsx';
import {NotificationDialogProvider} from './components/NotificationDialog.jsx';
import {AuthenticationGate} from './auth/AuthenticationGate.jsx';
import {installSessionExpiryMonitor} from './auth/session-lifecycle.js';
const App=React.lazy(()=>import('./app/App.jsx'));
const Monitoring=React.lazy(()=>import('./features/monitoring/Monitoring.jsx'));
import './styles.css';
document.documentElement.dataset.piDevelopment=__PI_LOCAL_INVESTMENT__?'true':'false';
const InvestmentWorkspace=__PI_LOCAL_INVESTMENT__?React.lazy(()=>import('./features/investment-workspace/Workspace.jsx')):null;
const PropertyDetail=__PI_LOCAL_INVESTMENT__?React.lazy(()=>import('./features/property-detail/PropertyDetail.jsx')):null;
const Discovery=__PI_LOCAL_INVESTMENT__?React.lazy(()=>import('./features/discovery/Discovery.jsx')):null;
const MyWorkspace=__PI_LOCAL_INVESTMENT__?React.lazy(()=>import('./features/desktop-shell/MyWorkspace.jsx')):null;
installSessionExpiryMonitor();
function LocalApplication(){
  const [hash,setHash]=React.useState(window.location.hash);
  React.useEffect(()=>{const sync=()=>setHash(window.location.hash);window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[]);
  // Monitoring is a separate offline app surface; the workbench/API client is not mounted there.
  if(__PI_LOCAL_INVESTMENT__&&(hash===''||hash==='#home'))return <Home/>;
  if(__PI_LOCAL_INVESTMENT__&&(hash.startsWith('#discover')||hash.startsWith('#opportunities')||hash.startsWith('#analyze-property')||hash.startsWith('#analyze-address')||hash==='#analyze'))return <React.Suspense fallback={<p>Loading retained discovery evidence…</p>}><Discovery hash={hash}/></React.Suspense>;
  if(__PI_LOCAL_INVESTMENT__&&(hash.startsWith('#my-workspace')||hash.startsWith('#incoming-leads')||hash.startsWith('#saved-properties')||hash.startsWith('#saved-deals')||hash.startsWith('#workspace-research')||hash.startsWith('#shortlists')||hash.startsWith('#reports')||hash.startsWith('#fixtures')))return <React.Suspense fallback={<p>Loading saved work…</p>}><MyWorkspace hash={hash}/></React.Suspense>;
  if(__PI_LOCAL_INVESTMENT__&&hash.startsWith('#property-detail'))return <React.Suspense fallback={<p>Loading Property Detail…</p>}><PropertyDetail hash={hash}/></React.Suspense>;
  if(__PI_LOCAL_INVESTMENT__&&hash.startsWith('#investment'))return <React.Suspense fallback={<p>Loading local investment workspace…</p>}><InvestmentWorkspace hash={hash}/></React.Suspense>;
  return <React.Suspense fallback={<p>Loading Property Intelligence…</p>}>{hash==='#monitoring'?<Monitoring/>:<App/>}</React.Suspense>;
}
createRoot(document.getElementById('root')).render(<NotificationDialogProvider><TooltipProvider><AuthenticationGate><LocalApplication/></AuthenticationGate></TooltipProvider></NotificationDialogProvider>);
