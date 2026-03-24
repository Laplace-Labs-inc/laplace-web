import { AxiomCard } from '../components/landing/AxiomCard';
import { KrakenCard } from '../components/landing/KrakenCard';
import { ProbeCard } from '../components/landing/ProbeCard';

export const LandingPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] text-center px-4">
      {/* Hero Section */}
      <div className="space-y-6 mb-20 mt-10">
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter">
          Eradicate <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Heisenbugs.</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto font-medium">
          The industry's first commercial suite engineered to hunt and destroy elusive concurrency failures.
        </p>
      </div>

      {/* The Trinity: 3 Core Engines */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
        <AxiomCard />
        <KrakenCard />
        <ProbeCard />
      </div>
    </div>
  );
};