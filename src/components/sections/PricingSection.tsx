
import { PricingCard } from "@/components/features/PricingCard";
import { PRICING_PLANS } from "@/lib/mock-data";

export function PricingSection() {
  return (
    <section className="py-12 md:py-24" id="pricing">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center mb-12">
          <div className="inline-block rounded-full bg-meetassist-light px-3 py-1 text-sm text-meetassist-primary">
            Pricing
          </div>
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl gradient-heading">
            Simple, Transparent Pricing
          </h2>
          <p className="max-w-[700px] text-muted-foreground md:text-xl">
            Choose the plan that fits your needs with no hidden fees
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 pt-6 max-w-4xl mx-auto">
          {PRICING_PLANS.map((plan, index) => (
            <PricingCard 
              key={index}
              name={plan.name}
              price={plan.price}
              features={plan.features}
              highlighted={plan.highlighted}
            />
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            All plans include a 7-day free trial. No credit card required.
            <br />
            <span className="font-medium">Save 20%</span> with annual billing.
          </p>
        </div>
      </div>
    </section>
  );
}
