import { useState } from 'react'
import { Link } from 'react-router-dom'

const aboutFeatures = [
  {
    title: 'Trustworthy Platform',
    desc: 'Offering fairness, transparency, and security, so players can enjoy the game with confidence.',
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Premium Gaming Experience',
    desc: 'Catering to all levels of expertise for a memorable gaming experience.',
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
  },
  {
    title: 'Dedicated Customer Support',
    desc: "We're here to assist you at every turn, ensuring complete satisfaction.",
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
]

export default function AboutUs() {
  const [email, setEmail] = useState('')

  return (
    <div className="min-h-screen bg-white">
      <header className="relative overflow-hidden bg-gradient-to-r from-mahakaal-purple via-mahakaal-violet to-mahakaal-orange py-5 px-6 shadow-lg">
        <div className="absolute inset-0 bg-black/10" />
        <div className="max-w-7xl mx-auto relative flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Mahakaal" className="w-11 h-11 rounded-full object-cover ring-2 ring-white/50 shadow-xl" />
            <span className="text-xl font-bold text-white drop-shadow-sm">Mahakaal</span>
          </Link>
          <nav className="flex items-center gap-8">
            <Link to="/" className="text-white/90 hover:text-white font-medium transition-colors text-sm">Home</Link>
            <Link to="/about-us" className="text-white font-semibold text-sm">About Us</Link>
            <Link to="/contact-us" className="text-white/90 hover:text-white font-medium transition-colors text-sm">Contact Us</Link>
            <Link to="/privacy-policy" className="text-white/90 hover:text-white font-medium transition-colors text-sm">Privacy Policy</Link>
            <Link to="/" className="px-6 py-2.5 rounded-full font-semibold bg-white text-mahakaal-purple shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm">Play Now</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto py-16 px-4 sm:px-6 text-center">
          <p className="text-slate-600 leading-relaxed italic text-base md:text-lg">
          Mahakaal.com is your ultimate destination for downloading apps to play Mahakaal online in India. As pioneers in this field, we have earned the trust of countless players by providing the <strong className="text-slate-800 font-bold not-italic">best app</strong> available in the market. Our aim is to offer a seamless gaming experience where you can enjoy all your favorite Mahakaal games without any worries or concerns about your money. We understand the importance of <strong className="text-slate-800 font-bold not-italic">timely withdrawals</strong>, which is why we’ve designed our platform to ensure you receive your payments promptly. With us, you can rest assured knowing that you’re playing in a <strong className="text-slate-800 font-bold not-italic">safe and secure environment</strong>, where fairness and transparency are our top priorities.
          </p>
        </section>

        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              {aboutFeatures.map((f, i) => (
                <div key={i} className="group text-center p-8 rounded-2xl bg-white border border-slate-100 hover:border-mahakaal-purple/30 hover:shadow-xl hover:shadow-mahakaal-purple/10 transition-all duration-300">
                  <div className="w-24 h-24 mx-auto rounded-full bg-mahakaal-purple/10 border-2 border-mahakaal-purple/40 flex items-center justify-center text-mahakaal-purple mb-5 group-hover:scale-110 group-hover:bg-mahakaal-purple/15 transition-transform">
                    {f.icon}
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-3">{f.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-12 md:gap-20 text-center">
            <div className="group">
              <span className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-mahakaal-purple to-mahakaal-violet bg-clip-text text-transparent">100k</span>
              <span className="text-mahakaal-orange text-2xl font-bold ml-0.5">+</span>
              <p className="text-slate-500 text-sm mt-2 font-medium">Downloads</p>
            </div>
            <div className="group">
              <span className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-mahakaal-purple to-mahakaal-violet bg-clip-text text-transparent">9</span>
              <span className="text-mahakaal-orange text-2xl font-bold ml-0.5">+</span>
              <p className="text-slate-500 text-sm mt-2 font-medium">Games</p>
            </div>
            <div className="group">
              <span className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-mahakaal-purple to-mahakaal-violet bg-clip-text text-transparent">15</span>
              <span className="text-mahakaal-orange text-2xl font-bold ml-0.5">+</span>
              <p className="text-slate-500 text-sm mt-2 font-medium">Team Members</p>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-br from-mahakaal-purple via-mahakaal-violet to-mahakaal-purple py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            <div className="rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/20">
              <img src="/about-us-woman.png" alt="Join Mahakaal and earn" className="w-full h-auto object-cover" />
            </div>
            <div className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold text-white">Join Us Today & Earn Real Money!</h2>
              <p className="text-white/90 text-base md:text-lg">Play real money games such as Gali, Disawar, Faridabad, and more on a single platform!</p>
              <Link to="/#apk" className="inline-flex items-center gap-2 mt-6 px-8 py-4 rounded-lg font-semibold bg-amber-400 text-slate-900 hover:bg-amber-300 transition-colors shadow-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download App
              </Link>
              <div className="flex flex-wrap justify-between md:justify-start gap-8 md:gap-16 pt-6 text-white/90 text-base md:text-lg">
                <span className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold">+</span>
                  1 Lakh + Downloads
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold">+</span>
                  500 k+ Winnings
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="relative py-16 px-4 sm:px-6 bg-slate-50 overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #6C2BD9 2px, transparent 2px)', backgroundSize: '32px 32px' }} />
          <div className="max-w-2xl mx-auto text-center relative">
            <p className="text-sm font-medium text-mahakaal-purple uppercase tracking-wide mb-2">Newsletter</p>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4">
              GET OUR REGULAR <strong className="text-mahakaal-purple">UPDATES, NEWS, OFFERS</strong> DIRECTLY IN YOUR INBOX.
            </h2>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full max-w-md mx-auto px-6 py-4 rounded-full border-2 border-slate-200 focus:border-mahakaal-purple focus:ring-2 focus:ring-mahakaal-purple/20 outline-none transition"
            />
          </div>
        </section>
      </main>

      <footer className="relative py-8 px-4 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-mahakaal-purple/90 to-slate-900" />
        <div className="max-w-5xl mx-auto relative flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-300 text-sm">Made with ❤️ in India</p>
          <p className="text-slate-300 text-sm">© Copyright 2024 Mahakaal Play Online | All Rights Reserved</p>
        </div>
      </footer>
    </div>
  )
}
