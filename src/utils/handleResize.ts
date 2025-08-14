export function handleResize() {
  const existingTruevh =  parseFloat(document.documentElement.style.getPropertyValue("--truevh")) || 0;
  const truevh = window.innerHeight/100;
  if(truevh > existingTruevh) {
    document.documentElement.style.setProperty('--truevh', `${truevh}px`);
  }
}
