// ✅ Status pipeline visual — pure, only takes `status` prop.
// Imports Icons directly so no prop drilling needed.
import React from 'react';
import { Icons } from '../icons/Icons';

export default function StatusPipeline({ status }) {
  return (
    <div className="flex items-center w-full max-w-sm mt-5 mb-2">
      <div className="flex flex-col items-center gap-1 z-10 relative">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shadow-md ring-4 ring-emerald-50">
          <Icons.Check />
        </div>
        <span className="text-[9px] font-bold text-gray-700 absolute top-7 whitespace-nowrap">Reported</span>
      </div>
      <div className="flex-1 h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full mx-1"></div>
      <div className="flex flex-col items-center gap-1 z-10 relative">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md ring-4 transition-all ${status === 'RESOLVED' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white ring-emerald-50' : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white ring-blue-50 animate-pulse'}`}>
          {status === 'RESOLVED' ? <Icons.Check /> : <Icons.Gear />}
        </div>
        <span className="text-[9px] font-bold text-gray-700 absolute top-7 whitespace-nowrap">
          {status === 'RESOLVED' ? 'Reviewed' : 'Assigned'}
        </span>
      </div>
      <div className={`flex-1 h-1.5 rounded-full mx-1 transition-colors duration-500 ${status === 'RESOLVED' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gray-200'}`}></div>
      <div className="flex flex-col items-center gap-1 z-10 relative">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md ring-4 transition-all duration-500 ${status === 'RESOLVED' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white ring-emerald-50' : 'bg-gray-200 text-gray-400 ring-gray-50'}`}>
          {status === 'RESOLVED' ? <Icons.Check /> : '3'}
        </div>
        <span className={`text-[9px] font-bold absolute top-7 whitespace-nowrap ${status === 'RESOLVED' ? 'text-emerald-700' : 'text-gray-400'}`}>Resolved</span>
      </div>
    </div>
  );
}