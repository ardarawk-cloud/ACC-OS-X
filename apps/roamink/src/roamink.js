import { api } from '@appdeploy/client';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { catalog: null, config: {} };

const money = value =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const flag = iso => {
  if (!iso || iso === 'EU') return iso === 'EU' ? '🇪🇺' : '🌐';
  return [...iso.toUpperCase()]
    .map(char => String.fromCodePoint(127397 + char.charCodeAt()))
    .join('');
};

const escapeHtml = value =>
  String(value ?? '').replace(
    /[&<>'"]/g,
    char =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[char]
  );

function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.hidden = false;
  clearTimeout(window.__roaminkToast);
  window.__roaminkToast = setTimeout(() => {
    node.hidden = true;
  }, 3600);
}

function openModal(html) {
  $('#modalContent').innerHTML = html;
  $('#modalBackdrop').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  $('#modalBackdrop').hidden = true;
  document.body.style.overflow = '';
}

$('[data-close-modal]')?.addEventListener('click', closeModal);
$('#modalBackdrop')?.addEventListener('click', event => {
  if (event.target.id === 'modalBackdrop') closeModal();
});

async function loadConfig() {
  try {
    const response = await api.get('/api/config');
    state.config = response.data || {};
  } catch {
    state.config = {};
  }
}

async function loadCatalog() {
  try {
    const response = await api.get('/api/catalog');
    state.catalog = response.data;
  } catch {
    state.catalog = { source: 'preview', destinations: [], products: [] };
  }
  renderDestinations();
  wireSearch();
}

function renderDestinations() {
  const grid = $('#destinationGrid');
  const destinations = (state.catalog?.destinations || [])
    .filter(item => item.featured)
    .slice(0, 6);
  grid.innerHTML =
    destinations
      .map(
        (item, index) => `
    <article class="destination-card" data-destination="${item.slug}" style="--card-glow:${['rgba(66,237,181,.24)', 'rgba(120,168,255,.24)', 'rgba(215,255,114,.17)'][index % 3]}">
      <span class="flag">${flag(item.iso2)}</span><span class="go">↗</span>
      <h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.region || 'Travel eSIM')} · View plans</p>
    </article>
  `
      )
      .join('') || '<p>Catalog is connecting.</p>';
  $$('[data-destination]', grid).forEach(card =>
    card.addEventListener('click', () => showPlans(card.dataset.destination))
  );
}

function wireSearch() {
  const input = $('#destinationSearch');
  const results = $('#searchResults');
  const render = () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      results.hidden = true;
      return;
    }
    const hits = (state.catalog?.destinations || [])
      .filter(item =>
        `${item.name} ${item.region}`.toLowerCase().includes(query)
      )
      .slice(0, 8);
    results.innerHTML =
      hits
        .map(
          item =>
            `<button class="search-result" data-search-destination="${item.slug}"><span>${flag(item.iso2)} &nbsp;${escapeHtml(item.name)}</span><small>${escapeHtml(item.region || '')}</small></button>`
        )
        .join('') ||
      '<div class="search-result empty"><span>No destination found</span></div>';
    results.hidden = false;
    $$('[data-search-destination]', results).forEach(node => {
      node.onclick = () => showPlans(node.dataset.searchDestination);
    });
  };
  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  $('#searchButton').onclick = () => {
    const first = $('[data-search-destination]', results);
    first ? showPlans(first.dataset.searchDestination) : render();
  };
  document.addEventListener('click', event => {
    if (!event.target.closest('.search-card')) results.hidden = true;
  });
}

function showPlans(slug) {
  const destination = state.catalog.destinations.find(
    item => item.slug === slug
  );
  if (!destination) return;
  const plans = state.catalog.products.filter(
    item => item.destination_slug === slug
  );
  $('#plansTitle').textContent =
    `${flag(destination.iso2)} ${destination.name}`;
  $('#plansMeta').textContent =
    `${plans.length} plan${plans.length === 1 ? '' : 's'} available`;
  $('#planGrid').innerHTML =
    plans
      .map(
        (plan, index) => `
    <article class="plan-card ${index === 1 ? 'featured' : ''}">
      ${index === 1 ? '<span class="plan-tag">TRAVELER PICK</span>' : ''}
      <h3>${escapeHtml(plan.title)}</h3><div class="data-size">${escapeHtml(plan.data_label)}</div>
      <div class="plan-meta"><span>${plan.validity_days} days</span><span>${plan.supports_5g ? '4G / 5G' : '4G/LTE'}</span><span>eSIM</span></div>
      <div class="price">${money(plan.retail_price_minor)}</div><button data-plan="${plan.id}">Get this plan</button>
    </article>
  `
      )
      .join('') || '<p>No active plans for this destination yet.</p>';
  $('#destinations').hidden = true;
  $('#plans').hidden = false;
  $('#plans').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $$('[data-plan]', $('#planGrid')).forEach(button => {
    button.onclick = () => checkout(button.dataset.plan);
  });
  $('#searchResults').hidden = true;
}

$('#closePlans')?.addEventListener('click', () => {
  $('#plans').hidden = true;
  $('#destinations').hidden = false;
  $('#destinations').scrollIntoView({ behavior: 'smooth' });
});

function checkout(id) {
  const plan = state.catalog.products.find(
    item => String(item.id) === String(id)
  );
  if (!plan) return;
  openModal(`
    <span class="kicker">SECURE CHECKOUT</span><h2>${escapeHtml(plan.title)}</h2>
    <p>Your eSIM is delivered after confirmed payment.</p>
    <div class="checkout-summary"><div><small>Plan</small><b>${escapeHtml(plan.data_label)} · ${plan.validity_days} days</b></div><div><small>Total</small><b>${money(plan.retail_price_minor)}</b></div></div>
    <form id="checkoutForm" class="form-grid"><label>Name<input name="name" autocomplete="name" required minlength="2" placeholder="Traveler name"></label><label>Phone<input name="phone" type="tel" autocomplete="tel" required placeholder="081234567890"></label><label>Email<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label><input type="hidden" name="product_id" value="${plan.id}"><button class="submit" type="submit">Continue to payment</button></form>
    <div class="notice">Payment is processed securely by our payment gateway. Order fulfillment starts only after payment confirmation.</div>
  `);
  $('#checkoutForm').onsubmit = submitCheckout;
}

async function submitCheckout(event) {
  event.preventDefault();
  const button = $('.submit', event.currentTarget);
  button.disabled = true;
  button.textContent = 'Preparing payment…';
  const body = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const response = await api.post('/api/checkout', body);
    const data = response.data;
    if (data?.payment?.redirect_url) {
      const paymentUrl = new URL(data.payment.redirect_url);
      if (paymentUrl.protocol !== 'https:' || !paymentUrl.hostname.endsWith('ipaymu.com')) {
        throw new Error('UNTRUSTED_GATEWAY_URL');
      }
      window.location.assign(paymentUrl.toString());
      return;
    }
    throw new Error(data?.error?.code || 'PAYMENT_NOT_READY');
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Continue to payment';
    const gatewayError =
      error?.response?.data?.error?.message ||
      error?.response?.data?.error?.code ||
      (error instanceof Error ? error.message : 'CHECKOUT_FAILED');
    toast(
      gatewayError === 'PAYMENT_NOT_CONFIGURED'
        ? 'Payment connection is not active yet.'
        : gatewayError === 'INVALID_CHECKOUT_DETAILS'
          ? 'Check your name, phone, and email.'
          : `Payment gateway: ${String(gatewayError).slice(0, 120)}`
    );
  }
}

$$('[data-open-lookup]').forEach(node =>
  node.addEventListener('click', event => {
    event.preventDefault();
    openModal(
      `<span class="kicker">MY ESIM</span><h2>Open your travel eSIMs.</h2><p>Enter the email used at checkout. We will send a short-lived secure access link when live orders are enabled.</p><form id="lookupForm" class="form-grid"><label>Email<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label><button class="submit" type="submit">Email secure link</button></form><div class="notice">No password required. Live access links expire after 15 minutes.</div>`
    );
    $('#lookupForm').onsubmit = async submitEvent => {
      submitEvent.preventDefault();
      const button = $('.submit', submitEvent.currentTarget);
      button.disabled = true;
      button.textContent = 'Checking…';
      const email = new FormData(submitEvent.currentTarget).get('email');
      try {
        const response = await api.post('/api/magic-link', { email });
        if (!response.data?.ok) throw new Error('NOT_ACTIVE');
      } catch {
        button.disabled = false;
        button.textContent = 'Email secure link';
        toast('My eSIM access will activate with live orders.');
      }
    };
  })
);

$$('[data-open-devices]').forEach(node =>
  node.addEventListener('click', () =>
    openModal(
      `<span class="kicker">COMPATIBILITY</span><h2>Before you buy.</h2><p>Confirm that your exact device supports eSIM and is carrier-unlocked.</p><div class="notice"><b>Fast device check</b><br>iPhone: Settings → Cellular/Mobile Data → look for “Add eSIM”.<br><br>Android: Settings → Network/SIM Manager → look for “Add eSIM” or “Download SIM”.</div>`
    )
  )
);

Promise.all([loadConfig(), loadCatalog()]);
