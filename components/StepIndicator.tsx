'use client'

import { Check } from 'lucide-react'

interface Props {
  currentStep: 1 | 2 | 3
}

const STEPS = [
  { n: 1, label: 'Date & Time' },
  { n: 2, label: 'Your Info' },
  { n: 3, label: 'Confirm' },
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
                  className={`w-8 sm:w-12 h-px transition-colors duration-300 ${
                    isDone ? 'bg-[#006241]' : 'bg-stone-200'
                  }`}
                />
              )}
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 flex-shrink-0 ${
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
                  className={`text-xs font-medium hidden sm:block transition-colors duration-300 ${
                    isActive ? 'text-stone-800' : isDone ? 'text-[#006241]' : 'text-stone-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
