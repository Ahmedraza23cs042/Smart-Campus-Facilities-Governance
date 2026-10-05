import React, { useState } from 'react';
import { DEPT_BANNER_IMAGES } from '../constants';

export default function DeptBannerImage({ deptAbbrev }) {
  const [imgOk, setImgOk] = useState(true);
  const imgSrc = deptAbbrev ? DEPT_BANNER_IMAGES[deptAbbrev] : null;
  if (!imgSrc || !imgOk) return null;
  return (
    <img
      src={imgSrc}
      alt={deptAbbrev}
      onError={() => setImgOk(false)}
      style={{ height: '130px', width: '220px', objectFit: 'cover', flexShrink: 0 }}
      className="rounded-2xl shadow-2xl ring-2 ring-white/40 border-2 border-white/20"
    />
  );
}