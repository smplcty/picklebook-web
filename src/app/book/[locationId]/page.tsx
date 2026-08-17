"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Allocation = { startTime: string; endTime: string; state: "HELD" | "BOOKED" | "BLOCKED" };
type Court = { id: string; name: string; courtNumber: number; hourlyRate: string; allocations: Allocation[] };
type Availability = { date: string; timezone: string; courts: Court[] };
type Venue = { name: string; address: string };
type SlotState = "AVAILABLE" | Allocation["state"];

const slots = Array.from({ length: 15 }, (_, index) => index + 8);
const pad = (value: number) => String(value).padStart(2, "0");
const localDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const timeLabel = (hour: number) => new Date(2026, 0, 1, hour).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export default function BookingPage() {
  const { locationId } = useParams<{ locationId: string }>();
  const router = useRouter();
  const [date, setDate] = useState(localDate(new Date()));
  const [availability, setAvailability] = useState<Availability>();
  const [venue, setVenue] = useState<Venue>();
  const [selected, setSelected] = useState<{ court: Court; hour: number }>();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const dates = useMemo(() => Array.from({ length: 14 }, (_, index) => { const item = new Date(); item.setDate(item.getDate() + index); return item; }), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api<Availability>(`/locations/${locationId}/availability?date=${date}`), api<Venue>(`/locations/${locationId}`)])
      .then(([nextAvailability, nextVenue]) => { if (active) { setAvailability(nextAvailability); setVenue(nextVenue); setSelected(undefined); setMessage(""); } })
      .catch(() => active && setMessage("Unable to load live availability."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [date, locationId]);

  function stateAt(court: Court, hour: number): SlotState {
    const start = new Date(`${date}T${pad(hour)}:00:00+08:00`);
    const end = new Date(start.getTime() + 3_600_000);
    return court.allocations.find(item => new Date(item.startTime) < end && new Date(item.endTime) > start)?.state ?? "AVAILABLE";
  }

  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const startTime = new Date(`${date}T${pad(selected.hour)}:00:00+08:00`);
    const endTime = new Date(startTime.getTime() + Number(form.get("duration")) * 3_600_000);
    try {
      await api("/bookings", { method: "POST", body: JSON.stringify({ courtId: selected.court.id, startTime: startTime.toISOString(), endTime: endTime.toISOString(), customerName: form.get("name"), source: "WEB" }) });
      router.push("/my-bookings");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Booking failed."); }
  }

  const stateStyle: Record<SlotState, string> = { AVAILABLE: "bg-[#e7f9ea] text-[#12652d] hover:bg-[#d4f4da]", BOOKED: "bg-slate-100 text-slate-500", HELD: "bg-amber-50 text-amber-700", BLOCKED: "bg-rose-50 text-rose-700" };

  return <main className={`mx-auto max-w-[1440px] px-4 py-7 sm:px-7 ${selected ? "pb-48 md:pb-44" : ""}`}>
    <section className="rounded-[1.4rem] border border-[#112219]/10 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 border-l-4 border-[#159b8c] bg-[#f0f9f7] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><strong>{venue?.name ?? "Pickleball venue"}</strong><span className="ml-2 text-sm text-[#607166]">· {venue?.address}</span></div>
        <div className="flex gap-2"><button className="rounded-lg bg-[#159b8c] px-4 py-2 text-xs font-bold text-white">▦ Court layout</button><button className="rounded-lg bg-[#159b8c] px-4 py-2 text-xs font-bold text-white">⌖ Directions</button></div>
      </div>

      <div className="mt-7 flex items-center justify-between"><div><p className="mono text-[11px] font-bold text-[#159b8c]">BOOK A COURT</p><h1 className="mt-1 text-2xl font-extrabold">Choose a date and time</h1></div><span className="hidden rounded-full bg-[#e9f7f5] px-4 py-2 text-xs font-bold text-[#157f75] sm:block">Live availability ●</span></div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-3">{dates.map((item, index) => { const value = localDate(item); const active = value === date; return <button key={value} onClick={() => setDate(value)} className={`min-w-[70px] rounded-xl border px-3 py-3 text-center transition ${active ? "border-[#159b8c] bg-[#159b8c] text-white shadow-md" : "border-slate-200 bg-white hover:border-[#159b8c]"}`}><span className="mono block text-[10px] font-bold uppercase">{item.toLocaleDateString("en-US", { weekday: "short" })}</span><strong className="block text-xl leading-6">{item.getDate()}</strong><span className={`text-[9px] font-bold uppercase ${active ? "text-white/80" : "text-slate-400"}`}>{index === 0 ? "Today" : item.toLocaleDateString("en-US", { month: "short" })}</span></button>; })}</div>

      {loading ? <div className="grid h-64 place-items-center text-sm text-slate-500">Loading the court schedule…</div> : <>
        <div className="mt-5 hidden overflow-x-auto rounded-xl border border-slate-200 md:block"><table className="w-full min-w-[900px] border-collapse text-sm"><thead><tr className="bg-slate-50"><th className="sticky left-0 z-10 min-w-32 border-b bg-slate-50 p-4 text-left">Time</th>{availability?.courts.map(court => <th key={court.id} className="min-w-36 border-b p-4 text-center">{court.name}</th>)}</tr></thead><tbody>{slots.map(hour => <tr key={hour}><th className="sticky left-0 z-10 border-b bg-white p-3 text-left font-medium">{timeLabel(hour)} – {timeLabel(hour + 1)}</th>{availability?.courts.map(court => { const state = stateAt(court, hour); return <td key={court.id} className="border-b border-l p-1"><button disabled={state !== "AVAILABLE"} onClick={() => setSelected({ court, hour })} className={`min-h-20 w-full rounded-lg p-2 text-center transition ${stateStyle[state]} ${selected?.court.id === court.id && selected.hour === hour ? "ring-2 ring-[#159b8c] ring-offset-1" : ""}`}><strong className="block">{timeLabel(hour)}</strong><span className="mono mt-1 block text-[10px]">₱{court.hourlyRate}</span><span className="mt-1 inline-block rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-bold">{state}</span></button></td>; })}</tr>)}</tbody></table></div>
        <div className="mt-5 grid gap-4 md:hidden">{availability?.courts.map(court => <article key={court.id} className="rounded-2xl border bg-white p-4"><div className="flex justify-between"><strong>{court.name}</strong><span className="mono text-xs">₱{court.hourlyRate}/hr</span></div><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{slots.map(hour => { const state = stateAt(court, hour); return <button key={hour} disabled={state !== "AVAILABLE"} onClick={() => setSelected({ court, hour })} className={`min-w-24 rounded-xl p-3 text-left ${stateStyle[state]}`}><strong className="block text-xs">{timeLabel(hour)}</strong><span className="mt-1 block text-[9px] font-bold">{state}</span></button>; })}</div></article>)}</div>
      </>}
    </section>

    {selected && <section className="sticky bottom-3 z-20 mt-5 rounded-2xl border border-white/10 bg-[#112219] p-5 text-white shadow-2xl md:fixed md:bottom-6 md:left-1/2 md:mt-0 md:w-[calc(100%-3rem)] md:max-w-[1386px] md:-translate-x-1/2"><form onSubmit={book} className="grid items-end gap-4 md:grid-cols-[1fr_180px_220px_auto]"><div><p className="mono text-[10px] text-[#b8f44c]">SELECTED SLOT</p><h2 className="mt-1 text-xl font-extrabold">{selected.court.name} · {timeLabel(selected.hour)}</h2><p className="text-xs text-white/60">{new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p></div><label className="grid gap-1 text-xs font-bold">Duration<select name="duration" className="rounded-lg bg-white/10 p-3 text-white"><option className="text-black" value="1">1 hour</option><option className="text-black" value="2">2 hours</option></select></label><label className="grid gap-1 text-xs font-bold">Player name<input name="name" required className="rounded-lg bg-white/10 p-3 text-white" placeholder="Your name" /></label><button className="rounded-xl bg-[#b8f44c] px-6 py-3 font-extrabold text-[#112219]">Reserve now →</button></form></section>}
    {message && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}
  </main>;
}
