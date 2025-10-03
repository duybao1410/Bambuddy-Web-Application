function getAllDayGoogleCalendarUrl({ title, date, details, location }) {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';

  // Google Calendar all-day events use YYYYMMDD/YYYYMMDD
  const start = date.replace(/-/g, ""); // "2025-08-17" -> "20250817"
  const end = start; // same day only

  const params = new URLSearchParams({
    text: title,
    dates: `${start}/${end}`,
    details,
    location,
  });

  return `${base}&${params.toString()}`;
}

module.exports = { getAllDayGoogleCalendarUrl };
