"use client";
// app/page.tsx: the scenes in order inside <main>, the header above and the call bar on every phone screen.
import { CallBar, Footer, Header } from "./scenes/Chrome";
import { Daken } from "./scenes/Daken";

/** The generated stills are in public/images. */
const PHOTOS = false;
import { Lagen } from "./scenes/Lagen";
import { Lek } from "./scenes/Lek";
import { Offerte } from "./scenes/Offerte";
import { Plat } from "./scenes/Plat";

export default function Page() {
  return (
    <>
      <Header />
      <main className="relative">
        <Lagen />
        {PHOTOS ? <Daken /> : null}
        <Plat />
        <Lek />
        <Offerte />
      </main>
      <Footer />
      <CallBar />
    </>
  );
}
