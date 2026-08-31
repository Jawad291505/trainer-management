import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Intro from './components/Intro'
import Paths from './components/Paths'
import Experience from './components/Experience'
import Philosophy from './components/Philosophy'
import Gallery from './components/Gallery'
import Testimonial from './components/Testimonial'
import FinalCTA from './components/FinalCTA'
import Footer from './components/Footer'

export default function Home() {
    return (
        <>
            <Navbar />
            <main>
                <Hero />
                <Intro />
                <Paths />
                <Experience />
                <Philosophy />
                <Gallery />
                <Testimonial />
                <FinalCTA />
            </main>
            <Footer />
        </>
    )
}
