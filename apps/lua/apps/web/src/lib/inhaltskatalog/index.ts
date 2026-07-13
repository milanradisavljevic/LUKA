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
import { geschichteDeInhaltsModule } from './de/geschichte';

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
  ...geschichteDeInhaltsModule,
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
