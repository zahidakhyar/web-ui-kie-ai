import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0f0f0f] py-10">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span>✨</span>
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              AI Image Studio
            </span>
          </div>

          <nav className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <Link href="/" className="hover:text-violet-400 transition-colors">Home</Link>
            <Link href="/gallery" className="hover:text-violet-400 transition-colors">Gallery</Link>
            <Link href="/account" className="hover:text-violet-400 transition-colors">Account</Link>
            <a href="#" className="hover:text-violet-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-violet-400 transition-colors">Terms of Service</a>
          </nav>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} AI Image Studio. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
