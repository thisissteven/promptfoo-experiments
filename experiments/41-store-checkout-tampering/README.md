# 41 - Store checkout / quantity tampering (potential, unconfirmed)

**Status:** Lead. Static evidence only; no cart token or purchase was used.

**Surface:** Bambu Store frontend (`us.store.bambulab.com`), custom Next.js app on
`store-fe.bblcdn.com`. Not Shopify.

## Lead 1 - client-controlled `cartSubtotal` in checkout URL

From the public cart page chunk
(`/_next/static/chunks/app/[locale]/(layout-default)/cart/page-*.js`):

```js
let { token: l, refresh: r, message: i } = await (0, L.Fq)();
if (l) {
  H(true);
  V.push("/checkouts/".concat(l, "?cartSubtotal=").concat(J));
  r ...
}
```

`J` is `totalPrice` from the client Zustand `cartData` (`{totalPrice:J}=Y`). The
checkout token `l` is server-generated, but `cartSubtotal` is appended from the
client store. Whether the checkout page/payment uses that query value for
display or amount is **unverified**.

**Test plan (no payment):**
1. Create a guest cart with one low-value item.
2. Get the checkout token; open `/checkouts/<token>?cartSubtotal=0.01`.
3. Compare the displayed/payment total with the real cart total.
4. Do not pay; clear the cart.

## Lead 2 - client-only quantity pattern

The product page quantity input uses:

```html
<input pattern="^[1-9]\d*$" inputMode="numeric" aria-label="Quantity" name="quantity" value="1"/>
```

`pattern` is client-side only; whether the add-to-cart server action validates
`quantity` is unverified. Negative/zero/huge quantity tests require the
add-to-cart action (server action/RSC, not a documented REST route).

**Impact if confirmed:** price/subtotal manipulation or invalid quantity at
checkout. **Caveat:** server-side totals/validation are likely; this is a lead,
not a finding. No order, payment, or cart data was created.

**Files:** this README only (static evidence). No destructive or purchase
requests.
