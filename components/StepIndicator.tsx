'use client'

import { Check } from 'lucide-react'

interface Props {
  currentStep: 1 | 2 | 3
}

const STEPS = [
  { n: 1, label: 'Date & Time', short: 'Date'    },
  { n: 2, label: 'Your Info',   short: 'Info'    },
  { n: 3, label: 'Confirm',     short: 'Confirm' },
] as const

export default function StepIndicator({ currentStep }: Props) {
  return (
    <div className="flex justify-center mb-7">
      <div className="flex items-center">
        {STEPS.map((step, index) => {
          const isActive = step.n === currentStep
          const isDone = step.n < currentStep
          return (
            <div key={step.n} className="flex items-center">
              {index > 0 && (
                <div
                  className={`w-4 sm:w-12 h-px transition-colors duration-300 ease-out flex-shrink-0 ${
                    isDone ? 'bg-[#006241]' : 'bg-stone-200'
                  }`}
                />
              )}
              <div className="flex items-center gap-1 sm:gap-2">
                <div
                  aria-current={isActive ? 'step' : undefined}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-[background-color,color,box-shadow] duration-300 ease-out flex-shrink-0 ${
                    isActive
                      ? 'bg-[#006241] text-white shadow-sm ring-4 ring-[#006241]/10'
                      : isDone
                      ? 'bg-[#006241] text-white'
                      : 'bg-white border-2 border-stone-200 text-stone-400'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : step.n}
                </div>
                <span
                  className={`font-medium transition-colors duration-300 ease-out ${
                    isActive ? 'text-stone-800' : isDone ? 'text-[#006241]' : 'text-stone-400'
                  }`}
                >
                  <span className="text-[0.6rem] sm:hidden">{step.short}</span>
                  <span className="hidden sm:inline text-xs">{step.label}</span>
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
