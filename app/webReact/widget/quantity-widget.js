import React from 'react';
import { createRoot } from 'react-dom/client';

const roots = new WeakMap();
const DECREASE = 'fixvietnam:quantity-decrease';
const INCREASE = 'fixvietnam:quantity-increase';

function buttonStyle(disabled) {
  return {
    minWidth: 44,
    minHeight: 44,
    border: '1px solid #075a9e',
    borderRadius: 8,
    background: disabled ? '#e8edf1' : '#fff',
    color: disabled ? '#536577' : '#075a9e',
    font: '700 1.25rem system-ui, sans-serif',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function QuantityWidget({ container, sku, quantity, availableStock }) {
  return React.createElement('section', {
    'aria-label': `Số lượng đặt hàng cho ${sku}`,
    style: {
      boxSizing: 'border-box', width: '100%', height: '100%', padding: 12,
      border: '1px solid #9eb5c6', borderRadius: 10, background: '#f6faff',
      color: '#142433', font: '1rem/1.4 system-ui, sans-serif',
    },
  },
    React.createElement('p', { style: { margin: '0 0 8px', fontWeight: 650 } }, `React · ${sku}`),
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
      React.createElement('button', {
        type: 'button', disabled: quantity <= 0,
        'aria-label': `Giảm số lượng ${sku}`,
        onClick: () => container.dispatchEvent(new Event(DECREASE)),
        style: buttonStyle(quantity <= 0),
      }, '−'),
      React.createElement('output', {
        'aria-live': 'polite',
        style: { minWidth: 38, textAlign: 'center', fontWeight: 700 },
      }, String(quantity)),
      React.createElement('button', {
        type: 'button', disabled: quantity >= availableStock,
        'aria-label': `Tăng số lượng ${sku}`,
        onClick: () => container.dispatchEvent(new Event(INCREASE)),
        style: buttonStyle(quantity >= availableStock),
      }, '+'),
    ),
    React.createElement('p', { style: { margin: '8px 0 0', fontSize: '.85rem' } }, `Có thể đặt tối đa ${availableStock}`),
  );
}

function mount(container) {
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  return root;
}

function update(container, sku, quantity, availableStock) {
  mount(container).render(React.createElement(QuantityWidget, {
    container, sku, quantity, availableStock,
  }));
}

function unmount(container) {
  const root = roots.get(container);
  if (!root) return;
  root.unmount();
  roots.delete(container);
}

window.FixVietnamQuantityWidget = Object.freeze({ version: 1, mount, update, unmount });
