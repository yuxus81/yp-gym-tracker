import { db, getMeta, setMeta } from '@/db/dexie';
import { patchMany } from '@/db/repo';

/**
 * Früher legte die App eine Start-Bibliothek mit 56 Übungen an. Seit dem Umbau
 * (16.09.2026) schreibt man alle Übungen selbst. Diese Liste dient nur noch dazu, die alten
 * Vorgaben einmalig zu entfernen – Übungen, die in einem Plan oder Training stecken, bleiben.
 */
const LEGACY_NAMES: string[] = [
  'Bankdrücken (Langhantel)',
  'Schrägbankdrücken (Kurzhantel)',
  'Brustpresse (Maschine)',
  'Butterfly (Maschine)',
  'Kabelzug-Crossover',
  'Dips',
  'Liegestütze',
  'Klimmzüge',
  'Latzug (breit)',
  'Rudern (Langhantel)',
  'Rudern am Kabel (eng)',
  'Einarmiges Kurzhantelrudern',
  'T-Bar-Rudern',
  'Kreuzheben',
  'Rückenstrecker',
  'Shrugs (Kurzhantel)',
  'Schulterdrücken (Kurzhantel)',
  'Military Press (Langhantel)',
  'Schulterpresse (Maschine)',
  'Seitheben (Kurzhantel)',
  'Seitheben am Kabel',
  'Frontheben',
  'Reverse Butterfly',
  'Face Pulls',
  'Aufrechtes Rudern',
  'Bizepscurls (Langhantel)',
  'Bizepscurls (Kurzhantel)',
  'Hammercurls',
  'Scottcurls',
  'Kabelcurls',
  'Konzentrationscurls',
  'Trizepsdrücken am Kabel',
  'Überkopf-Trizepsstrecken (Kabel)',
  'French Press (SZ-Stange)',
  'Enges Bankdrücken',
  'Kickbacks',
  'Unterarmcurls',
  'Kniebeugen (Langhantel)',
  'Beinpresse',
  'Hackenschmidt-Kniebeuge',
  'Bulgarian Split Squats',
  'Ausfallschritte',
  'Beinstrecker',
  'Rumänisches Kreuzheben',
  'Beinbeuger liegend',
  'Beinbeuger sitzend',
  'Hip Thrust',
  'Adduktorenmaschine',
  'Abduktorenmaschine',
  'Wadenheben stehend',
  'Wadenheben sitzend',
  'Crunches am Kabel',
  'Hängendes Beinheben',
  'Plank',
  'Russian Twists',
  'Ab-Roller'
];

const NAMESPACE = '6f1d3b3e-7a1f-4c55-9d3a-2b8e0c9f4a11';

/** UUIDv5 — gleicher Name ergab auf jedem Gerät dieselbe ID. */
export async function uuidV5(name: string, namespace = NAMESPACE): Promise<string> {
  const ns = namespace.replace(/-/g, '').match(/.{2}/g)!.map((h) => parseInt(h, 16));
  const bytes = new Uint8Array([...ns, ...new TextEncoder().encode(name)]);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', bytes)).slice(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = [...hash].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function legacySeedIds(): Promise<string[]> {
  return Promise.all(LEGACY_NAMES.map((n) => uuidV5(`exercise:${n}`)));
}

/** Einmalig nach dem ersten erfolgreichen Abgleich: unbenutzte Vorgaben löschen (Grabstein). */
export async function removeLegacySeed(): Promise<void> {
  if (await getMeta<boolean>('legacySeedRemoved')) return;
  const ids = new Set(await legacySeedIds());
  const used = new Set<string>();
  for (const l of await db.plan_day_exercises.toArray()) if (!l.deleted_at) used.add(l.exercise_id);
  for (const s of await db.session_sets.toArray()) if (!s.deleted_at) used.add(s.exercise_id);
  for (const s of await db.sessions.toArray()) if (!s.deleted_at) for (const id of s.exercise_ids) used.add(id);
  const doomed = (await db.exercises.bulkGet([...ids])).filter(
    (e): e is NonNullable<typeof e> => !!e && !e.deleted_at && !used.has(e.id),
  );
  const at = new Date().toISOString();
  if (doomed.length) await patchMany('exercises', doomed.map((e) => ({ id: e.id, changes: { deleted_at: at } })));
  await setMeta('legacySeedRemoved', true);
}
