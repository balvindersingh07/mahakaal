import { Link } from 'react-router-dom'

const tocItems = [
  'What Information Do We Collect?',
  'How Do We Process Your Information?',
  'When and With Whom Do We Share Your Personal Information?',
  'Do We Use Cookies and Other Tracking Technologies?',
  'How Long Do We Keep Your Information?',
  'How Do We Keep Your Information Safe?',
  'Do We Collect Information From Minors?',
  'What Are Your Privacy Rights?',
  'Controls For Do-Not-Track Features',
  'Do We Make Updates To This Notice?',
  'How Can You Contact Us About This Notice?',
  'How Can You Review, Update, Or Delete The Data We Collect From You?',
]

const summaryPoints = [
  { q: 'What personal information do we process?', a: 'When you visit, use, or navigate our services, we may process personal information depending on how you interact with Mahakaal and the services.' },
  { q: 'Do we process sensitive personal information?', a: 'We do not process sensitive personal information.' },
  { q: 'Do we receive any information from third parties?', a: 'We may receive information from public databases, marketing partners, social media platforms, and other outside sources.' },
  { q: 'How do we process your information?', a: 'We process your information to provide, improve, and administer our services, communicate with you, for security and fraud prevention, and to comply with law.' },
  { q: 'In what situations and with which parties do we share personal information?', a: 'We may share information in specific situations and with specific third parties.' },
  { q: 'How do we keep your information safe?', a: 'We have implemented appropriate organizational and technical security measures to protect your personal information.' },
  { q: 'What are your rights?', a: 'Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information.' },
]

const policySections = [
  {
    id: 'collect',
    title: '1. What Information Do We Collect?',
    content: [
      { sub: 'Personal information you disclose to us', text: 'We collect personal information that you voluntarily provide to us when you register on the services, express an interest in obtaining information about us or our products and services, or otherwise contact us. The personal information we collect may include: Phone number, Email address, Username, Contact preferences, Account credentials. All personal information that you provide to us must be true, complete, and accurate.' },
      { sub: 'Information automatically collected', text: 'We automatically collect certain information when you visit, use, or navigate the services. This information may include: IP address, Device information, Browser type, Operating system, Language preferences, Access times, Pages viewed. This information does not reveal your specific identity but may include device and usage information.' },
    ],
  },
  {
    id: 'process',
    title: '2. How Do We Process Your Information?',
    content: [
      { sub: null, text: 'We process your personal information for a variety of reasons, including: To provide and maintain our services, To improve the user experience, To communicate with users, To prevent fraud, To comply with legal obligations, To send updates or notifications.' },
    ],
  },
  {
    id: 'share',
    title: '3. When And With Whom Do We Share Your Personal Information?',
    content: [
      { sub: 'Business Transfers', text: 'We may share or transfer your information in connection with a merger, sale of company assets, financing, or acquisition.' },
      { sub: 'Third-Party Service Providers', text: 'We may share your data with vendors, service providers, contractors, or agents who perform services for us.' },
      { sub: 'Legal Requirements', text: 'We may disclose your information where we are legally required to do so.' },
    ],
  },
  {
    id: 'cookies',
    title: '4. Do We Use Cookies And Other Tracking Technologies?',
    content: [
      { sub: null, text: 'Yes, we may use cookies and similar tracking technologies to access or store information. These technologies help us: Improve website performance, Analyze usage, Provide better services. Users can control cookies through their browser settings.' },
    ],
  },
  {
    id: 'retention',
    title: '5. How Long Do We Keep Your Information?',
    content: [
      { sub: null, text: 'We keep your personal information only as long as necessary to fulfill the purposes outlined in this privacy notice unless a longer retention period is required by law. When we no longer need to process your personal information, we will delete or anonymize it.' },
    ],
  },
  {
    id: 'security',
    title: '6. How Do We Keep Your Information Safe?',
    content: [
      { sub: null, text: 'We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure.' },
    ],
  },
  {
    id: 'minors',
    title: '7. Do We Collect Information From Minors?',
    content: [
      { sub: null, text: 'We do not knowingly collect data from or market to children under 18 years of age. If we learn that personal information from users under 18 years of age has been collected, we will deactivate the account and delete such data.' },
    ],
  },
  {
    id: 'rights',
    title: '8. What Are Your Privacy Rights?',
    content: [
      { sub: null, text: 'In some regions, such as the European Economic Area (EEA), United Kingdom, and Canada, you have rights that allow you greater access to and control over your personal information. These rights may include: Request access to your personal data, Request correction, Request deletion, Withdraw consent. You can make such a request by contacting us.' },
    ],
  },
  {
    id: 'dnt',
    title: '9. Controls For Do-Not-Track Features',
    content: [
      { sub: null, text: 'Most web browsers and some mobile operating systems include a Do-Not-Track feature that signals your privacy preference not to have data about your browsing activities monitored. At this time, we do not respond to Do-Not-Track signals.' },
    ],
  },
  {
    id: 'updates',
    title: '10. Do We Make Updates To This Notice?',
    content: [
      { sub: null, text: 'Yes, we may update this privacy notice from time to time. The updated version will be indicated by an updated "Last updated" date.' },
    ],
  },
  {
    id: 'contact',
    title: '11. How Can You Contact Us About This Notice?',
    content: [
      { sub: null, text: 'If you have questions or comments about this notice, you may contact us at: Email: support@mahakaal.com' },
    ],
  },
  {
    id: 'review',
    title: '12. How Can You Review, Update, Or Delete The Data We Collect From You?',
    content: [
      { sub: null, text: 'You have the right to request access to the personal information we collect from you, change that information, or delete it. To request to review, update, or delete your personal information, please contact us.' },
    ],
  },
]

export default function PrivacyPolicy() {
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
            <Link to="/contact-us" className="text-white/90 hover:text-white font-medium transition-colors text-sm">Contact Us</Link>
            <Link to="/" className="px-6 py-2.5 rounded-full font-semibold bg-white text-mahakaal-purple shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm">Play Now</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Privacy Policy</h1>
          <p className="text-slate-600 mt-2">Last updated: May 30, 2024</p>
        </div>
        <div className="prose prose-slate max-w-none">
          <section className="mb-10">
            <p className="text-slate-700 leading-relaxed mb-4">
              This privacy notice for Mahakaal Play Online (&quot;Mahakaal&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) describes how and why we might collect, store, use, and/or share your information when you use our services, such as when you:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
              <li>Visit our website</li>
              <li>Download or use our mobile application</li>
              <li>Engage with us in other related ways, including any sales, marketing, or events</li>
            </ul>
            <p className="text-slate-700 leading-relaxed">
              Questions or concerns? Reading this privacy notice will help you understand your privacy rights and choices. If you do not agree with our policies and practices, please do not use our services. If you still have any questions or concerns, please contact us.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide mb-4">Summary of Key Points</h2>
            <p className="text-slate-700 mb-4">This summary provides key points from our privacy notice.</p>
            <ul className="space-y-4">
              {summaryPoints.map((item, i) => (
                <li key={i}>
                  <span className="font-semibold text-slate-800">{item.q}</span>
                  <p className="text-slate-700 mt-1">{item.a}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide mb-4">Table of Contents</h2>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              {tocItems.map((item, i) => (
                <li key={i}>
                  <a href={`#${policySections[i]?.id || 'section'}`} className="text-mahakaal-purple hover:underline">
                    {item}
                  </a>
                </li>
              ))}
            </ol>
          </section>

          {policySections.map((section, i) => (
            <section key={i} id={section.id} className="mb-10 scroll-mt-24">
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide mb-3">{section.title}</h2>
              {section.content.map((block, j) => (
                <div key={j} className="mb-4">
                  {block.sub && <h3 className="font-semibold text-slate-800 mb-2">{block.sub}</h3>}
                  <p className="text-slate-700 leading-relaxed">{block.text}</p>
                </div>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 text-center">
          <p className="text-slate-600 text-sm">Last Updated: May 30, 2024</p>
          <Link to="/" className="inline-block mt-4 px-8 py-3 rounded-full font-semibold text-white bg-gradient-to-r from-mahakaal-purple to-mahakaal-orange hover:shadow-lg transition-all">
            Back to Home
          </Link>
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
