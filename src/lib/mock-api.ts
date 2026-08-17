type MockCourt = { id: string; name: string; courtNumber: number; hourlyRate: string; status: string };
type MockLocation = { id: string; name: string; slug: string; address: string; phone?: string; email?: string; status: string; courts: MockCourt[] };
type MockBooking = { id: string; bookingNumber: string; customerName: string; customerPhone?: string; startTime: string; endTime: string; bookingStatus: string; paymentStatus: string; total: string; court: MockCourt; location: { id: string; name: string } };

const storageKey = "picklebook-demo-state";
const isoToday = (hour: number) => { const date = new Date(); date.setHours(hour, 0, 0, 0); return date.toISOString(); };

function initialState() {
  const locations: MockLocation[] = [
    { id: "bgc", name: "BGC Courts", slug: "bgc-courts", address: "26th Street, Bonifacio Global City", status: "ACTIVE", courts: [{ id: "bgc-1", name: "Court 1", courtNumber: 1, hourlyRate: "450", status: "ACTIVE" }, { id: "bgc-2", name: "Court 2", courtNumber: 2, hourlyRate: "450", status: "ACTIVE" }, { id: "bgc-3", name: "Court 3", courtNumber: 3, hourlyRate: "500", status: "ACTIVE" }] },
    { id: "makati", name: "Makati Rally Club", slug: "makati-rally-club", address: "Legazpi Village, Makati City", status: "ACTIVE", courts: [{ id: "makati-1", name: "Court A", courtNumber: 1, hourlyRate: "400", status: "ACTIVE" }, { id: "makati-2", name: "Court B", courtNumber: 2, hourlyRate: "400", status: "ACTIVE" }] },
  ];
  const booking = (id: string, number: string, customerName: string, location: MockLocation, court: MockCourt, hour: number, status = "CONFIRMED", payment = "PAID"): MockBooking => ({ id, bookingNumber: number, customerName, startTime: isoToday(hour), endTime: isoToday(hour + 1), bookingStatus: status, paymentStatus: payment, total: court.hourlyRate, court, location: { id: location.id, name: location.name } });
  return { locations, bookings: [booking("booking-1", "PB-2026-001", "Jamie Santos", locations[0], locations[0].courts[0], 10), booking("booking-2", "PB-2026-002", "Alex Cruz", locations[1], locations[1].courts[1], 18, "PENDING", "UNPAID")], users: [{ id: "user-1", firstName: "Jamie", lastName: "Santos", email: "jamie@example.com", role: "CUSTOMER", status: "ACTIVE", createdAt: "2026-08-01T00:00:00.000Z" }, { id: "user-2", firstName: "Morgan", lastName: "Reyes", email: "morgan@picklebook.demo", role: "ADMIN", status: "ACTIVE", createdAt: "2026-07-12T00:00:00.000Z" }] };
}

type State = ReturnType<typeof initialState>;
function state(): State { if (typeof window === "undefined") return initialState(); try { return JSON.parse(localStorage.getItem(storageKey) ?? "") as State; } catch { const value = initialState(); localStorage.setItem(storageKey, JSON.stringify(value)); return value; } }
function save(value: State) { if (typeof window !== "undefined") localStorage.setItem(storageKey, JSON.stringify(value)); }
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } }); }
async function body(init: RequestInit) { try { return JSON.parse(String(init.body ?? "{}")) as Record<string, string>; } catch { return {}; } }
function publicLocation(location: MockLocation) { return { ...location, courts: location.courts }; }

export async function mockApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const data = state(); const method = (init.method ?? "GET").toUpperCase(); const input = await body(init);
  const findCourt = (id: string) => data.locations.flatMap(location => location.courts.map(court => ({ location, court }))).find(item => item.court.id === id);
  if (path === "/auth/login") return json({ accessToken: "demo-access-token", user: { role: String(input.email).includes("admin") ? "ADMIN" : "CUSTOMER" } });
  if (path === "/auth/register") return json({ accessToken: "demo-access-token" });
  if (path === "/locations" && method === "GET") return json(data.locations.map(publicLocation));
  const venueMatch = path.match(/^\/locations\/([^/?]+)$/);
  if (venueMatch && method === "GET") { const location = data.locations.find(item => item.id === venueMatch[1]); return location ? json(publicLocation(location)) : json({ message: "Venue not found" }, 404); }
  const availabilityMatch = path.match(/^\/locations\/([^/]+)\/availability/);
  if (availabilityMatch) { const location = data.locations.find(item => item.id === availabilityMatch[1]); if (!location) return json({ message: "Venue not found" }, 404); const date = new URLSearchParams(path.split("?")[1] ?? "").get("date") ?? new Date().toISOString().slice(0, 10); return json({ date, timezone: "Asia/Manila", courts: location.courts.map(court => ({ ...court, allocations: data.bookings.filter(booking => booking.court.id === court.id).map(booking => ({ startTime: booking.startTime, endTime: booking.endTime, state: booking.bookingStatus === "CANCELLED" ? "BLOCKED" : "BOOKED" })) })) }); }
  if (path === "/bookings" && method === "POST") { const match = findCourt(String(input.courtId)); if (!match) return json({ message: "Court not found" }, 404); const booking: MockBooking = { id: crypto.randomUUID(), bookingNumber: `PB-${new Date().getFullYear()}-${String(data.bookings.length + 1).padStart(3, "0")}`, customerName: String(input.customerName || "Guest player"), startTime: String(input.startTime), endTime: String(input.endTime), bookingStatus: "CONFIRMED", paymentStatus: "PENDING", total: match.court.hourlyRate, court: match.court, location: { id: match.location.id, name: match.location.name } }; data.bookings.unshift(booking); save(data); return json(booking, 201); }
  if (path === "/bookings/me") return json(data.bookings);
  const qrMatch = path.match(/^\/bookings\/([^/]+)\/qr$/); if (qrMatch) return json({ imageDataUrl: "data:image/svg+xml," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='160' height='160' fill='white'/><path fill='#112219' d='M10 10h45v45H10zm10 10v25h25V20zM105 10h45v45h-45zm10 10v25h25V20zM10 105h45v45H10zm10 10v25h25v-25zM70 70h15v15H70zm20 0h15v15H90zm20 0h15v15h-15zM70 90h15v15H70zm20 20h15v15H90zm20-20h15v35h-15zM70 120h15v15H70z'/></svg>`) });
  if (/^\/bookings\/[^/]+\/confirmation\.pdf$/.test(path)) return new Response("%PDF-1.4\n% PickleBook demo confirmation\n", { headers: { "Content-Type": "application/pdf" } });
  if (path === "/admin/dashboard") return json({ summary: { todaysBookings: data.bookings.length, todaysRevenue: data.bookings.filter(item => item.paymentStatus === "PAID").reduce((sum, item) => sum + Number(item.total), 0), activeCourts: data.locations.reduce((sum, item) => sum + item.courts.length, 0), registeredUsers: data.users.length }, bookings: data.bookings });
  if (path === "/admin/bookings" && method === "GET") return json(data.bookings);
  const adminBooking = path.match(/^\/admin\/bookings\/([^/]+)$/); if (adminBooking && method === "PATCH") { const booking = data.bookings.find(item => item.id === adminBooking[1]); if (!booking) return json({ message: "Booking not found" }, 404); Object.assign(booking, input); save(data); return json(booking); }
  if (path === "/admin/bookings" && method === "POST") return mockApiFetch("/bookings", { method: "POST", body: JSON.stringify(input) });
  if (path === "/admin/locations" && method === "GET") return json(data.locations.map(publicLocation));
  if (path === "/admin/locations" && method === "POST") { const location: MockLocation = { id: crypto.randomUUID(), name: String(input.name), slug: String(input.slug), address: String(input.address), phone: input.phone, email: input.email, status: "ACTIVE", courts: [] }; data.locations.push(location); save(data); return json(location, 201); }
  if (path === "/admin/courts" && method === "POST") { const location = data.locations.find(item => item.id === input.locationId); if (!location) return json({ message: "Location not found" }, 404); const court: MockCourt = { id: crypto.randomUUID(), name: String(input.name), courtNumber: Number(input.courtNumber), hourlyRate: String(input.hourlyRate), status: "ACTIVE" }; location.courts.push(court); save(data); return json(court, 201); }
  if (path === "/admin/users" && method === "GET") return json(data.users);
  const user = path.match(/^\/admin\/users\/([^/]+)$/); if (user && method === "PATCH") { const found = data.users.find(item => item.id === user[1]); if (!found) return json({ message: "User not found" }, 404); Object.assign(found, input); save(data); return json(found); }
  if (path === "/admin/reports") return json({ totalBookings: data.bookings.length, revenue: data.bookings.filter(item => item.paymentStatus === "PAID").reduce((sum, item) => sum + Number(item.total), 0), byCourt: data.locations.flatMap(location => location.courts.map(court => ({ court: `${location.name} · ${court.name}`, bookings: data.bookings.filter(item => item.court.id === court.id).length }))), statuses: data.bookings.reduce<Record<string, number>>((result, item) => ({ ...result, [item.bookingStatus]: (result[item.bookingStatus] ?? 0) + 1 }), {}) });
  if (path === "/admin/settings/social-links") return json({ success: true });
  if (path === "/admin/check-in/validate") { const booking = data.bookings.find(item => item.id === input.token || item.bookingNumber === input.token) ?? data.bookings[0]; return json(booking); }
  if (path === "/admin/check-in") return json({ success: true });
  return json({ message: `Demo endpoint not implemented: ${method} ${path}` }, 404);
}
