
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

interface PricingCardProps {
  name: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}

export function PricingCard({ name, price, features, highlighted = false }: PricingCardProps) {
  return (
    <Card className={`w-full ${highlighted ? 'border-meetassist-primary shadow-lg relative' : ''}`}>
      {highlighted && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <span className="bg-meetassist-primary text-white text-xs font-medium px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}
      <CardHeader>
        <CardTitle className={highlighted ? "text-meetassist-primary" : ""}>{name}</CardTitle>
        <CardDescription>
          <span className="text-2xl font-bold">{price}</span>
          {price !== "$0" && <span className="text-sm text-muted-foreground">/month</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check size={18} className="mr-2 text-green-500 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button 
          className={`w-full ${highlighted ? 'bg-meetassist-primary hover:bg-meetassist-secondary' : ''}`}
          variant={highlighted ? "default" : "outline"}
        >
          {highlighted ? "Upgrade Now" : "Get Started"}
        </Button>
      </CardFooter>
    </Card>
  );
}
