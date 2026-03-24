import { Eye } from 'lucide-react';

export const ProbeCard = () => (
  <div className="bg-gray-900/40 border border-gray-800 p-8 rounded-2xl hover:border-green-500 hover:bg-gray-900 transition duration-300 flex flex-col items-center text-center group">
    <div className="h-32 flex items-center justify-center mb-6">
      <img src="/images/Laplace_Probe.png" alt="Probe Engine" className="max-h-full object-contain group-hover:scale-110 transition-transform duration-500 invert brightness-90" />
    </div>
    <h3 className="text-2xl font-bold mb-3 flex items-center gap-2 text-white">
      <Eye className="text-green-400 w-6 h-6" /> Probe
    </h3>
    <p className="text-green-400 font-semibold mb-3">Zero-Overhead Telemetry</p>
    <p className="text-gray-400 text-sm leading-relaxed">
      시스템 오버헤드를 극단적으로 통제한 제로카피 아키텍처. QUIC 통신과 Layer-3 LZ4 압축으로 실시간 메트릭을 무손실로 전파합니다.
    </p>
  </div>
);