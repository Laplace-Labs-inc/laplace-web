import { Terminal } from "lucide-react";

export const ConsolePage = () => (
    <div className="p-10">
    <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
      <Terminal className="text-green-400" /> Console Dashboard
    </h2>
    <p className="text-gray-400">원격 RCU 핫리로딩, 에이전트 모니터링, API 키 관리 화면</p>
  </div>
);