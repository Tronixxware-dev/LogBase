// People who already use LogBase on this device do not need the sales page every time they type the address or open
// their bookmark: they are sent to the app (signed in) or to the sign-in page (signed out).
//
// It is a tiny script that runs before the page is drawn, so there is no flash of the sales page. It only acts on a
// fresh visit (typed address, bookmark, search result, home-screen icon). A click from inside LogBase or the website,
// such as the logo, still opens this page. Search engines and first-time visitors have nothing saved here, so they
// always see the page.
const SCRIPT = `(function(){try{
var r=document.referrer;
if(r){try{if(new URL(r).origin===location.origin)return;}catch(e){}}
var ls=window.localStorage;
var token=ls.getItem('logbase_token')||ls.getItem('logg_token')||ls.getItem('loggr_token');
if(!token&&!ls.getItem('logbase_returning'))return;
location.replace(token?'/dashboard':'/login');
}catch(e){}})();`;

export default function ReturnVisitRedirect() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
