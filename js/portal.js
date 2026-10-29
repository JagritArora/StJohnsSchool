/* Touches shared by every signed-in page, carried over from the sign-in page: a help line at the
   foot for families, teachers and drivers, and the driver's greeting with today's date and a clock. */
(() => {
  const S = window.SJS; if (!S) return;
  const main = document.querySelector("main.main"); if (!main) return;
  const drv = document.body.classList.contains("drv"), role = drv ? "driver" : S.staff ? S.staff.role : "parent";
  // The office and the principal are the people this line points to, so they don't get it.
  if (role !== "admin" && role !== "principal") main.insertAdjacentHTML("beforeend", `<p class="pt-help"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>${role === "parent" ? "Something not right?" : "Need a hand?"} Call the school office on <a href="tel:01292242097">0129 224 2097</a>, Monday to Saturday.</p>`);
  if (!drv) return;
  // The driver's page: a greeting with a calendar tile and a clock that keeps time, above the trip.
  const trip = document.getElementById("trip"), who = (document.getElementById("who-name") || {}).textContent || "";
  if (!trip) return;
  trip.insertAdjacentHTML("beforebegin", `<div class="pt-hello"><i class="pt-cal" aria-hidden="true"><small></small><b></b></i><div><small class="pt-date"></small><h1>${S.greet()}${who ? ", " + S.esc(who.split(" ")[0]) : ""}</h1></div><span class="pt-live"><em></em><span></span></span></div>`);
  const tick = () => { const d = new Date(), h = document.querySelector(".pt-hello"); if (!h) return;
    h.querySelector(".pt-cal small").textContent = d.toLocaleDateString("en-IN", { month: "short" }); h.querySelector(".pt-cal b").textContent = d.getDate();
    h.querySelector(".pt-date").textContent = d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
    h.querySelector(".pt-live > span").textContent = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }); };
  tick(); setInterval(tick, 20000);
})();
