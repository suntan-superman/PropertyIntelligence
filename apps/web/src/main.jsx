import React from 'react';
import {createRoot} from 'react-dom/client';
import {Home} from './features/desktop-shell/Shell.jsx';
import {TooltipProvider} from './components/Tooltip.jsx';
import {NotificationDialogProvider} from './components/NotificationDialog.jsx';
import {AuthenticationGate,useAuthentication} from './auth/AuthenticationGate.jsx';
import {installSessionExpiryMonitor} from './auth/session-lifecycle.js';
const App=React.lazy(()=>import('./app/App.jsx'));
const Monitoring=React.lazy(()=>import('./features/monitoring/Monitoring.jsx'));
import './styles.css';

const DEPLOY_RELOAD_KEY='pi-deploy-reload-at';
const deploymentLoadFailure=error=>/dynamically imported module|module script|failed to fetch.*module|loading chunk|chunkloaderror/i.test(String(error?.message??error??''));
function recoverDeploymentLoad(error){
  if(!deploymentLoadFailure(error))return false;
  const prior=Number(sessionStorage.getItem(DEPLOY_RELOAD_KEY)??0),now=Date.now();
  if(now-prior<60_000)return false;
  sessionStorage.setItem(DEPLOY_RELOAD_KEY,String(now));
  location.reload();
  return true;
}
window.addEventListener('vite:preloadError',event=>{event.preventDefault();recoverDeploymentLoad(event.payload??event);});
window.addEventListener('unhandledrejection',event=>{if(recoverDeploymentLoad(event.reason))event.preventDefault();});

class ApplicationBoundary extends React.Component{
  constructor(props){super(props);this.state={error:null};}
  static getDerivedStateFromError(error){return {error};}
  componentDidCatch(error){recoverDeploymentLoad(error);}
  render(){if(!this.state.error)return this.props.children;return <main className="application-failure" role="alert"><h1>Property Intelligence could not open this page</h1><p>Your saved property and scenario have not been changed. The application may have been updated while this browser tab was open.</p><div><button onClick={()=>location.reload()}>Reload current page</button><a href="#my-workspace" onClick={()=>this.setState({error:null})}>Return to My Workspace</a></div></main>;}
}
document.documentElement.dataset.piDevelopment=__PI_LOCAL_INVESTMENT__?'true':'false';
const InvestmentWorkspace=__PI_LOCAL_INVESTMENT__?React.lazy(()=>import('./features/investment-workspace/Workspace.jsx')):null;
const PropertyDetail=__PI_LOCAL_INVESTMENT__?React.lazy(()=>import('./features/property-detail/PropertyDetail.jsx')):null;
const Discovery=__PI_LOCAL_INVESTMENT__?React.lazy(()=>import('./features/discovery/Discovery.jsx')):null;
const MyWorkspace=__PI_LOCAL_INVESTMENT__?React.lazy(()=>import('./features/desktop-shell/MyWorkspace.jsx')):null;
const AdminPortal=__PI_LOCAL_INVESTMENT__?React.lazy(()=>import('./features/admin/AdminPortal.jsx')):null;
const ReportViewer=__PI_LOCAL_INVESTMENT__?React.lazy(()=>import('./features/reports/ReportViewer.jsx')):null;
installSessionExpiryMonitor();
function LocalApplication(){
  const [hash,setHash]=React.useState(window.location.hash);
  const authentication=useAuthentication();
  React.useEffect(()=>{const sync=()=>setHash(window.location.hash);window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[]);
  if(__PI_LOCAL_INVESTMENT__&&authentication.user?.role==='Report Viewer')return <React.Suspense fallback={<p>Loading authorized reports…</p>}><ReportViewer/></React.Suspense>;
  // Monitoring is a separate offline app surface; the workbench/API client is not mounted there.
  if(__PI_LOCAL_INVESTMENT__&&(hash===''||hash==='#home'))return <Home/>;
  if(__PI_LOCAL_INVESTMENT__&&(hash.startsWith('#discover')||hash.startsWith('#opportunities')||hash.startsWith('#analyze-property')||hash.startsWith('#analyze-address')||hash==='#analyze'))return <React.Suspense fallback={<p>Loading retained discovery evidence…</p>}><Discovery hash={hash}/></React.Suspense>;
  if(__PI_LOCAL_INVESTMENT__&&(hash.startsWith('#my-workspace')||hash.startsWith('#incoming-leads')||hash.startsWith('#saved-properties')||hash.startsWith('#saved-deals')||hash.startsWith('#workspace-research')||hash.startsWith('#shortlists')||hash.startsWith('#reports')||hash.startsWith('#fixtures')))return <React.Suspense fallback={<p>Loading saved work…</p>}><MyWorkspace hash={hash}/></React.Suspense>;
  if(__PI_LOCAL_INVESTMENT__&&hash.startsWith('#property-detail'))return <React.Suspense fallback={<p>Loading Property Detail…</p>}><PropertyDetail hash={hash}/></React.Suspense>;
  if(__PI_LOCAL_INVESTMENT__&&hash.startsWith('#investment'))return <React.Suspense fallback={<p>Loading local investment workspace…</p>}><InvestmentWorkspace hash={hash}/></React.Suspense>;
  if(__PI_LOCAL_INVESTMENT__&&hash.startsWith('#admin'))return <React.Suspense fallback={<p>Loading administration…</p>}><AdminPortal/></React.Suspense>;
  if(hash==='#monitoring')return <React.Suspense fallback={<p>Loading Property Intelligence…</p>}><Monitoring/></React.Suspense>;
  if(__PI_LOCAL_INVESTMENT__)return <Home/>;
  return <React.Suspense fallback={<p>Loading Property Intelligence…</p>}><App/></React.Suspense>;
}
createRoot(document.getElementById('root')).render(<ApplicationBoundary><NotificationDialogProvider><TooltipProvider><AuthenticationGate><LocalApplication/></AuthenticationGate></TooltipProvider></NotificationDialogProvider></ApplicationBoundary>);
