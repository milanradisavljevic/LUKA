import type { InhaltsModul } from '@lehrunterlagen/schema';
import { deutschInhaltsModule } from './deutsch';
import { englischInhaltsModule } from './englisch';
import { ethikInhaltsModule } from './ethik';
import { franzoesischInhaltsModule } from './franzoesisch';
import { geographieInhaltsModule } from './geographie';
import { geschichteInhaltsModule } from './geschichte';
import { italienischInhaltsModule } from './italienisch';
import { lateinInhaltsModule } from './latein';
import { philosophieInhaltsModule } from './philosophie';
import { psychologieInhaltsModule } from './psychologie';
import { religionInhaltsModule } from './religion';
import { spanischInhaltsModule } from './spanisch';
import { deutschDeInhaltsModule } from './de/deutsch';
import { englischDeInhaltsModule } from './de/englisch';
import { ethikDeInhaltsModule } from './de/ethik';
import { franzoesischDeInhaltsModule } from './de/franzoesisch';
import { geographieDeInhaltsModule } from './de/geographie';
import { geschichteDeInhaltsModule } from './de/geschichte';
import { italienischDeInhaltsModule } from './de/italienisch';
import { lateinDeInhaltsModule } from './de/latein';
import { philosophieDeInhaltsModule } from './de/philosophie';
import { psychologieDeInhaltsModule } from './de/psychologie';
import { religionDeInhaltsModule } from './de/religion';
import { spanischDeInhaltsModule } from './de/spanisch';

const MODULE: InhaltsModul[] = [
  ...deutschInhaltsModule,
  ...englischInhaltsModule,
  ...ethikInhaltsModule,
  ...franzoesischInhaltsModule,
  ...geographieInhaltsModule,
  ...geschichteInhaltsModule,
  ...italienischInhaltsModule,
  ...lateinInhaltsModule,
  ...philosophieInhaltsModule,
  ...psychologieInhaltsModule,
  ...religionInhaltsModule,
  ...spanischInhaltsModule,
  ...deutschDeInhaltsModule,
  ...englischDeInhaltsModule,
  ...ethikDeInhaltsModule,
  ...franzoesischDeInhaltsModule,
  ...geographieDeInhaltsModule,
  ...geschichteDeInhaltsModule,
  ...italienischDeInhaltsModule,
  ...lateinDeInhaltsModule,
  ...philosophieDeInhaltsModule,
  ...psychologieDeInhaltsModule,
  ...religionDeInhaltsModule,
  ...spanischDeInhaltsModule,
];

export function listInhaltsModule(
  fach: InhaltsModul['fach'],
  stufe: InhaltsModul['stufe'],
  rahmenwerk?: InhaltsModul['rahmenwerk'],
  schulstufe?: number,
): InhaltsModul[] {
  return MODULE.filter(
    (m) =>
      m.fach === fach &&
      m.stufe === stufe &&
      (rahmenwerk === undefined || m.rahmenwerk === rahmenwerk) &&
      (schulstufe === undefined
        ? true
        : m.schulstufe === schulstufe || (m.schulstufe === undefined && m.stufe === stufe)),
  );
}

export function getInhaltsModul(id: string): InhaltsModul | undefined {
  return MODULE.find((m) => m.id === id);
}

export function getAllInhaltsModule(): InhaltsModul[] {
  return [...MODULE];
}
