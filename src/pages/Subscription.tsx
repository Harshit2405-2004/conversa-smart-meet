
import { SubscriptionManagementPage } from "@/components/subscription/SubscriptionManagementPage";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const Subscription = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <SubscriptionManagementPage />
      </main>
      <Footer />
    </div>
  );
};

export default Subscription;
