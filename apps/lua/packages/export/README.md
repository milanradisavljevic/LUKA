# @lehrunterlagen/export

Export generated documents to Moodle-compatible formats (GIFT and Moodle XML).

## Supported Block Types

| Block Type | GIFT Format | Moodle XML Type |
|------------|-------------|-----------------|
| `multipleChoice` | Multiple Choice `{ =correct ~wrong }` | `multichoice` |
| `matching` | Matching `{ =left -> right }` | `matching` |
| `lueckentext` | Cloze `{=answer}` | `cloze` |
| `kategorisierung` | Matching (categories as options) | `matching` |
| `fehlerkorrektur` | Short Answer `{=corrected}` | `shortanswer` |
| `umformung` | Short Answer `{=transformed}` | `shortanswer` |
| All others | Essay `{}` | `essay` |

## Usage

```typescript
import { toGift, toMoodleXml } from '@lehrunterlagen/export';
import type { DocumentV1 } from '@lehrunterlagen/schema';

const doc: DocumentV1 = { /* ... */ };

// GIFT format (plain text, importable into Moodle)
const giftString = toGift(doc);

// Moodle XML format
const xmlString = toMoodleXml(doc);
```

## GIFT Format Notes

- Special characters `~ = # { } :` are escaped with backslash
- Newlines in text are converted to spaces
- Open question types (offeneVerstaendnisfrage, offeneSchreibaufgabe, roleplay, etc.) are exported as Essay questions to preserve content without data loss

## Known Limitations

- `wordScramble`, `kreuzwortraetsel`, `wortgitter` cannot be directly represented in GIFT → exported as Essay
- `tabelle` is exported as Essay (complex table structures not supported)
- `vokabeluebung` could theoretically be Matching but is exported as Essay for simplicity
- `rollenkartenSet` and `roleplay` are Sprechprodukt → exported as Essay
