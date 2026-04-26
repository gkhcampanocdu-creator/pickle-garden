export interface ConfirmationEmailData {
  guestName: string
  bookingRef: string
  date: string
  time: string
  duration: string
  price: string
  gcashRef: string
}

export function buildConfirmationEmail(data: ConfirmationEmailData): string {
  const { guestName, bookingRef, date, time, duration, price, gcashRef } = data
  const firstName = guestName.split(' ')[0]

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Booking Confirmed – Pickle Garden</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:'Inter',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:#FAF8F5;padding:32px 16px;">
    <tr><td align="center">

      <!-- Card -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
        style="max-width:520px;background:#ffffff;border-radius:16px;
               box-shadow:0 4px 24px rgba(0,0,0,0.07);overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#006241;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.25em;
                      text-transform:uppercase;color:rgba(255,255,255,0.55);">
              Pickle Garden · Mandaue City
            </p>
            <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;
                       font-family:Georgia,'Times New Roman',serif;">
              Booking Confirmed
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 0;">
            <p style="margin:0 0 24px;font-size:15px;color:#44403c;line-height:1.6;">
              Hi ${firstName},<br/><br/>
              Your court is reserved! Here's a summary of your booking. Please
              screenshot or save your reference number — you'll need it to look
              up or cancel your booking.
            </p>

            <!-- Reference badge -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;
                     margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;text-align:center;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;
                            letter-spacing:0.2em;text-transform:uppercase;color:#15803d;">
                    Booking Reference
                  </p>
                  <p style="margin:0;font-size:26px;font-weight:700;
                            letter-spacing:0.08em;color:#166534;
                            font-family:Georgia,'Times New Roman',serif;">
                    ${bookingRef}
                  </p>
                </td>
              </tr>
            </table>

            <!-- Details grid -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
              style="border:1px solid #e7e5e4;border-radius:10px;overflow:hidden;
                     margin-bottom:24px;">
              ${row('Date', date)}
              ${row('Time', time, true)}
              ${row('Duration', duration)}
              ${row('Total', price, true)}
              ${row('GCash Ref', gcashRef)}
            </table>

            <!-- Payment notice -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:10px;
                     margin-bottom:32px;">
              <tr>
                <td style="padding:14px 18px;">
                  <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                    <strong>Payment verification pending.</strong> Our team will confirm
                    your GCash payment within a few hours. No further action is needed
                    on your end.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Cancellation policy -->
        <tr>
          <td style="padding:0 40px 32px;">
            <p style="margin:0;font-size:12px;color:#a8a29e;line-height:1.7;">
              Need to cancel? Use the <strong>Manage Booking</strong> link on our website
              and enter your reference number and phone. Cancellations must be made at
              least <strong>2 hours before</strong> your start time.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#006241;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.6);">
              © ${new Date().getFullYear()} Pickle Garden · Mandaue City, Cebu
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`
}

// ── Shared server-side formatting helpers ─────────────────────────────────────

export function h12(h: number): string {
  return `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[+m - 1]} ${+d}, ${y}`
}

// ── Cancellation email ────────────────────────────────────────────────────────

export interface CancellationEmailData {
  guestName: string
  bookingRef: string
  date: string
  time: string
  duration: string
}

export function buildCancellationEmail(data: CancellationEmailData): string {
  const { guestName, bookingRef, date, time, duration } = data
  const firstName = guestName.split(' ')[0]

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Booking Cancelled – Pickle Garden</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:'Inter',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:#FAF8F5;padding:32px 16px;">
    <tr><td align="center">

      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
        style="max-width:520px;background:#ffffff;border-radius:16px;
               box-shadow:0 4px 24px rgba(0,0,0,0.07);overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#44403c;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.25em;
                      text-transform:uppercase;color:rgba(255,255,255,0.45);">
              Pickle Garden · Mandaue City
            </p>
            <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;
                       font-family:Georgia,'Times New Roman',serif;">
              Booking Cancelled
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 0;">
            <p style="margin:0 0 24px;font-size:15px;color:#44403c;line-height:1.6;">
              Hi ${firstName},<br/><br/>
              Your booking has been successfully cancelled. Here are the details
              of the slot that was released.
            </p>

            <!-- Reference badge -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#fafaf9;border:1.5px solid #e7e5e4;border-radius:10px;
                     margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;text-align:center;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;
                            letter-spacing:0.2em;text-transform:uppercase;color:#78716c;">
                    Cancelled Booking
                  </p>
                  <p style="margin:0;font-size:26px;font-weight:700;
                            letter-spacing:0.08em;color:#44403c;
                            font-family:Georgia,'Times New Roman',serif;
                            text-decoration:line-through;opacity:0.6;">
                    ${bookingRef}
                  </p>
                </td>
              </tr>
            </table>

            <!-- Details grid -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
              style="border:1px solid #e7e5e4;border-radius:10px;overflow:hidden;
                     margin-bottom:24px;">
              ${row('Date', date)}
              ${row('Time', time, true)}
              ${row('Duration', duration)}
            </table>

            <!-- Rebook nudge -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;
                     margin-bottom:32px;">
              <tr>
                <td style="padding:14px 18px;">
                  <p style="margin:0;font-size:13px;color:#166534;line-height:1.6;">
                    Want to play again? Visit our site to book a new slot —
                    availability updates in real time.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#006241;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.6);">
              © ${new Date().getFullYear()} Pickle Garden · Mandaue City, Cebu
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`
}

function row(label: string, value: string, shaded = false): string {
  const bg = shaded ? 'background:#fafaf9;' : ''
  return `<tr>
    <td style="${bg}padding:11px 16px;border-bottom:1px solid #e7e5e4;
               font-size:12px;font-weight:600;color:#78716c;width:38%;">
      ${label}
    </td>
    <td style="${bg}padding:11px 16px;border-bottom:1px solid #e7e5e4;
               font-size:14px;font-weight:600;color:#1c1917;">
      ${value}
    </td>
  </tr>`
}
