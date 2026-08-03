import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ClientAuthBootstrap from "@/providers/ClientAuthBootstrap";
import { Suspense } from "react";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <ClientAuthBootstrap>
        <Header />

        <main style={{ flex: 1 }}>{children}</main>

        <Footer />
      </ClientAuthBootstrap>
    </Suspense>
  );
}
