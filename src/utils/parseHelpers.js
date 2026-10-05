export const parseHarassmentReport = (description) => {
  if (!description) return { name: 'N/A', contact: 'N/A', accusedType: 'N/A', accusedName: 'N/A', statement: 'N/A' };
  const nameMatch = description.match(/Complainant Name:\s*(.+)/);
  const contactMatch = description.match(/Contact Number:\s*(.+)/);
  const accusedTypeMatch = description.match(/Accused Profile:\s*(.+)/);
  const accusedNameMatch = description.match(/Accused Name\/Identities:\s*(.+)/);
  const statementMatch = description.match(/Detailed Statement:\s*([\s\S]+)/);
  return {
    name: nameMatch ? nameMatch[1].trim() : 'N/A',
    contact: contactMatch ? contactMatch[1].trim() : 'N/A',
    accusedType: accusedTypeMatch ? accusedTypeMatch[1].trim() : 'N/A',
    accusedName: accusedNameMatch ? accusedNameMatch[1].trim() : 'N/A',
    statement: statementMatch ? statementMatch[1].trim() : description,
  };
};

export const parseCoordinates = (input) => {
  if (!input || !input.trim()) return null;
  const cleaned = input.replace(/[NSEW°'"]/gi, '').replace(/\s+/g, ' ').trim();
  const match = cleaned.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
  if (!match) return null;
  const lat = parseFloat(match[1]); const lng = parseFloat(match[2]);
  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
};