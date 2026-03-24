import { Zap } from 'lucide-react';

export const AxiomCard = () => (
  <div className="bg-gray-900/40 border border-gray-800 p-8 rounded-2xl hover:border-blue-500 hover:bg-gray-900 transition duration-300 flex flex-col items-center text-center group">
    <div className="h-32 flex items-center justify-center mb-6">
      <img src="/images/Laplace_Axiom.png" alt="Axiom Engine" className="max-h-full object-contain group-hover:scale-110 transition-transform duration-500 invert brightness-90" />
    </div>
    <h3 className="text-2xl font-bold mb-3 flex items-center gap-2 text-white">
      <Zap className="text-blue-400 w-6 h-6" /> Axiom
    </h3>
    <p className="text-blue-400 font-semibold mb-3">Heisenbug Hunter</p>
    <p className="text-gray-400 text-sm leading-relaxed">
      14ns의 초저지연 DI 해결 속도. DPOR 알고리즘 기반의 수학적 검증으로 우연에 기대지 않는 완벽한 결정론적 스케줄링을 보장합니다.
    </p>
  </div>
);