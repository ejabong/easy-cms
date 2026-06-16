import type { BlockNode } from '@easy-cms/core';

type Plan = { name: string; price: string; features: string[] };

export function PricingSection({ node }: { node: BlockNode }) {
  const p = node.props as { heading?: string; plans?: Plan[] };
  const plans = p.plans ?? [];
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        {p.heading && <h2 className="mb-12 text-center text-3xl font-bold">{p.heading}</h2>}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <div key={i} className="flex flex-col rounded-xl border p-6">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold">
                {plan.price}
                <span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-600">
                {plan.features.map((f, j) => (
                  <li key={j}>✓ {f}</li>
                ))}
              </ul>
              <button className="mt-6 rounded-md bg-primary py-2 font-medium text-white">
                Choose {plan.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
