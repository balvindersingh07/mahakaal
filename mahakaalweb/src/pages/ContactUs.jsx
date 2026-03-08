import { useState } from 'react'
import { Link } from 'react-router-dom'

function PhoneIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
}

function EmailIcon({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
}

export default function ContactUs() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })
  const handleSubmit = (e) => { e.preventDefault() }
  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))

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
            <Link to="/about-us" className="text-white/90 hover:text-white font-medium transition-colors text-sm">About Us</Link>
            <Link to="/#games" className="text-white/90 hover:text-white font-medium transition-colors text-sm">Games</Link>
            <Link to="/#apk" className="text-white/90 hover:text-white font-medium transition-colors text-sm">Download</Link>
            <Link to="/privacy-policy" className="text-white/90 hover:text-white font-medium transition-colors text-sm">Privacy Policy</Link>
            <Link to="/" className="px-6 py-2.5 rounded-full font-semibold bg-white text-mahakaal-purple shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm">Play Now</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-16 px-4 sm:px-6">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Contact Us</h1>
          <p className="text-xl font-bold text-slate-800 mt-2">Feel free to reach out to us!</p>
          <p className="text-slate-600 mt-4 max-w-3xl mx-auto leading-relaxed">
            Welcome to our helpline! We are committed to serving and assisting you with all your queries. Whether it is a deposit issue, app problem, withdrawal concern, or any other issue you are facing, simply fill out the form below. Our team will promptly respond with a solution. For even faster resolution, you can reach us on our WhatsApp support line. We are available 24/7 to assist you.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">Name</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-mahakaal-purple focus:border-mahakaal-purple outline-none transition" placeholder="Your Name" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-mahakaal-purple focus:border-mahakaal-purple outline-none transition" placeholder="your@email.com" />
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
              <input type="text" id="subject" name="subject" value={formData.subject} onChange={handleChange} required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-mahakaal-purple focus:border-mahakaal-purple outline-none transition" placeholder="Subject" />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">Message</label>
              <textarea id="message" name="message" rows={4} value={formData.message} onChange={handleChange} required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-mahakaal-purple focus:border-mahakaal-purple outline-none transition resize-none" placeholder="Your message..." />
            </div>
            <button type="submit" className="w-full py-4 rounded-lg font-semibold text-white bg-gradient-to-r from-mahakaal-purple to-mahakaal-orange hover:opacity-90 hover:shadow-lg transition-all">
              SEND
            </button>
          </form>

          <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-mahakaal-purple via-mahakaal-violet to-mahakaal-orange p-8 text-white shadow-xl mt-20 lg:mt-24">
            <p className="text-white/90 text-sm font-medium">24X7 Available</p>
            <h3 className="text-xl font-bold mt-2 text-white">Connect with Customer Care</h3>
            <div className="mt-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 ring-2 ring-amber-400/50">
                  <PhoneIcon className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/90 uppercase tracking-wide">WhatsApp and Calling</p>
                  <a href="tel:+919654198570" className="text-lg font-bold text-white hover:underline">+91 9654198570</a>
                  <a href="https://wa.me/919654198570" target="_blank" rel="noopener noreferrer" className="block text-sm text-amber-300 hover:text-amber-200 mt-1">Chat on WhatsApp</a>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 ring-2 ring-amber-400/50">
                  <EmailIcon className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/90 uppercase tracking-wide">Email</p>
                  <a href="mailto:support@mahakaalplayonline.com" className="text-lg font-bold text-white hover:underline">mahakaalsupport@gmail.com</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative py-8 px-4 overflow-hidden bg-slate-900 mt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-mahakaal-purple/90 to-slate-900" />
        <div className="max-w-7xl mx-auto relative flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-300 text-sm">Made with ❤️ in India</p>
          <p className="text-slate-300 text-sm">© Copyright 2024 Mahakaal Play Online | All Rights Reserved</p>
        </div>
      </footer>
    </div>
  )
}
