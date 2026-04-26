'use client'

interface Props {
  duration: number
  onSetDuration: (d: number) => void
}

const OPTIONS = [
  { hours: 1, label: '1 hr',  price: '₱300'   },
  { hours: 2, label: '2 hrs', price: '₱600'   },
  { hours: 3, label: '3 hrs', price: '₱900'   },
  { hours: 4, label: '4 hrs', price: '₱1,200' },
]

export default function DurationPicker({ duration, onSetDuration }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {OPTIONS.map(({ hours, label, price }) => {
        const isActive = duration === hours
        return (
          <button
            key={hours}
            onClick={() => onSetDuration(hours)}
            aria-pressed={isActive}
            className={`rounded-xl border py-3.5 text-center cursor-pointer transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out ${
              isActive
                ? 'bg-[#006241] border-[#006241] shadow-sm scale-[1.03]'
                : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50'
            }`}
          >
            <div className={`font-serif font-semibold text-xl leading-none ${isActive ? 'text-white' : 'text-stone-800'}`}>
              {hours}
            </div>
            <div className={`text-[0.63rem] font-medium mt-1 ${isActive ? 'text-white/70' : 'text-stone-400'}`}>
              {label}
            </div>
            <div className={`text-[0.7rem] font-semibold mt-1.5 tabular-nums ${isActive ? 'text-white' : 'text-stone-500'}`}>
              {price}
            </div>
          </button>
        )
      })}
    </div>
  )
}
