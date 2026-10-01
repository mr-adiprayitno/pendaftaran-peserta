import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <TopNav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
      <Footer />
    </div>
  );
}