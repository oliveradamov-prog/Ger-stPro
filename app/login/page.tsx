export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md mt-10">
      <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" className="w-full p-2 border border-gray-300 rounded" placeholder="email@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input type="password" className="w-full p-2 border border-gray-300 rounded" placeholder="••••••••" />
        </div>
        <button type="button" className="w-full bg-orange-600 text-white py-2 rounded hover:bg-orange-700">
          Sign In
        </button>
      </form>
    </div>
  );
}