import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { CartProvider } from "@/lib/cart-context";
import { UserProvider } from "@/lib/user-context";
import { FairProvider } from "@/lib/fair-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Feirae — Pré-pedidos para Pequenos Vendedores & Feirantes",
  description: "Plataforma de catálogo digital e pré-pedidos para feiras livres e pequenos produtores locais. Reserve produtos frescos com praticidade!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${inter.className} min-h-full flex flex-col bg-stone-50 text-stone-900`}>
        <UserProvider>
          <FairProvider>
            <CartProvider>
              <Navbar />
              <main className="flex-1">
                {children}
              </main>
            <footer className="bg-white border-t border-stone-200 mt-16 py-8 text-xs text-stone-500">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-feira-600 flex items-center justify-center text-white font-bold text-[10px]">
                    FE
                  </div>
                  <span className="font-semibold text-stone-800">Feirae &copy; 2026</span>
                </div>
              </div>
            </footer>
          </CartProvider>
        </FairProvider>
      </UserProvider>
      </body>
    </html>
  );
}
