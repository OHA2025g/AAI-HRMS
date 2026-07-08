function showDashboardTab(index){
  document.querySelectorAll('.tab-panel').forEach((panel,i)=>panel.classList.toggle('active', i === index));
}
window.showDashboardTab = showDashboardTab;
