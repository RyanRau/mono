import { Nav } from "./components/nav/Nav";
import { Hero } from "./components/sections/Hero";
import { About } from "./components/sections/About";
import { Work } from "./components/sections/Work";
import { Projects } from "./components/sections/Projects";
import { Gallery } from "./components/sections/Gallery";
import { GalleryV1 } from "./components/sections/GalleryV1";
import { GalleryV2 } from "./components/sections/GalleryV2";
import { GalleryV3 } from "./components/sections/GalleryV3";
import { GalleryV4 } from "./components/sections/GalleryV4";
import { GalleryV1a } from "./components/sections/GalleryV1a";
import { GalleryV1b } from "./components/sections/GalleryV1b";
import { GalleryV1c } from "./components/sections/GalleryV1c";
import { GalleryV1b2 } from "./components/sections/GalleryV1b2";
import { GalleryV1b3 } from "./components/sections/GalleryV1b3";
import { GalleryV1b4 } from "./components/sections/GalleryV1b4";
import { GalleryV1b5 } from "./components/sections/GalleryV1b5";
import { GalleryV1b6 } from "./components/sections/GalleryV1b6";
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
        <GalleryV1 />
        <GalleryV2 />
        <GalleryV3 />
        <GalleryV4 />
        <GalleryV1a />
        <GalleryV1b />
        <GalleryV1c />
        <GalleryV1b2 />
        <GalleryV1b3 />
        <GalleryV1b4 />
        <GalleryV1b5 />
        <GalleryV1b6 />
        <div className="topo-divider" />
        <Life />
      </main>
      <Footer />
    </div>
  );
}

export default App;
