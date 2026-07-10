import "@/styles/globals.css";
import QueryProvider from "@/providers/query-provider";
import GlobalLoading from "@/providers/GlobalLoading";
import { Toaster } from "sonner";
import AuthBootstrap from "@/providers/AuthBootstrap";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <AuthBootstrap>
          <QueryProvider>
            <GlobalLoading />
            {children}
            <Toaster position="top-right" richColors />
          </QueryProvider>
        </AuthBootstrap>
      </body>
    </html>
  );
}
