import { Nav } from "./components/nav/Nav";
import { Hero } from "./components/sections/Hero";
import { About } from "./components/sections/About";
import { Work } from "./components/sections/Work";
import { Projects } from "./components/sections/Projects";
import { Gallery } from "./components/sections/Gallery";
import { Life } from "./components/sections/Life";
import { Footer } from "./components/sections/Footer";

function App() {
  return (
    <div className="grain">
      <Nav />
      <main>
        <Hero />
        <div className="topo-divider" />
        <About />
        <div className="topo-divider" />
        <Work />
        <div className="topo-divider" />
        <Projects />
        <Gallery />
        <div className="topo-divider" />
        <Life />
      </main>
      <Footer />
    </div>
  );
}

export default App;
