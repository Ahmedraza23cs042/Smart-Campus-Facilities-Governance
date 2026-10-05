// ✅ Image gallery for tickets — pure visual, gets all needed values via props.
// Privacy check: only owner or admin can see images.
import React from 'react';
import { Icons } from '../icons/Icons';
import { getTicketImages } from '../utils';

export default function ImageGallery({
  ticket,
  maxPreview = 4,
  user,
  isStudent,
  setLightboxImage,
  setSelectedTicket,
  openTicketFresh,
}) {
  const images = getTicketImages(ticket);
  if (images.length === 0) return null;

  const isOwner = user?.rollNumber === ticket.roll_number;
  const isAdminView = !isStudent;
  const canView = isOwner || isAdminView;

  if (!canView) {
    return (
      <div className="mt-6 inline-flex items-center gap-2 text-[11px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-3 py-2 rounded-xl">
        <Icons.Lock />
        <span>{images.length} image{images.length > 1 ? 's' : ''} attached — visible to owner & HOD only</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 mt-6">
      {images.slice(0, maxPreview).map((url, idx) => (
        <div key={idx} className="relative group">
          <img
            src={url}
            alt={`Evidence ${idx + 1}`}
            onClick={(e) => { e.stopPropagation(); setLightboxImage(url); }}
            className="w-24 h-24 md:w-28 md:h-28 object-cover rounded-xl border border-gray-200 shadow-sm cursor-zoom-in hover:opacity-80 transition-all"
          />
        </div>
      ))}
      {images.length > maxPreview && (
        <div
          onClick={(e) => { e.stopPropagation(); openTicketFresh(ticket); }}
          className="w-24 h-24 md:w-28 md:h-28 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center text-blue-700 cursor-pointer hover:bg-blue-100"
        >
          <span className="text-lg font-black">+{images.length - maxPreview}</span>
          <span className="text-[9px] font-bold">more</span>
        </div>
      )}
    </div>
  );
}