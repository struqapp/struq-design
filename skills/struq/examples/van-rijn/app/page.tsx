"use client";
// app/page.tsx: the scenes in order, each a <section data-beat> inside <main>, over the one world (world.tsx), with
// the call bar on every screen.
import dynamic from "next/dynamic";
import { CallBar, Footer, Header } from "./scenes/Chrome";
import { Droog } from "./scenes/Droog";
import { Lagen } from "./scenes/Lagen";
import { Lek } from "./scenes/Lek";
import { Offerte } from "./scenes/Offerte";
import { Werk } from "./scenes/Werk";
import "./page.css";

const PageWorld = dynamic(() => import("./world"), { ssr: false });

export default function Page() {
  return (
    <>
      <Header />
      <main className="relative">
        <PageWorld />
        <Droog />
        <Lagen />
        <Werk />
        <Lek />
        <Offerte />
      </main>
      <Footer />
      <CallBar />
    </>
  );
}
