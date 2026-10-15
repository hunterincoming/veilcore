// The partner's own page script: point the field at the local registry, keep the answer.
const field = document.querySelector('veilcore-record-check');
field.setAttribute('registry', new URLSearchParams(location.search).get('registry') ?? '');
window.__violations = [];
document.addEventListener('securitypolicyviolation', (e) => window.__violations.push(`${e.violatedDirective} ${e.blockedURI}`));
document.addEventListener('veilcore-check', (e) => {
  window.__last = e.detail;
  document.getElementById('seen').textContent = `${e.detail.recordExists} ${e.detail.fingerprintMatches}`;
});
document.getElementById('apply').addEventListener('submit', (e) => {
  e.preventDefault();
  window.__submitted = new FormData(e.target).get('veilcore_link');
});
