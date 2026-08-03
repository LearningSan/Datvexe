import "@/styles/globals.css";
import QueryProvider from "@/providers/query-provider";
import GlobalLoading from "@/providers/GlobalLoading";
import { Toaster } from "react-hot-toast";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <GlobalLoading />
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              success: {
                style: {
                  background: "#22c55e",
                  color: "#fff",
                },
              },
              error: {
                style: {
                  background: "#ef4444",
                  color: "#fff",
                },
              },
            }}
          />{" "}
        </QueryProvider>
      </body>
    </html>
  );
}
