import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { CartProvider } from "@/lib/cart-context";
import { UserProvider } from "@/lib/user-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FeiraLocal — Pré-pedidos para Pequenos Vendedores & Feirantes",
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
          <CartProvider>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <footer className="bg-white border-t border-stone-200 mt-16 py-8 text-xs text-stone-500">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-feira-600 flex items-center justify-center text-white font-bold text-[10px]">
                    FL
                  </div>
                  <span className="font-semibold text-stone-800">FeiraLocal &copy; 2026</span>
                </div>
              </div>
            </footer>
          </CartProvider>
        </UserProvider>
      </body>
    </html>
  );
}
