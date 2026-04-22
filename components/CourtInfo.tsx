import { MapPin, Clock, Phone, AlertCircle } from 'lucide-react'

const SHADOW = 'shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)]'

const INFO_ITEMS = [
  {
    icon: MapPin,
    title: 'Location',
    body: '768 Plaridel Street, Cambaro Mandaue City',
  },
  {
    icon: Clock,
    title: 'Operating Hours',
    body: '8:00 AM – 10:00 PM Daily',
  },
  {
    icon: Phone,
    title: 'Contact',
    body: '09218132196',
  },
  {
    icon: AlertCircle,
    title: 'Cancellation Policy',
    body: 'Cancel 2 hrs before. No-shows forfeit slot.',
  },
]

export default function CourtInfo() {
  return (
    <div className={`mt-7 bg-white rounded-2xl ${SHADOW} p-6`}>
      <h3 className="font-serif text-base font-semibold text-stone-900 mb-5">
        Court Information
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {INFO_ITEMS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F3EE] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon className="w-4 h-4 text-[#006241]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-700">{title}</p>
              <p className="text-sm text-stone-500 mt-0.5 leading-snug">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
