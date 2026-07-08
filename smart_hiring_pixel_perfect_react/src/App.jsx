import overviewHtml from './data/overview.js';
import pipelineHtml from './data/pipeline.js';
import offersHtml from './data/offers.js';
import interviewsHtml from './data/interviews.js';
import signalsHtml from './data/signals.js';
import analyticsHtml from './data/analytics.js';

const tabs = [
  { label: 'Overview', html: overviewHtml },
  { label: 'Pipeline', html: pipelineHtml },
  { label: 'Offers', html: offersHtml },
  { label: 'Interviews', html: interviewsHtml },
  { label: 'Signals', html: signalsHtml },
  { label: 'Analytics', html: analyticsHtml }
];

function injectBridge(html, activeIndex) {
  const bridge = `
<script>
(function(){
  var activeIndex = ${activeIndex};
  function wireTabs(){
    var tabs = Array.from(document.querySelectorAll('.tabs .tab'));
    tabs.forEach(function(t,i){
      t.classList.toggle('active', i === activeIndex);
      t.setAttribute('type','button');
      t.style.cursor = 'pointer';
      t.onclick = function(e){
        e.preventDefault();
        if(window.parent) window.parent.postMessage({ type: 'AAI_SMART_HIRING_TAB_CHANGE', index: i }, '*');
      };
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireTabs);
  else wireTabs();
})();
</script>`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, bridge + '</body>') : html + bridge;
}

export default function App() {
  const [activeTab, setActiveTab] = React.useState(0);
  React.useEffect(() => {
    const onMessage = (event) => {
      if (event.data?.type === 'AAI_SMART_HIRING_TAB_CHANGE') setActiveTab(event.data.index);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <main className="app-shell">
      {tabs.map((tab, index) => (
        <section key={tab.label} className={`tab-panel ${activeTab === index ? 'active' : ''}`}>
          <iframe title={`${tab.label} dashboard`} srcDoc={injectBridge(tab.html, index)} />
        </section>
      ))}
    </main>
  );
}
