import Link from "next/link";
import { HardHat } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <HardHat className="w-6 h-6 text-orange-600" />
          <span>Daily Log Builder</span>
        </Link>
        <div className="flex gap-6">
          <Link href="/projects" className="text-gray-600 hover:text-gray-900">Projects</Link>
          <Link href="/upgrade" className="text-gray-600 hover:text-gray-900">Upgrade</Link>
          <Link href="/login" className="text-gray-600 hover:text-gray-900">Login</Link>
        </div>
      </div>
    </nav>
  );
}