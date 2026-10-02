import { PAYWALL_COPY, PLANS, minimumPlanFor } from '../../shared/catalog.js';

export const planOf = (me) => PLANS[me?.plan] || PLANS.free;
export const hasFeature = (me, feature) => Boolean(planOf(me).features[feature]);

// Paywall disparado desde el cliente (misma forma que la respuesta 402 del servidor).
export const paywallFor = (feature, requiredPlan) => ({
  code: 'paywall',
  feature,
  requiredPlan: requiredPlan || minimumPlanFor(feature),
  title: PAYWALL_COPY[feature]?.title || 'Función de un plan pago',
  error: PAYWALL_COPY[feature]?.message || 'Mejorá tu plan para usar esta función.'
});
