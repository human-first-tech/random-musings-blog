import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { FeaturedGrid } from "@/components/FeaturedGrid";
import { NotebookGrid } from "@/components/NotebookGrid";
import { AboutSection } from "@/components/AboutSection";
import { SubscribeSection } from "@/components/SubscribeSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1 pt-16">
        <Hero />
        <FeaturedGrid />
        <NotebookGrid />
        <AboutSection />
        <SubscribeSection />
      </main>
      <Footer />
    </>
  );
}
