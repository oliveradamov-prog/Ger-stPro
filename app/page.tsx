export default function HomePage() {
  return (
    <div className="text-center py-20">
      <h1 className="text-5xl font-extrabold mb-6 tracking-tight">
        Professional Construction <span className="text-orange-600">Daily Logs</span>
      </h1>
      <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
        Efficiently document work, crew, and weather. Generate PDF reports in seconds.
      </p>
      <div className="flex justify-center gap-4">
        <a href="/projects" className="bg-orange-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-orange-700">
          Get Started
        </a>
        <a href="/login" className="bg-white text-gray-900 px-8 py-3 rounded-lg font-bold border border-gray-200 hover:bg-gray-50">
          Sign In
        </a>
      </div>
    </div>
  );
}