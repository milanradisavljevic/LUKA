import type { InhaltsModul } from '@lehrunterlagen/schema';
import { geschichteInhaltsModule } from './geschichte';
import { geographieInhaltsModule } from './geographie';

const MODULE: InhaltsModul[] = [
  ...geschichteInhaltsModule,
  ...geographieInhaltsModule,
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
