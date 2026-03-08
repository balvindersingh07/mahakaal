import { useState, useEffect, useRef } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useInView } from './useInView'
import PrivacyPolicy from './pages/PrivacyPolicy'
import ContactUs from './pages/ContactUs'
import AboutUs from './pages/AboutUs'

// APK download - update this when new build is ready (or replace public/Mahakaal.apk)
const APK_DOWNLOAD_URL = '/Mahakaal.apk'

const navLinks = [
  { name: 'Home', href: '/', hash: '#home' },
  { name: 'Games', href: '/', hash: '#games' },
  { name: 'Download', href: '/', hash: '#apk' },
  { name: 'About Us', href: '/about-us', hash: null },
  { name: 'Contact Us', href: '/contact-us', hash: null },
  { name: 'Privacy Policy', href: '/privacy-policy', hash: null },
]

const games = ['OLD DISAWAR', 'FARIDABAD', 'DISAWAR', 'GHAZIABAD', 'GALI', 'SHREE GANESH', 'DELHI BAZAR', 'PATNA', 'NEW FARIDABAD']

const features = [
  { name: 'Fast Withdrawals', icon: '💸' },
  { name: '100% Secure Platform', icon: '🛡️' },
  { name: 'Instant UPI Deposits', icon: '⚡' },
  { name: '10+ Popular Games', icon: '🎮' },
  { name: '24×7 Customer Support', icon: '🎧' },
]

const steps = [
  'Download the Mahakaal App',
  'Add money using UPI',
  'Choose your favorite game',
  'Place your number bet',
  'Withdraw winnings instantly',
]

const testimonials = [
  { name: 'Rahul S.', location: 'Delhi', rating: 5, text: 'Best platform to play! Fast withdrawals and amazing support. Highly recommended.', avatar: 'https://ui-avatars.com/api/?name=Rahul+S&background=6C2BD9&color=fff&size=128' },
  { name: 'Priya M.', location: 'Mumbai', rating: 5, text: 'Love the variety of games. The app is smooth and deposits are instant. Great experience!', avatar: 'https://ui-avatars.com/api/?name=Priya+M&background=A855F7&color=fff&size=128' },
  { name: 'Amit K.', location: 'Bangalore', rating: 5, text: 'Super fast UPI deposits. Played Gali and Desawar. Withdrawal within minutes. Amazing!', avatar: 'https://ui-avatars.com/api/?name=Amit+K&background=6C2BD9&color=fff&size=128' },
  { name: 'Sneha R.', location: 'Chennai', rating: 5, text: 'Trusted platform. No issues with payments. Customer support is always helpful.', avatar: 'https://ui-avatars.com/api/?name=Sneha+R&background=A855F7&color=fff&size=128' },
  { name: 'Vikram P.', location: 'Lucknow', rating: 5, text: 'Best satta app in Uttar Pradesh. Daily results on time. Highly satisfied!', avatar: 'https://ui-avatars.com/api/?name=Vikram+P&background=6C2BD9&color=fff&size=128' },
  { name: 'Anjali D.', location: 'Hyderabad', rating: 5, text: 'Easy to use app. Won multiple times. Withdrawal process is super smooth.', avatar: 'https://ui-avatars.com/api/?name=Anjali+D&background=A855F7&color=fff&size=128' },
  { name: 'Rohit S.', location: 'Pune', rating: 5, text: 'Great variety of games. Faridabad and Ghaziabad are my favourites. 5 stars!', avatar: 'https://ui-avatars.com/api/?name=Rohit+S&background=6C2BD9&color=fff&size=128' },
  { name: 'Pooja N.', location: 'Jaipur', rating: 5, text: 'Safe and secure. Play daily. Never faced any payment delays. Love Mahakaal!', avatar: 'https://ui-avatars.com/api/?name=Pooja+N&background=A855F7&color=fff&size=128' },
  { name: 'Deepak M.', location: 'Ahmedabad', rating: 5, text: 'Best app for number games. Instant deposits via UPI. Recommend to all!', avatar: 'https://ui-avatars.com/api/?name=Deepak+M&background=6C2BD9&color=fff&size=128' },
  { name: 'Kavita J.', location: 'Kolkata', rating: 5, text: 'Smooth experience. Results update quickly. Withdrew ₹15,000 without any hassle.', avatar: 'https://ui-avatars.com/api/?name=Kavita+J&background=A855F7&color=fff&size=128' },
  { name: 'Manish T.', location: 'Chandigarh', rating: 5, text: 'Reliable platform. Play Old Disawar and Delhi Bazar. Great support team.', avatar: 'https://ui-avatars.com/api/?name=Manish+T&background=6C2BD9&color=fff&size=128' },
  { name: 'Neha G.', location: 'Indore', rating: 5, text: 'Clean UI and fast app. Deposits reflect in seconds. Very happy with service.', avatar: 'https://ui-avatars.com/api/?name=Neha+G&background=A855F7&color=fff&size=128' },
  { name: 'Suresh B.', location: 'Bhopal', rating: 5, text: 'Playing since 6 months. No complaints. Withdrawals are always on time.', avatar: 'https://ui-avatars.com/api/?name=Suresh+B&background=6C2BD9&color=fff&size=128' },
  { name: 'Sunita L.', location: 'Patna', rating: 5, text: 'Best platform in Bihar. Simple registration. Got my first win in 2 days!', avatar: 'https://ui-avatars.com/api/?name=Sunita+L&background=A855F7&color=fff&size=128' },
  { name: 'Ravi K.', location: 'Surat', rating: 5, text: 'Amazing app! Multiple games. Fast payouts. What else do you need?', avatar: 'https://ui-avatars.com/api/?name=Ravi+K&background=6C2BD9&color=fff&size=128' },
  { name: 'Meera V.', location: 'Kochi', rating: 5, text: 'Trustworthy and transparent. Results are fair. Will keep playing!', avatar: 'https://ui-avatars.com/api/?name=Meera+V&background=A855F7&color=fff&size=128' },
  { name: 'Ajay R.', location: 'Nagpur', rating: 5, text: 'Great experience. Customer care responds quickly. Recommended to friends.', avatar: 'https://ui-avatars.com/api/?name=Ajay+R&background=6C2BD9&color=fff&size=128' },
  { name: 'Preeti S.', location: 'Ludhiana', rating: 5, text: 'Smooth deposits. Instant withdrawals. Best satta app I have used so far.', avatar: 'https://ui-avatars.com/api/?name=Preeti+S&background=A855F7&color=fff&size=128' },
  { name: 'Sanjay D.', location: 'Kanpur', rating: 5, text: 'Daily player. Never missed a result. App runs smoothly on my phone.', avatar: 'https://ui-avatars.com/api/?name=Sanjay+D&background=6C2BD9&color=fff&size=128' },
  { name: 'Divya C.', location: 'Coimbatore', rating: 5, text: 'Safe to use. Payment proof from my side – got ₹8,000 in 10 minutes.', avatar: 'https://ui-avatars.com/api/?name=Divya+C&background=A855F7&color=fff&size=128' },
  { name: 'Vijay H.', location: 'Allahabad', rating: 5, text: 'Professional platform. No fake promises. Real wins, real withdrawals.', avatar: 'https://ui-avatars.com/api/?name=Vijay+H&background=6C2BD9&color=fff&size=128' },
  { name: 'Lakshmi P.', location: 'Vijayawada', rating: 5, text: 'Joined last month. Already won 3 times. Mahakaal is legit and fast.', avatar: 'https://ui-avatars.com/api/?name=Lakshmi+P&background=A855F7&color=fff&size=128' },
  { name: 'Arun N.', location: 'Guwahati', rating: 5, text: 'From Assam, playing here. UPI works perfectly. No issues at all.', avatar: 'https://ui-avatars.com/api/?name=Arun+N&background=6C2BD9&color=fff&size=128' },
  { name: 'Swati M.', location: 'Ranchi', rating: 5, text: 'Best app for Jharkhand players. Quick support. Loving the experience!', avatar: 'https://ui-avatars.com/api/?name=Swati+M&background=A855F7&color=fff&size=128' },
  { name: 'Rajesh Y.', location: 'Mysore', rating: 5, text: 'Clean design. Easy to navigate. Deposits and withdrawals are instant.', avatar: 'https://ui-avatars.com/api/?name=Rajesh+Y&background=6C2BD9&color=fff&size=128' },
  { name: 'Kiran W.', location: 'Srinagar', rating: 5, text: 'Playing from Kashmir. App works well. Support team is very helpful.', avatar: 'https://ui-avatars.com/api/?name=Kiran+W&background=A855F7&color=fff&size=128' },
  { name: 'Nikhil Z.', location: 'Thiruvananthapuram', rating: 5, text: 'Satisfied user. Multiple games to choose from. Fair and transparent.', avatar: 'https://ui-avatars.com/api/?name=Nikhil+Z&background=6C2BD9&color=fff&size=128' },
  { name: 'Shweta A.', location: 'Raipur', rating: 5, text: 'Best in Chhattisgarh. Fast withdrawal. Will recommend to everyone!', avatar: 'https://ui-avatars.com/api/?name=Shweta+A&background=A855F7&color=fff&size=128' },
  { name: 'Manoj F.', location: 'Bhubaneswar', rating: 5, text: 'Playing from Odisha. Great platform. Withdrew ₹12,500 last week. Smooth!', avatar: 'https://ui-avatars.com/api/?name=Manoj+F&background=6C2BD9&color=fff&size=128' },
  { name: 'Reema O.', location: 'Dehradun', rating: 5, text: 'Uttarakhand player here. App is smooth. No lag. Results on time.', avatar: 'https://ui-avatars.com/api/?name=Reema+O&background=A855F7&color=fff&size=128' },
  { name: 'Pankaj Q.', location: 'Jodhpur', rating: 5, text: 'Rajasthan player. Trust this app completely. Won multiple times.', avatar: 'https://ui-avatars.com/api/?name=Pankaj+Q&background=6C2BD9&color=fff&size=128' },
  { name: 'Anita U.', location: 'Shimla', rating: 5, text: 'Himachal se hun. Mahakaal best hai. Withdrawal kabhi delay nahi hua.', avatar: 'https://ui-avatars.com/api/?name=Anita+U&background=A855F7&color=fff&size=128' },
  { name: 'Karan E.', location: 'Amritsar', rating: 5, text: 'Punjab player. Fast deposits via PhonePe. Results accurate. 5 stars!', avatar: 'https://ui-avatars.com/api/?name=Karan+E&background=6C2BD9&color=fff&size=128' },
  { name: 'Pallavi I.', location: 'Agra', rating: 5, text: 'Taj city se. Playing Gali and Faridabad. Great experience so far!', avatar: 'https://ui-avatars.com/api/?name=Pallavi+I&background=A855F7&color=fff&size=128' },
  { name: 'Vivek G.', location: 'Vadodara', rating: 5, text: 'Gujarat player. Secure platform. Withdrawal in 5 mins. Highly recommended!', avatar: 'https://ui-avatars.com/api/?name=Vivek+G&background=6C2BD9&color=fff&size=128' },
  { name: 'Ritu B.', location: 'Nashik', rating: 5, text: 'Maharashtra se. Best satta app. Customer support 24x7. Love it!', avatar: 'https://ui-avatars.com/api/?name=Ritu+B&background=A855F7&color=fff&size=128' },
  { name: 'Dinesh L.', location: 'Rajkot', rating: 5, text: 'Saurashtra player. App bahut accha hai. Withdrawal jaldi milta hai.', avatar: 'https://ui-avatars.com/api/?name=Dinesh+L&background=6C2BD9&color=fff&size=128' },
  { name: 'Nisha K.', location: 'Mangalore', rating: 5, text: 'Karnataka coast. Playing since 3 months. Zero issues. Great app!', avatar: 'https://ui-avatars.com/api/?name=Nisha+K&background=A855F7&color=fff&size=128' },
  { name: 'Gopal R.', location: 'Tiruchirappalli', rating: 5, text: 'Tamil Nadu player. Trusted platform. Withdrew ₹20,000 last month.', avatar: 'https://ui-avatars.com/api/?name=Gopal+R&background=6C2BD9&color=fff&size=128' },
  { name: 'Sonali T.', location: 'Madurai', rating: 5, text: 'Southern India. App runs smooth. Deposits instant. Very satisfied!', avatar: 'https://ui-avatars.com/api/?name=Sonali+T&background=A855F7&color=fff&size=128' },
  { name: 'Tarun V.', location: 'Bareilly', rating: 5, text: 'UP player. Best platform. Fast results. Withdrawal same day. Amazing!', avatar: 'https://ui-avatars.com/api/?name=Tarun+V&background=6C2BD9&color=fff&size=128' },
  { name: 'Ishita C.', location: 'Meerut', rating: 5, text: 'NCR region. Play daily. App never crashes. Support is prompt.', avatar: 'https://ui-avatars.com/api/?name=Ishita+C&background=A855F7&color=fff&size=128' },
  { name: 'Yogesh M.', location: 'Gwalior', rating: 5, text: 'MP se. Legit platform. Won ₹5,500 last week. Withdrawal fast.', avatar: 'https://ui-avatars.com/api/?name=Yogesh+M&background=6C2BD9&color=fff&size=128' },
  { name: 'Bhavna S.', location: 'Jabalpur', rating: 5, text: 'Central India player. Great games. Fair play. Recommend to all!', avatar: 'https://ui-avatars.com/api/?name=Bhavna+S&background=A855F7&color=fff&size=128' },
  { name: 'Ashok P.', location: 'Allahabad', rating: 5, text: 'Prayagraj se. Playing Desawar and Gali. Very reliable platform.', avatar: 'https://ui-avatars.com/api/?name=Ashok+P&background=6C2BD9&color=fff&size=128' },
  { name: 'Chandni D.', location: 'Udaipur', rating: 5, text: 'Lake city player. Beautiful app. Fast payouts. 100% trusted.', avatar: 'https://ui-avatars.com/api/?name=Chandni+D&background=A855F7&color=fff&size=128' },
  { name: 'Omkar J.', location: 'Kolhapur', rating: 5, text: 'Maharashtra. Playing Shree Ganesh. Withdrawal smooth. 5 stars!', avatar: 'https://ui-avatars.com/api/?name=Omkar+J&background=6C2BD9&color=fff&size=128' },
  { name: 'Farheen A.', location: 'Srinagar', rating: 5, text: 'J&K player. App works great. Support helpful. Happy customer.', avatar: 'https://ui-avatars.com/api/?name=Farheen+A&background=A855F7&color=fff&size=128' },
  { name: 'Harshit W.', location: 'Panaji', rating: 5, text: 'Goa se. Best satta app. Beach par bhi khel sakte ho. Smooth!', avatar: 'https://ui-avatars.com/api/?name=Harshit+W&background=6C2BD9&color=fff&size=128' },
  { name: 'Jyoti N.', location: 'Gangtok', rating: 5, text: 'Sikkim player. App runs well in hills too. Great service!', avatar: 'https://ui-avatars.com/api/?name=Jyoti+N&background=A855F7&color=fff&size=128' },
  { name: 'Lokesh X.', location: 'Imphal', rating: 5, text: 'Manipur se. Playing New Faridabad. Withdrawal fast. Trusted app.', avatar: 'https://ui-avatars.com/api/?name=Lokesh+X&background=6C2BD9&color=fff&size=128' },
  { name: 'Monika K.', location: 'Shillong', rating: 5, text: 'Meghalaya player. Beautiful UI. Instant deposits. Highly recommend!', avatar: 'https://ui-avatars.com/api/?name=Monika+K&background=A855F7&color=fff&size=128' },
  { name: 'Prateek R.', location: 'Kohima', rating: 5, text: 'Nagaland se. Limited options in NE, but Mahakaal delivers. Great!', avatar: 'https://ui-avatars.com/api/?name=Prateek+R&background=6C2BD9&color=fff&size=128' },
  { name: 'Sarita L.', location: 'Aizawl', rating: 5, text: 'Mizoram player. App works perfectly. Withdrawal same day. Love it!', avatar: 'https://ui-avatars.com/api/?name=Sarita+L&background=A855F7&color=fff&size=128' },
  { name: 'Umesh P.', location: 'Itanagar', rating: 5, text: 'Arunachal Pradesh. Playing from Northeast. No issues. Smooth app.', avatar: 'https://ui-avatars.com/api/?name=Umesh+P&background=6C2BD9&color=fff&size=128' },
  { name: 'Vinita S.', location: 'Port Blair', rating: 5, text: 'Andaman player. Even from islands, app works. Amazing service!', avatar: 'https://ui-avatars.com/api/?name=Vinita+S&background=A855F7&color=fff&size=128' },
]

const faqs = [
  {
    q: 'How to register & play on Mahakaal online app?',
    content: (
      <>
        <ul className="list-disc list-inside space-y-2 mb-3">
          <li>Download the app: Get the Mahakaal Play Online app.</li>
          <li>Register: Sign up with your details.</li>
          <li>Add funds: Deposit money into your wallet.</li>
          <li>Explore games: Choose your favorite game.</li>
          <li>Place bets: Start playing and enjoy the thrill.</li>
          <li>Withdraw winnings: Cash out seamlessly when you win.</li>
        </ul>
        <p>Incase you need help contact us on the <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="underline text-mahakaal-purple hover:text-mahakaal-orange">whatsApp support!</a></p>
      </>
    ),
  },
  { q: 'What is the minimum deposit and withdrawal limit?', a: 'You can start with just ₹50 for deposits and withdraw your winnings with a minimum of ₹100. Keep it simple, start playing!' },
  { q: 'How can we deposit and withdraw on Mahakaal play Online Application?', a: 'Deposit easily via the app using UPI apps like Paytm, PhonePe, and Google Pay. For alternative methods or withdrawal, contact our WhatsApp support. Simplify your transactions!' },
  { q: 'Is it safe to play Mahakaal online?', a: 'Yes, your safety is our priority. Mahakaal Play Online employs advanced security measures to ensure a secure and trustworthy gaming environment. Play with confidence and enjoy the games.' },
]

const apkFeatures = ['Fast gameplay', 'Secure login', 'Instant withdrawals', 'Daily results updates']

const winNames = ['Rahul', 'Aman', 'Suresh', 'Vikas', 'Ravi', 'Manoj', 'Ajay', 'Deepak', 'Pankaj', 'Sonu']
const winCities = ['Delhi', 'Mumbai', 'Jaipur', 'Lucknow', 'Chandigarh', 'Patna', 'Indore', 'Surat', 'Bhopal']
const winGames = ['Gali', 'Faridabad', 'Desawar', 'Ghaziabad', 'Delhi Bazar']
const winAmounts = ['₹1,200', '₹3,500', '₹7,500', '₹12,000', '₹35,000', '₹50,000']
const winEmojis = ['🔥', '🎉', '⚡', '💰']

function TelegramIcon({ className }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
}

function WhatsAppIcon({ className }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
}

function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function AnimatedCounter({ end, prefix = '', suffix = '', duration = 3000 }) {
  const [count, setCount] = useState(0)
  const [ref, inView] = useInView({ threshold: 0.3 })
  useEffect(() => {
    if (!inView) return
    let start = 0
    const inc = end / (duration / 16)
    const timer = setInterval(() => {
      start += inc
      if (start >= end) { setCount(end); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [inView, end, duration])
  return <span ref={ref}>{prefix}{count.toLocaleString('en-IN')}{suffix}</span>
}

function LiveIncreasingCounter({ initialValue, increment, intervalMs = 4000, prefix = '' }) {
  const [value, setValue] = useState(initialValue)
  useEffect(() => {
    const t = setInterval(() => setValue(v => v + increment), intervalMs)
    return () => clearInterval(t)
  }, [increment, intervalMs])
  return <span>{prefix}{value.toLocaleString('en-IN')}</span>
}

function StatsCounter() {
  const [ref, inView] = useInView()
  const stats = [
    { label: 'Users Online', live: true, initialValue: 12348, increment: 2, intervalMs: 5000 },
    { label: 'Total Winnings', live: true, initialValue: 52345000, increment: 15000, intervalMs: 6000, prefix: '₹' },
    { label: 'Daily Winners', live: true, initialValue: 542, increment: 50, intervalMs: 3600000 },
    { label: '24×7 Active Platform', isStatic: true },
  ]
  return (
    <section ref={ref} className="py-8 md:py-12 px-4 bg-white border-b border-slate-200">
      <div className={`max-w-7xl mx-auto transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-mahakaal-purple to-mahakaal-orange bg-clip-text text-transparent">
                {s.isStatic ? '24×7' : s.live ? (
                  <LiveIncreasingCounter initialValue={s.initialValue} increment={s.increment} intervalMs={s.intervalMs} prefix={s.prefix || ''} />
                ) : (
                  <AnimatedCounter end={s.value} prefix="" suffix="" />
                )}
              </p>
              <p className="text-slate-600 text-sm mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WinNotification({ notification, onExit, index }) {
  const [isExiting, setIsExiting] = useState(false)
  useEffect(() => { const t = setTimeout(() => setIsExiting(true), 4000); return () => clearTimeout(t) }, [])
  useEffect(() => { if (isExiting) { const t = setTimeout(onExit, 500); return () => clearTimeout(t) } }, [isExiting, onExit])
  return (
    <div className={`fixed left-6 z-[100] max-w-sm w-[calc(100vw-3rem)] rounded-2xl overflow-hidden transition-all duration-500 ${isExiting ? 'opacity-0 -translate-x-5' : 'opacity-100 translate-x-0'}`} style={{ bottom: `${1.5 + index * 6}rem`, boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px rgba(108,43,217,0.3)' }}>
      <div className="bg-white/90 backdrop-blur-xl p-4 flex items-center gap-3 rounded-2xl border border-white/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-mahakaal-purple/5 via-mahakaal-violet/5 to-mahakaal-orange/5" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-mahakaal-purple via-mahakaal-violet to-mahakaal-orange" />
        <span className="absolute top-2 right-2 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(notification.name)}&background=6C2BD9&color=fff&size=64`} alt="" className="w-12 h-12 rounded-full flex-shrink-0 ring-2 ring-white shadow-lg" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{notification.emoji} {notification.name} from {notification.city}</p>
          <p className="text-xs text-slate-600">just won <span className="font-bold text-emerald-600">{notification.amount}</span> in {notification.game}</p>
        </div>
      </div>
    </div>
  )
}

function WinNotifications() {
  const [notifications, setNotifications] = useState([])
  const timersRef = useRef([])
  useEffect(() => {
    const addNotification = () => {
      setNotifications(prev => [...prev.slice(-2), { id: Date.now() + Math.random(), name: randomPick(winNames), city: randomPick(winCities), game: randomPick(winGames), amount: randomPick(winAmounts), emoji: randomPick(winEmojis) }])
    }
    const schedule = () => { const delay = 5000 + Math.random() * 3000; const t = setTimeout(() => { addNotification(); schedule() }, delay); timersRef.current.push(t) }
    schedule()
    return () => timersRef.current.forEach(clearTimeout)
  }, [])
  return <>{notifications.map((n, i) => <WinNotification key={n.id} notification={n} index={notifications.length - 1 - i} onExit={() => setNotifications(prev => prev.filter(x => x.id !== n.id))} />)}</>
}

function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Mahakaal" className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover ring-2 ring-white shadow-[0_4px_20px_rgba(108,43,217,0.3)]" />
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-mahakaal-purple via-mahakaal-violet to-mahakaal-orange bg-clip-text text-transparent">Mahakaal</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => link.hash ? <a key={link.name} href={link.href + link.hash} className="text-slate-800 font-semibold hover:text-mahakaal-purple transition-colors">{link.name}</a> : <Link key={link.name} to={link.href} className="text-slate-800 font-semibold hover:text-mahakaal-purple transition-colors">{link.name}</Link>)}
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">{mobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}</svg>
          </button>
        </div>
        {mobileMenuOpen && <div className="md:hidden py-4 space-y-3 border-t border-slate-200">{navLinks.map(link => link.hash ? <a key={link.name} href={link.href + link.hash} onClick={() => setMobileMenuOpen(false)} className="block text-slate-800 font-semibold hover:text-mahakaal-purple">{link.name}</a> : <Link key={link.name} to={link.href} onClick={() => setMobileMenuOpen(false)} className="block text-slate-800 font-semibold hover:text-mahakaal-purple">{link.name}</Link>)}</div>}
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section id="home" className="relative pt-24 md:pt-32 pb-20 md:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden animate-gradient-bg">
      {[...Array(6)].map((_, i) => <div key={i} className="absolute w-2 h-2 md:w-3 md:h-3 rounded-full bg-mahakaal-purple/40 animate-particle-float pointer-events-none" style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 4) * 20}%`, animationDelay: `${i * 0.5}s` }} />)}
      {[...Array(4)].map((_, i) => <div key={`b${i}`} className="absolute w-2 h-2 rounded-full bg-mahakaal-orange/30 animate-particle-float pointer-events-none" style={{ right: `${10 + i * 20}%`, top: `${30 + (i % 3) * 25}%`, animationDelay: `${i * 0.7}s` }} />)}
      <div className="max-w-7xl mx-auto relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">Play Mahakaal <span className="bg-gradient-to-r from-mahakaal-purple via-mahakaal-violet to-mahakaal-orange bg-clip-text text-transparent">Online App</span></h1>
            <p className="mt-6 text-lg text-slate-700 max-w-xl font-medium">Play real number games like Gali, Desawar, Faridabad and more on one powerful platform.</p>
            <div className="flex flex-wrap gap-4 mt-8">
              <a href={APK_DOWNLOAD_URL} download="Mahakaal.apk" className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-white download-btn btn-ripple">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download Mahakaal App
              </a>
              <a href="#games" className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold border-2 border-mahakaal-purple text-mahakaal-purple hover:bg-mahakaal-purple/10 transition-all hover:scale-105">View Games</a>
            </div>
          </div>
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative rounded-3xl p-4 bg-white/30 backdrop-blur-xl border border-white/40 shadow-2xl" style={{ boxShadow: '0 0 60px rgba(168,85,247,0.2)' }}>
              <img src="/hero-screen.png" alt="Mahakaal App" className="rounded-2xl w-full max-w-[280px] lg:max-w-[320px] object-contain animate-float" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ProGameCard({ game }) {
  const [ref, inView] = useInView()
  return (
    <div ref={ref} className={`group relative rounded-2xl overflow-hidden bg-white/90 backdrop-blur border-2 border-slate-200 hover:border-mahakaal-purple/40 shadow-lg hover:shadow-[0_0_40px_rgba(108,43,217,0.2)] hover:-translate-y-1 transition-all duration-300 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-mahakaal-purple/5 to-mahakaal-orange/5 opacity-0 group-hover:opacity-100" />
      <div className="relative p-6 flex items-center justify-between gap-4">
        <h3 className="font-bold text-slate-900 text-lg">{game}</h3>
        <a href={APK_DOWNLOAD_URL} download="Mahakaal.apk" className="flex-shrink-0 px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-mahakaal-purple to-mahakaal-orange hover:shadow-lg hover:scale-105 transition-all">PLAY</a>
      </div>
    </div>
  )
}

function Games() {
  const [ref, inView] = useInView()
  return (
    <section ref={ref} id="games" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center">Live Games Available</h2>
        <p className="text-slate-600 text-center mt-2">Choose your game and start playing</p>
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 transition-all duration-700 ${inView ? 'opacity-100' : 'opacity-0'}`}>
          {games.map((game) => <ProGameCard key={game} game={game} />)}
        </div>
      </div>
    </section>
  )
}

function APKDownloadSection() {
  const [ref, inView] = useInView()
  return (
    <section ref={ref} id="apk" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className={`max-w-7xl mx-auto transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Download Mahakaal App</h2>
            <p className="mt-4 text-slate-600 text-lg">Install the Mahakaal Android App to play faster and get instant withdrawals.</p>
            <ul className="mt-6 space-y-3">
              {apkFeatures.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-slate-700"><span className="w-6 h-6 rounded-full bg-mahakaal-purple/20 flex items-center justify-center text-mahakaal-purple text-sm font-bold">✓</span>{f}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-4 mt-8">
              <a href={APK_DOWNLOAD_URL} download="Mahakaal.apk" className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-white bg-gradient-to-r from-mahakaal-purple to-mahakaal-orange hover:shadow-lg hover:scale-105 transition-all">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 2.048a1.7 1.7 0 01.484.033 2.5 2.5 0 011.828 2.167c.16 1.414.16 2.674 0 4.088a2.5 2.5 0 01-1.828 2.167 1.7 1.7 0 01-.484.033h-1.5v8.5a1.5 1.5 0 01-3 0v-8.5h-2v8.5a1.5 1.5 0 01-3 0v-8.5H6.023a1.7 1.7 0 01-.484-.033 2.5 2.5 0 01-1.828-2.167c-.16-1.414-.16-2.674 0-4.088A2.5 2.5 0 015.539 2.08a1.7 1.7 0 01.484-.032h11zM6.5 5.5a1 1 0 100-2 1 1 0 000 2zm4 0a1 1 0 100-2 1 1 0 000 2z"/></svg>
                Download APK
              </a>
              <a href="#download" className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold border-2 border-mahakaal-purple text-mahakaal-purple hover:bg-mahakaal-purple/10 transition-all">How to Install</a>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative">
              <img src="/hero-screen.png" alt="Mahakaal App" className="w-48 md:w-64 rounded-2xl shadow-2xl ring-2 ring-mahakaal-purple/20" />
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-xl bg-white shadow-lg flex items-center justify-center border-2 border-slate-200">
                <svg className="w-10 h-10" viewBox="0 0 24 24"><path fill="#3DDC84" d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/></svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TelegramJoinSection() {
  const [ref, inView] = useInView()
  return (
    <section ref={ref} className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-mahakaal-purple/10 via-mahakaal-violet/10 to-mahakaal-orange/10">
      <div className={`max-w-2xl mx-auto text-center transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Join Mahakaal Channels</h2>
        <p className="mt-4 text-slate-600">Get instant updates on results and exclusive offers</p>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <a href="https://t.me/mahakaalapp" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-10 py-4 rounded-full font-semibold text-white bg-[#0088cc] hover:bg-[#0077b5] transition-all hover:scale-105 shadow-lg">
            <TelegramIcon className="w-6 h-6" />
            Join Telegram
          </a>
          <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-10 py-4 rounded-full font-semibold text-white bg-[#25D366] hover:bg-[#20BD5A] transition-all hover:scale-105 shadow-lg">
            <WhatsAppIcon className="w-6 h-6" />
            Join WhatsApp
          </a>
        </div>
      </div>
    </section>
  )
}

function WhyChooseUs() {
  const [ref, inView] = useInView()
  return (
    <section ref={ref} className="relative py-16 md:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-mahakaal-purple via-mahakaal-violet to-mahakaal-purple" />
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 40px)' }} />
      <div className={`max-w-7xl mx-auto relative transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center">Why Choose Us?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 mt-12">
          {features.map(f => (
            <div key={f.name} className="flex flex-col items-center group">
              <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-4xl mb-4 border-2 border-white/30 group-hover:scale-110 group-hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all">{f.icon}</div>
              <h3 className="font-semibold text-white text-center text-sm md:text-base">{f.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const howtoImages = ['/howto-0-splash.png', '/howto-1-welcome.png', '/howto-2-games.png', '/howto-3-menu.png']

function HowToPlay() {
  const [ref, inView] = useInView()
  const prefersReducedMotion = useReducedMotion()
  return (
    <section ref={ref} id="download" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
      <div className={`max-w-7xl mx-auto transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">How to Play Mahakaal Online & Earn Money?</h2>
            <div className="mt-8 relative">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-6 pb-8 last:pb-0 relative">
                  {i < steps.length - 1 && <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gradient-to-b from-mahakaal-purple to-mahakaal-orange" />}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-mahakaal-purple to-mahakaal-orange text-white font-bold flex items-center justify-center shadow-lg z-10">{i + 1}</div>
                  <p className="text-slate-800 font-medium pt-1">{step}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-6 md:gap-8 items-center" style={{ perspective: 800 }}>
            {howtoImages.map((src, i) => (
              <motion.div
                key={i}
                className="flex justify-center"
                initial={{ x: 60, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <motion.div
                  className="rounded-2xl overflow-hidden shadow-xl ring-2 ring-mahakaal-purple/20 w-40 h-64 sm:w-44 sm:h-72 md:w-52 md:h-80 flex items-center justify-center bg-slate-100 cursor-default"
                  animate={prefersReducedMotion ? {} : { y: [0, -8, 0] }}
                  transition={
                    prefersReducedMotion
                      ? {}
                      : { y: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' } }
                  }
                  whileHover={{
                    scale: 1.04,
                    rotateY: 6,
                    rotateX: -4,
                    z: 20,
                    transition: { duration: 0.25 },
                    boxShadow: '0 25px 50px -12px rgba(108, 43, 217, 0.2), 0 0 0 1px rgba(108, 43, 217, 0.08)',
                  }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <img
                    src={src}
                    alt={`Mahakaal step ${i + 1}`}
                    className="w-full h-full object-cover select-none"
                    draggable={false}
                    loading="lazy"
                  />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Testimonials() {
  const [ref, inView] = useInView()
  const StarIcon = () => <svg className="w-5 h-5 text-amber-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
  const Card = ({ t }) => (
    <div className="flex-shrink-0 w-[380px] max-w-[90vw] group relative bg-white/95 backdrop-blur rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-mahakaal-purple via-mahakaal-violet to-mahakaal-orange" />
      <div className="flex items-center gap-4 mb-4">
        <img src={t.avatar} alt={t.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow-lg" />
        <div><h3 className="font-semibold text-slate-800">{t.name}</h3><p className="text-sm text-slate-500">{t.location}</p></div>
      </div>
      <div className="flex gap-1 mb-3">{[...Array(t.rating)].map((_, i) => <StarIcon key={i} />)}</div>
      <p className="text-slate-600">{t.text}</p>
    </div>
  )
  return (
    <section ref={ref} className="py-16 md:py-24 overflow-hidden bg-gradient-to-br from-mahakaal-purple via-mahakaal-violet to-mahakaal-purple">
      <h2 className={`text-3xl md:text-4xl font-bold text-white text-center mb-12 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>Trusted by Thousands of Players</h2>
      <div className="overflow-hidden">
        <div className="animate-marquee-rtl flex gap-8 w-max" style={{ width: 'max-content' }}>
          {[...testimonials, ...testimonials].map((t, i) => (
            <Card key={`${t.name}-${t.location}-${i}`} t={t} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const [openIndex, setOpenIndex] = useState(0)
  const [ref, inView] = useInView()
  return (
    <section ref={ref} id="privacy" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className={`max-w-3xl mx-auto transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="h-1 w-full bg-gradient-to-r from-mahakaal-purple via-mahakaal-violet to-mahakaal-orange rounded-full mb-10" />
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-12">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">Frequently asked Question</p>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Play Mahakaal Online&apos;s FAQ!</h2>
          </div>
          <p className="text-sm text-slate-600 max-w-md md:text-right">
            We&apos;ve covered the most frequently asked questions here. However, if you need assistance or have additional queries, feel free to reach out to our dedicated support team.
          </p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`rounded-lg overflow-hidden transition-all ${openIndex === i ? 'bg-slate-100 shadow-sm' : 'bg-white border border-slate-200'}`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
                className="w-full px-6 py-4 text-left flex items-center justify-between font-semibold text-slate-900 hover:bg-slate-50/50 transition-colors"
              >
                {faq.q}
                <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${openIndex === i ? 'bg-mahakaal-purple rotate-180 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </span>
              </button>
              <div className="accordion-content" style={{ maxHeight: openIndex === i ? '500px' : '0' }}>
                <div className="px-6 pb-4 text-slate-700 text-sm leading-relaxed">
                  {faq.content || faq.a}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="relative py-12 px-4 overflow-hidden bg-slate-900">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-mahakaal-purple/90 to-slate-900" />
      <div className="max-w-7xl mx-auto relative flex items-center justify-center">
        <p className="text-slate-300 text-sm">Copyright © 2024 Mahakaal App | All Rights Reserved</p>
      </div>
    </footer>
  )
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <StatsCounter />
      <Games />
      <APKDownloadSection />
      <TelegramJoinSection />
      <WhyChooseUs />
      <HowToPlay />
      <Testimonials />
      <FAQ />
      <Footer />
      <WinNotifications />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/about-us" element={<AboutUs />} />
      <Route path="/contact-us" element={<ContactUs />} />
    </Routes>
  )
}
