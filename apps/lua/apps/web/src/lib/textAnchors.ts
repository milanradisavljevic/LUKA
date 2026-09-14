/** Mehrdeutige Zitate werden niemals scheinpräzise an die erste Stelle gesetzt. */
export function uniqueTextAnchor(text: string, quote: string): number | null {
 if(!quote) return null;
 const index=text.indexOf(quote);
 return index < 0 || text.indexOf(quote,index+1) >= 0 ? null : index;
}
