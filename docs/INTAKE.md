# Recording a sample from your own intake page

For labs, nurseries, seed banks and anyone who receives genetics and wants the sender to hold
a dated VeilCore record of it. No sign-up, no API key, no code from VeilCore: it is a link.

## How it works

1. Your intake page links the sender to VeilCore with where to come back to.
2. The sender makes the record on veilcore.org, in their own browser. It stays theirs, with
   their own backup. You never see what they type.
3. At the end VeilCore shows the sender your address and exactly what you will get, and asks.
   If they say yes, they come back to your page with the record's ID, its proof code and its
   check link. If they say no, they come back with `declined=1`.

Why a link and not a widget on your page: anything running inside your page can be read by
your page. A separate page on veilcore.org can't, so the sender's details stay theirs, and
you can tell them so. It also works the same on a phone.

## The link

```
https://veilcore.org/intake?return=<your https address>&state=<your random value>&ref=<your sample number>&name=<a suggested name>
```

| Part | Required | What it is |
|---|---|---|
| `return` | yes | Where the sender comes back to. Must be `https://`, with no `#` part and no user or password. |
| `state` | yes | 8 to 128 letters, digits, `-` or `_`. Make a new random one for each request and keep it: it comes back unchanged, so you know the answer is for your request. |
| `ref` | no | Your own sample or order number (up to 120 characters). It goes into the record's "your reference", so the sender's record and your system point at each other. |
| `name` | no | A suggested name (up to 200 characters). The sender can change it. |

Test networks: `https://test.veilcore.org/intake?...`, which also accepts `http://localhost`
return addresses while you build.

## The answer

The sender comes back to `return` with VeilCore's answer after the `#`, so it never reaches
your server's logs unless your page sends it:

```
https://lab.example/intake/done#veilcore=veilcore%2Fintake%2Fv1&state=…&record=VEIL-…&proof=<64 hex>&check=https%3A%2F%2Fveilcore.org%2Fverify%2FVEIL-…%3Ffp%3D…
```

| Part | What it is |
|---|---|
| `veilcore` | `veilcore/intake/v1` |
| `state` | Your value, unchanged. Refuse the answer if it isn't the one you made. |
| `record` | The record's ID. |
| `proof` | Its proof code: what is dated on Midnight. Nothing about the sample can be worked out from it. |
| `check` | A public link anyone can open to see the record's date and status. |
| `declined` | `1` when the sender chose not to send. |

Reading it in your page:

```js
const a = new URLSearchParams(location.hash.slice(1));
if (a.get('veilcore') === 'veilcore/intake/v1' && a.get('state') === myState) {
  if (a.get('declined') === '1') { /* they chose not to send */ }
  else saveToYourSystem({ record: a.get('record'), proof: a.get('proof'), check: a.get('check') });
}
history.replaceState(null, '', location.pathname + location.search); // clear the # from the address bar
```

## What the answer proves, and what it doesn't

The answer says which record the sender points at. It does not prove that they hold it, or that
it is the sample you received: the sender can see your `state` and could write an answer by hand
naming someone else's public record. So:

- **Check it on VeilCore yourself.** Never open the `check` link you were handed. Build the
  address from `record` and `proof`: `https://veilcore.org/verify/<record>?fp=<proof>`, or ask
  the registry's `/verify/<record>`, and confirm the proof code there is `proof`.
- **When it matters who holds it, ask them to prove it.** VeilCore's prove-by-link flow (the
  sender answers a link you make, from the device holding the record) shows they hold the
  record's key, without showing you anything else.
- **Your return address must serve your page directly, with no redirect.** Browsers carry the
  `#` part across a redirect, so a redirect would hand the answer to wherever it points.

A request lasts an hour in the sender's tab, and they can drop it at any time ("Not now, stay
on VeilCore"); they then come back to you with nothing.
