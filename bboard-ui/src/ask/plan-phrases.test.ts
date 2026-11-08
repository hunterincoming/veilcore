// "Do it for me": every phrasing the users' review ran through the planner (scratchpad probe, 8 Nov
// 2026), and the five-language forms of each it found refused: a sire after a comma, a NAAB
// code, a lot, Japanese polite past, "do my reports" in each language, "no tag yet", yesterday,
// twins, dogs and bitches. Each line is the plan the planner makes, or why it refuses and what it
// offers instead. A change to any line is a change to what breeders can say.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { planJob, provenanceHolds, type PlanResult } from './plan';
import { ANIMAL_PROFILE } from '../veilcore/animal-profile';
import type { StrainRecord } from '../veilcore/records';

const ID = (n: number) => `VEIL-${n.toString(16).toUpperCase().padStart(32, '0')}`;
const plant = (n: number, name: string): StrainRecord =>
  ({ id: ID(n), strainName: name, bredBy: 'X', taxon: 'Cannabis sativa', licenseIds: [] }) as unknown as StrainRecord;
const animal = (n: number, name: string, sex: string, taxon = 'Bos taurus'): StrainRecord =>
  ({
    ...plant(n, name),
    taxon,
    profile: ANIMAL_PROFILE,
    animal: { breed: '', idScheme: '', sex, herd: '' },
  }) as unknown as StrainRecord;
const records = [
  plant(1, 'Blue Dream'),
  plant(2, 'Gelato'),
  plant(3, 'Gelato #33'),
  animal(4, 'Bella', 'female', 'Canis familiaris'),
  animal(5, 'Daisy', 'female'),
  animal(6, 'Bull 44', 'male'),
  animal(7, 'Cow #9', 'female'),
  animal(8, 'Rex', 'male', 'Canis familiaris'),
];

/** A plan or a refusal, in one line. */
const summary = (r: PlanResult): string => {
  if (r.type === 'plan') {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r.plan))
      if (k !== 'job')
        o[k] =
          v && typeof v === 'object' && 'v' in v
            ? (v as { v: unknown }).v
            : v && typeof v === 'object' && 'code' in v
              ? (v as { code: { v: unknown } }).code.v
              : v;
    return `PLAN ${r.plan.job} ${JSON.stringify(o).replace(/VEIL-0+/g, '#')}`;
  }
  return `REFUSE ${r.why} words=${JSON.stringify(r.words ?? [])} sug=${JSON.stringify(r.suggest ?? [])}`;
};

// prettier-ignore
const PHRASES: [string, string][] = [
  ["Bella had 6 pups: 4 dogs, 2 bitches", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"males\":4,\"females\":2,\"date\":\"today\"}"],
  ["Bella whelped 6 pups, 4 dogs 2 bitches", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"males\":4,\"females\":2,\"date\":\"today\"}"],
  ["Bella whelped 6", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"date\":\"today\"}"],
  ["Bella whelped six pups", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"date\":\"today\"}"],
  ["Daisy calved a bull calf", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"dam\":\"#5\",\"males\":1,\"date\":\"today\"}"],
  ["Daisy had a bull calf tag 1234", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"dam\":\"#5\",\"males\":1,\"individualId\":\"1234\",\"idScheme\":\"Ear tag\",\"date\":\"today\"}"],
  ["heifer calf out of Daisy by Bull 44", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"sire\":\"#6\",\"dam\":\"#5\",\"females\":1,\"date\":\"today\"}"],
  ["Daisy calved, no tag yet", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"dam\":\"#5\",\"idScheme\":\"Ear tag\",\"idsLater\":true,\"date\":\"today\"}"],
  ["Daisy calved today, tag to follow", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"dam\":\"#5\",\"idScheme\":\"Ear tag\",\"idsLater\":true,\"date\":\"today\"}"],
  ["Daisy calved today sire Bull 44", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"sire\":\"#6\",\"dam\":\"#5\",\"date\":\"today\"}"],
  ["Daisy calved today by AI sire 7HO1234", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"dam\":\"#5\",\"typedSire\":\"7HO1234\",\"date\":\"today\"}"],
  ["Daisy calved today, sire 7HO1234", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"dam\":\"#5\",\"typedSire\":\"7HO1234\",\"date\":\"today\"}"],
  ["Daisy calved by Bull 44, tag 1234", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"sire\":\"#6\",\"dam\":\"#5\",\"individualId\":\"1234\",\"idScheme\":\"Ear tag\",\"date\":\"today\"}"],
  ["Bella whelped 6 pups by Rex", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"sire\":\"#8\",\"dam\":\"#4\",\"date\":\"today\"}"],
  ["Bella whelped 6 pups sired by Rex", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"sire\":\"#8\",\"dam\":\"#4\",\"date\":\"today\"}"],
  ["Bella whelped 6 pups, microchips to follow", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"idScheme\":\"Microchip\",\"idsLater\":true,\"date\":\"today\"}"],
  ["Luna whelped 6 pups", "REFUSE notFound words=[\"Luna\"] sug=[]"],
  ["Bellaが子犬を6匹産みました。オス4匹、メス2匹", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"males\":4,\"females\":2,\"date\":\"today\"}"],
  ["Bellaが子犬6匹を出産しました", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"date\":\"today\"}"],
  ["今日Bellaが子犬を6匹産んだ", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"date\":\"today\"}"],
  ["Gelatoから挿し木を20本取った", "PLAN batch {\"preset\":\"clones\",\"count\":20,\"parent\":\"#2\",\"date\":\"today\"}"],
  ["Gelatoのクローンを20本、ロットB", "PLAN batch {\"preset\":\"clones\",\"count\":20,\"parent\":\"#2\",\"lotName\":\"B\",\"date\":\"today\"}"],
  ["報告書を出して", "PLAN due {}"],
  ["ロイヤリティ報告を全部送って", "PLAN due {}"],
  ["何が期限？", "PLAN due {}"],
  ["期限があるものを見せて", "PLAN due {}"],
  ["Mach meine Berichte", "PLAN due {}"],
  ["Schick meine Abrechnungen", "PLAN due {}"],
  ["Schneide 20 Stecklinge von Gelato, Charge B", "PLAN batch {\"preset\":\"clones\",\"count\":20,\"parent\":\"#2\",\"lotName\":\"B\",\"date\":\"today\"}"],
  ["haz mis informes", "PLAN due {}"],
  ["envía mis informes de regalías", "PLAN due {}"],
  ["fais mes rapports", "PLAN due {}"],
  ["envoie mes déclarations de redevances", "PLAN due {}"],
  ["Bella parió 6 cachorros, 4 machos y 2 hembras", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"males\":4,\"females\":2,\"date\":\"today\"}"],
  ["Bella a mis bas 6 chiots, 4 mâles et 2 femelles", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"males\":4,\"females\":2,\"date\":\"today\"}"],
  ["coupe 20 boutures de Gelato", "PLAN batch {\"preset\":\"clones\",\"count\":20,\"parent\":\"#2\",\"date\":\"today\"}"],
  ["Füge meine 40 Mutterpflanzen hinzu", "PLAN import {\"kind\":\"plant\",\"expect\":40}"],
  ["importa mi rebaño", "PLAN import {\"kind\":\"animal\"}"],
  ["Bereite Blue Dream zur Lizenzierung vor", "PLAN ready {\"record\":\"#1\"}"],
  ["prépare Blue Dream pour la licence", "PLAN ready {\"record\":\"#1\"}"],
  ["prepara Blue Dream para licenciar", "PLAN ready {\"record\":\"#1\"}"],
  ["cut 20 clones of Gelato, first tag 1A4-0099", "PLAN batch {\"preset\":\"clones\",\"count\":20,\"parent\":\"#2\",\"firstTag\":\"1A4-0099\",\"date\":\"today\"}"],
  ["cut 20 clones off Gelato starting at tag 1A4-0099", "PLAN batch {\"preset\":\"clones\",\"count\":20,\"parent\":\"#2\",\"firstTag\":\"1A4-0099\",\"date\":\"today\"}"],
  ["cut 20 Gelato clones", "PLAN batch {\"preset\":\"clones\",\"count\":20,\"parent\":\"#2\",\"date\":\"today\"}"],
  ["cut 20 clones off Gelato for Joe", "REFUSE notFound words=[\"Joe\"] sug=[]"],
  ["we cut 20 clones off Gelato this morning", "PLAN batch {\"preset\":\"clones\",\"count\":20,\"parent\":\"#2\",\"date\":\"today\"}"],
  ["Bella whelped 6 pups, 4 male 2 female", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"males\":4,\"females\":2,\"date\":\"today\"}"],
  ["Bella whelped 6 pups, 4 male 2 female, chips to follow", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"males\":4,\"females\":2,\"idScheme\":\"Microchip\",\"idsLater\":true,\"date\":\"today\"}"],
  ["Bella whelped 6 pups last night", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"date\":\"yesterday\"}"],
  ["Bella whelped 6 pups yesterday", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"date\":\"yesterday\"}"],
  ["6 pups out of Bella by Rex", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"sire\":\"#8\",\"dam\":\"#4\",\"date\":\"today\"}"],
  ["Bella x Rex 6 pups", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"sire\":\"#8\",\"dam\":\"#4\",\"date\":\"today\"}"],
  ["Daisy calved today tag 1234 sire Bull 44 NAAB 7HO1234", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"sire\":\"#6\",\"dam\":\"#5\",\"typedSire\":\"7HO1234\",\"individualId\":\"1234\",\"idScheme\":\"Ear tag\",\"date\":\"today\"}"],
  ["Daisy calved today tag 1234 sire Bull 44", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"sire\":\"#6\",\"dam\":\"#5\",\"individualId\":\"1234\",\"idScheme\":\"Ear tag\",\"date\":\"today\"}"],
  ["Daisy calved today, tag 1234, sire Bull 44", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"sire\":\"#6\",\"dam\":\"#5\",\"individualId\":\"1234\",\"idScheme\":\"Ear tag\",\"date\":\"today\"}"],
  ["Daisy calved today, bull calf, tag 1234, by Bull 44", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"sire\":\"#6\",\"dam\":\"#5\",\"males\":1,\"individualId\":\"1234\",\"idScheme\":\"Ear tag\",\"date\":\"today\"}"],
  ["Daisy calved, bull calf by AI bull 7HO1234", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"dam\":\"#5\",\"typedSire\":\"7HO1234\",\"males\":1,\"date\":\"today\"}"],
  ["Daisy calved today tag 1234 by Bull 44", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"sire\":\"#6\",\"dam\":\"#5\",\"individualId\":\"1234\",\"idScheme\":\"Ear tag\",\"date\":\"today\"}"],
  ["3 calves by AI bull 7HO12345 out of Cow #9", "PLAN batch {\"preset\":\"offspring\",\"count\":3,\"dam\":\"#7\",\"typedSire\":\"7HO12345\",\"date\":\"today\"}"],
  ["Daisy calved today, bull calf, tag 1234", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"dam\":\"#5\",\"males\":1,\"individualId\":\"1234\",\"idScheme\":\"Ear tag\",\"date\":\"today\"}"],
  ["Daisy calved twins", "PLAN batch {\"preset\":\"offspring\",\"count\":2,\"dam\":\"#5\",\"date\":\"today\"}"],
  ["cut 20 clones of Gelato lot B", "PLAN batch {\"preset\":\"clones\",\"count\":20,\"parent\":\"#2\",\"lotName\":\"B\",\"date\":\"today\"}"],
  ["cut 20 clones of Gelato, lot B", "PLAN batch {\"preset\":\"clones\",\"count\":20,\"parent\":\"#2\",\"lotName\":\"B\",\"date\":\"today\"}"],
  ["cut 20 clones of Gelato", "PLAN batch {\"preset\":\"clones\",\"count\":20,\"parent\":\"#2\",\"date\":\"today\"}"],
  ["took 20 cuts off Gelato today", "PLAN batch {\"preset\":\"clones\",\"count\":20,\"parent\":\"#2\",\"date\":\"today\"}"],
  ["cut twenty clones off Gelato", "PLAN batch {\"preset\":\"clones\",\"count\":20,\"parent\":\"#2\",\"date\":\"today\"}"],
  ["clone Gelato x20", "PLAN batch {\"preset\":\"clones\",\"count\":20,\"parent\":\"#2\",\"date\":\"today\"}"],
  ["do my reports", "PLAN due {}"],
  ["send my reports", "PLAN due {}"],
  ["what's due", "PLAN due {}"],
  ["reports due", "PLAN due {}"],
  ["do my royalty reports for Q3", "REFUSE leftover words=[\"Q3\"] sug=[{\"text\":\"do my royalty reports\"}]"],
  ["send Q3 report", "REFUSE leftover words=[\"Q3\"] sug=[{\"text\":\"send report\"}]"],
  ["add my 40 mothers", "PLAN import {\"kind\":\"plant\",\"expect\":40}"],
  ["import my herd", "PLAN import {\"kind\":\"animal\"}"],
  ["add my 40 mothers from a csv", "PLAN import {\"kind\":\"plant\",\"expect\":40}"],
  ["get Blue Dream ready to license", "PLAN ready {\"record\":\"#1\"}"],
  ["get Blue Dream ready to licence", "PLAN ready {\"record\":\"#1\"}"],
  ["get Blue Dream ready", "PLAN ready {\"record\":\"#1\"}"],
  ["make Blue Dream licensable", "PLAN ready {\"record\":\"#1\"}"],
  ["Bellaの子犬6頭、オス4メス2", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"males\":4,\"females\":2,\"date\":\"today\"}"],
  ["Bellaの子犬6匹、オス4メス2、チップは後で", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"males\":4,\"females\":2,\"idScheme\":\"Microchip\",\"idsLater\":true,\"date\":\"today\"}"],
  ["報告書を送って", "PLAN due {}"],
  ["Blue Dreamをライセンスできるように準備して", "PLAN ready {\"record\":\"#1\"}"],
  ["Bella hat 6 Welpen geworfen, 4 Rüden 2 Hündinnen", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"males\":4,\"females\":2,\"date\":\"today\"}"],
  ["Mach Blue Dream lizenzbereit", "PLAN ready {\"record\":\"#1\"}"],
  ["Bella tuvo 6 cachorros, 4 machos y 2 hembras", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"males\":4,\"females\":2,\"date\":\"today\"}"],
  ["Bella ha parido 6 cachorros", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"date\":\"today\"}"],
  ["Bella a eu 6 chiots, 4 mâles et 2 femelles", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"males\":4,\"females\":2,\"date\":\"today\"}"],
  ["cut 12 clones from Blue Dream and license them to Joe for 2 years at 10%", "REFUSE partB words=[] sug=[{\"text\":\"cut 12 clones from Blue Dream\"},{\"ready\":\"Blue Dream\"}]"],
  ["Bella whelped 6 pups, tag 985112000000001", "REFUSE count words=[\"985112000000001\"] sug=[{\"text\":\"Bella whelped 6 pups\"}]"],
  ["Daisy hat heute gekalbt, Ohrmarke 1234, Vater Bull 44", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"sire\":\"#6\",\"dam\":\"#5\",\"individualId\":\"1234\",\"idScheme\":\"Ear tag\",\"date\":\"today\"}"],
  ["Daisy parió hoy, crotal 1234, padre Bull 44", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"sire\":\"#6\",\"dam\":\"#5\",\"individualId\":\"1234\",\"idScheme\":\"Ear tag\",\"date\":\"today\"}"],
  ["Daisy a vêlé aujourd'hui, boucle 1234, père Bull 44", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"sire\":\"#6\",\"dam\":\"#5\",\"individualId\":\"1234\",\"idScheme\":\"Ear tag\",\"date\":\"today\"}"],
  ["Daisyが今日出産、耳標1234、父Bull 44", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"sire\":\"#6\",\"dam\":\"#5\",\"individualId\":\"1234\",\"idScheme\":\"Ear tag\",\"date\":\"today\"}"],
  ["Daisy hat gekalbt, KI Stier 7HO1234", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"dam\":\"#5\",\"typedSire\":\"7HO1234\",\"date\":\"today\"}"],
  ["Daisy parió, IA toro 7HO1234", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"dam\":\"#5\",\"typedSire\":\"7HO1234\",\"date\":\"today\"}"],
  ["Daisy a vêlé, IA taureau 7HO1234", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"dam\":\"#5\",\"typedSire\":\"7HO1234\",\"date\":\"today\"}"],
  ["Daisyが出産、人工授精 種牛 7HO1234", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"dam\":\"#5\",\"typedSire\":\"7HO1234\",\"date\":\"today\"}"],
  ["Daisy hat gekalbt, noch keine Ohrmarke", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"dam\":\"#5\",\"idScheme\":\"Ear tag\",\"idsLater\":true,\"date\":\"today\"}"],
  ["Daisy parió, sin crotal todavía", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"dam\":\"#5\",\"idScheme\":\"Ear tag\",\"idsLater\":true,\"date\":\"today\"}"],
  ["Daisy a vêlé, pas encore de boucle", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"dam\":\"#5\",\"idScheme\":\"Ear tag\",\"idsLater\":true,\"date\":\"today\"}"],
  ["Daisy calved, no chip yet", "PLAN batch {\"preset\":\"offspring\",\"count\":1,\"dam\":\"#5\",\"idScheme\":\"Microchip\",\"idsLater\":true,\"date\":\"today\"}"],
  ["Bella hatte gestern 6 Welpen", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"date\":\"yesterday\"}"],
  ["Bella parió ayer 6 cachorros", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"date\":\"yesterday\"}"],
  ["Bella a eu 6 chiots hier", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"date\":\"yesterday\"}"],
  ["Bellaが昨日子犬を6匹産んだ", "PLAN batch {\"preset\":\"offspring\",\"count\":6,\"dam\":\"#4\",\"date\":\"yesterday\"}"],
  ["Daisy hat Zwillinge gekalbt", "PLAN batch {\"preset\":\"offspring\",\"count\":2,\"dam\":\"#5\",\"date\":\"today\"}"],
  ["Daisy parió gemelos", "PLAN batch {\"preset\":\"offspring\",\"count\":2,\"dam\":\"#5\",\"date\":\"today\"}"],
  ["Daisy a vêlé des jumeaux", "PLAN batch {\"preset\":\"offspring\",\"count\":2,\"dam\":\"#5\",\"date\":\"today\"}"],
  ["Daisyが双子を出産", "PLAN batch {\"preset\":\"offspring\",\"count\":2,\"dam\":\"#5\",\"date\":\"today\"}"],
  ["Schneide 20 Stecklinge von Gelato, Charge B", "PLAN batch {\"preset\":\"clones\",\"count\":20,\"parent\":\"#2\",\"lotName\":\"B\",\"date\":\"today\"}"],
  ["corta 20 esquejes de Gelato, lote B", "PLAN batch {\"preset\":\"clones\",\"count\":20,\"parent\":\"#2\",\"lotName\":\"B\",\"date\":\"today\"}"],
  ["coupe 20 boutures de Gelato, lot B", "PLAN batch {\"preset\":\"clones\",\"count\":20,\"parent\":\"#2\",\"lotName\":\"B\",\"date\":\"today\"}"],
  ["Gelatoから挿し木を20本取りました", "PLAN batch {\"preset\":\"clones\",\"count\":20,\"parent\":\"#2\",\"date\":\"today\"}"],
  ["Mache meine Berichte", "PLAN due {}"],
  ["haz mis informes de regalías", "PLAN due {}"],
  ["fais mes déclarations de redevances", "PLAN due {}"],
  ["期限のある報告を見せて", "PLAN due {}"],
];

describe('the users’ review phrasings, and their five-language forms', () => {
  for (const [text, want] of PHRASES)
    it(text, () => {
      const r = planJob(text, { records, animals: true });
      expect(summary(r)).toBe(want);
      if (r.type === 'plan') expect(provenanceHolds(r.plan, r.text, records)).toBe(true);
      // A suggestion is only ever something that plans, made from the words typed.
      if (r.type === 'refuse')
        for (const s of r.suggest ?? [])
          if ('text' in s) expect(planJob(s.text, { records, animals: true }).type, s.text).toBe('plan');
    });
});
