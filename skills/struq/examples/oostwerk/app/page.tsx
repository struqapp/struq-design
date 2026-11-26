// app/page.tsx: the scenes in order inside <main>. Nothing else.
import { Footer, Header } from "./scenes/Chrome";
import { Drawn } from "./scenes/Drawn";
import { Entrances } from "./scenes/Entrances";
import { Opening } from "./scenes/Opening";
import { Order } from "./scenes/Order";
import { Street } from "./scenes/Street";
import { Studio } from "./scenes/Studio";
import "./page.css";

export default function Page() {
  return (
    <>
      <Header />
      <main className="relative">
        <Opening />
        <Drawn />
        <Studio />
        <Entrances />
        <Street />
        <Order />
      </main>
      <Footer />
    </>
  );
}
