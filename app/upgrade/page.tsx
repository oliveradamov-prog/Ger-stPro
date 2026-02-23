export default function UpgradePage() {
  return (
    <div className="max-w-3xl mx-auto text-center mt-10">
      <h1 className="text-4xl font-bold mb-6">Upgrade your Daily Log Builder</h1>
      <p className="text-xl text-gray-600 mb-10">Get unlimited projects, advanced PDF reports, and cloud backup.</p>
      <div className="grid md:grid-cols-2 gap-8 text-left">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-2xl font-bold mb-4">Free Plan</h2>
          <p className="text-4xl font-bold mb-6">$0 <span className="text-lg text-gray-500">/mo</span></p>
          <ul className="space-y-3 mb-8">
            <li>✓ Up to 1 Project</li>
            <li>✓ Basic Daily Logs</li>
            <li>✓ Photo Uploads (Limited)</li>
          </ul>
          <button className="w-full bg-gray-100 text-gray-600 py-2 rounded font-semibold cursor-not-allowed">Current Plan</button>
        </div>
        <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-orange-600 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-orange-600 text-white px-4 py-1 text-sm font-bold">POPULAR</div>
          <h2 className="text-2xl font-bold mb-4">Pro Plan</h2>
          <p className="text-4xl font-bold mb-6">$19 <span className="text-lg text-gray-500">/mo</span></p>
          <ul className="space-y-3 mb-8">
            <li>✓ Unlimited Projects</li>
            <li>✓ Advanced PDF Export</li>
            <li>✓ priority Support</li>
            <li>✓ Team Collaboration</li>
          </ul>
          <button className="w-full bg-orange-600 text-white py-2 rounded font-semibold hover:bg-orange-700 transition-colors">Upgrade Now</button>
        </div>
      </div>
    </div>
  );
}