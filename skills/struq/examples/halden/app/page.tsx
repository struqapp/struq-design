"use client";
// app/page.tsx: the scenes in order, each a <section data-beat> inside <main>, over the one world (world.tsx).
import dynamic from "next/dynamic";
import { Bestill } from "./scenes/Bestill";
import { Blatimen } from "./scenes/Blatimen";
import { Footer, Header } from "./scenes/Chrome";
import { Formen } from "./scenes/Formen";
import { Pusten } from "./scenes/Pusten";
import { Rommene } from "./scenes/Rommene";
import { Veggen } from "./scenes/Veggen";
import "./page.css";

const PageWorld = dynamic(() => import("./world"), { ssr: false });

export default function Page() {
  return (
    <>
      <Header />
      <main className="relative">
        <PageWorld />
        <Pusten />
        <Formen />
        <Veggen />
        <Rommene />
        <Blatimen />
        <Bestill />
      </main>
      <Footer />
    </>
  );
}
