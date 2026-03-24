import { ShieldAlert } from "lucide-react";

export const LoginPage = () => (
    <div className="flex items-center justify-center min-h-[70vh]">
    <div className="p-8 border border-gray-800 bg-gray-900/50 rounded-2xl w-96 text-center">
      <ShieldAlert className="w-12 h-12 text-blue-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold mb-6">Sign in to Laplace</h2>
      <button className="w-full bg-white text-black py-2 rounded-lg font-bold hover:bg-gray-200 transition">
        Continue with GitHub
      </button>
    </div>
  </div>
);