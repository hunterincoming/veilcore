// The partner's own page script: point the field at the local registry, keep the answer.
// ?allowTest=1 sets allow-test-network; ?unreachable=allow sets when-unreachable="allow".
const q = new URLSearchParams(location.search);
const field = document.querySelector('veilcore-record-check');
field.setAttribute('registry', q.get('registry') ?? '');
if (q.get('allowTest') === '1') field.setAttribute('allow-test-network', '');
if (q.get('unreachable')) field.setAttribute('when-unreachable', q.get('unreachable'));
window.__violations = [];
document.addEventListener('securitypolicyviolation', (e) => window.__violations.push(`${e.violatedDirective} ${e.blockedURI}`));
document.addEventListener('veilcore-check', (e) => {
  window.__last = e.detail;
  document.getElementById('seen').textContent =
    e.detail.checked === false ? 'not checked' : `${e.detail.recordExists} ${e.detail.fingerprintMatches}`;
});
document.getElementById('apply').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  window.__submitted = fd.get('veilcore_link');
  window.__unchecked = fd.get('veilcore_link-unchecked');
});
