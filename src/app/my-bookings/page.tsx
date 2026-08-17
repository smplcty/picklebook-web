"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, apiFetch } from "@/lib/api";

type Booking = { id: string; bookingNumber: string; startTime: string; endTime: string; bookingStatus: string; total: string; court: { name: string }; location: { name: string } };

export default function MyBookingsPage() {
  const { data, error, isLoading } = useQuery({ queryKey: ["my-bookings"], queryFn: () => api<Booking[]>("/bookings/me") });
  const [qr, setQr] = useState<string>();
  const [downloadError, setDownloadError] = useState("");

  async function share(booking: Booking) {
    const text = `${booking.bookingNumber} · ${booking.location.name} · ${new Date(booking.startTime).toLocaleString()}`;
    if (navigator.share) await navigator.share({ title: "My Pickleball Booking", text }); else await navigator.clipboard.writeText(text);
  }

  async function download(booking: Booking) {
    setDownloadError("");
    try {
      const response = await apiFetch(`/bookings/${booking.id}/confirmation.pdf`, { headers: { Accept: "application/pdf" } });
      if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.message ?? "Unable to generate confirmation."); }
      if (!response.headers.get("content-type")?.includes("application/pdf")) throw new Error("The server returned an invalid confirmation file.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `${booking.bookingNumber}-confirmation.pdf`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (reason) { setDownloadError(reason instanceof Error ? reason.message : "Unable to download confirmation."); }
  }

  return <main className="mx-auto max-w-3xl p-6"><h1 className="text-3xl font-bold">My bookings</h1>{isLoading && <p className="mt-6">Loading bookings…</p>}{error && <p className="mt-6">Log in to see your bookings.</p>}{downloadError && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{downloadError}</p>}<div className="mt-6 grid gap-4">{data?.map(booking => <article key={booking.id} className="rounded-xl border bg-white p-5"><p className="font-semibold">{booking.location.name} · {booking.court.name}</p><p className="mt-2 text-sm text-slate-600">{new Date(booking.startTime).toLocaleString()} – {new Date(booking.endTime).toLocaleTimeString()}</p><p className="mt-3 text-sm">#{booking.bookingNumber} · ₱{booking.total}</p><div className="mt-4 flex flex-wrap gap-3"><button className="text-sm underline" onClick={() => share(booking)}>Share</button><button className="text-sm underline" onClick={() => download(booking)}>Download confirmation</button><button className="text-sm underline" onClick={async () => setQr((await api<{ imageDataUrl: string }>(`/bookings/${booking.id}/qr`)).imageDataUrl)}>Show QR</button></div>{qr && <img className="mt-4 h-40 w-40" src={qr} alt="Secure booking check-in QR code" />}</article>)}</div></main>;
}
