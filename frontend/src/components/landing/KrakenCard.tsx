import { Orbit } from 'lucide-react';

export const KrakenCard = () => (
  <div className="bg-gray-900/40 border border-gray-800 p-8 rounded-2xl hover:border-red-500 hover:bg-gray-900 transition duration-300 flex flex-col items-center text-center group">
    <div className="h-32 flex items-center justify-center mb-6">
      <img src="/images/Laplace_Kraken.png" alt="Kraken Engine" className="max-h-full object-contain group-hover:scale-110 transition-transform duration-500 invert brightness-90" />
    </div>
    <h3 className="text-2xl font-bold mb-3 flex items-center gap-2 text-white">
      <Orbit className="text-red-400 w-6 h-6" /> Kraken
    </h3>
    <p className="text-red-400 font-semibold mb-3">Chaos Orchestrator</p>
    <p className="text-gray-400 text-sm leading-relaxed">
      단일 인스턴스에서 10,000명의 AI 에이전트 부하를 모사하고, 가혹한 네트워크 결함(Latency, Jitter)을 주입하여 내결함성을 입증합니다.
    </p>
  </div>
);