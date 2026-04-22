'use client'

import { Phone, Mail } from 'lucide-react'
import type { BookingFormData, BookingFormErrors } from '@/types/booking'

interface Props {
  data: BookingFormData
  errors: BookingFormErrors
  onChange: (data: BookingFormData) => void
  onClearError: (field: keyof BookingFormErrors) => void
}

interface FieldProps {
  label: string
  optional?: boolean
  error?: string
  icon?: React.ReactNode
  children: React.ReactNode
}

function Field({ label, optional, error, icon, children }: FieldProps) {
  return (
    <div>
      <label className="flex items-baseline gap-1.5 text-xs font-semibold tracking-widest uppercase text-stone-500 mb-2">
        {label}
        {optional && (
          <span className="text-stone-400 font-normal normal-case tracking-normal text-[0.75rem]">
            (optional)
          </span>
        )}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none flex">
            {icon}
          </span>
        )}
        {children}
      </div>
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  )
}

function inputClass(hasIcon: boolean, hasError: boolean) {
  return [
    'w-full border rounded-xl',
    hasIcon ? 'pl-10 pr-4' : 'px-4',
    'py-3.5 text-stone-900 text-sm bg-white placeholder:text-stone-300 outline-none',
    'transition-all duration-200',
    'focus:ring-2 focus:ring-[#006241]/20 focus:border-[#006241]',
    hasError ? 'border-red-400 ring-2 ring-red-100' : 'border-stone-200',
  ].join(' ')
}

export default function BookingForm({ data, errors, onChange, onClearError }: Props) {
  function handle(field: keyof BookingFormData, value: string) {
    onChange({ ...data, [field]: value })
    if (field !== 'email') onClearError(field as keyof BookingFormErrors)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Field label="First Name" error={errors.firstName}>
          <input
            className={inputClass(false, !!errors.firstName)}
            placeholder="Maria"
            value={data.firstName}
            onChange={e => handle('firstName', e.target.value)}
          />
        </Field>
        <Field label="Last Name" error={errors.lastName}>
          <input
            className={inputClass(false, !!errors.lastName)}
            placeholder="Santos"
            value={data.lastName}
            onChange={e => handle('lastName', e.target.value)}
          />
        </Field>
      </div>

      <Field
        label="Phone Number"
        icon={<Phone className="w-4 h-4" />}
        error={errors.phone}
      >
        <input
          className={inputClass(true, !!errors.phone)}
          type="tel"
          inputMode="numeric"
          placeholder="09171234567"
          value={data.phone}
          onChange={e => handle('phone', e.target.value)}
        />
      </Field>

      <Field
        label="Email"
        optional
        icon={<Mail className="w-4 h-4" />}
      >
        <input
          className={inputClass(true, false)}
          type="email"
          placeholder="maria@example.com"
          value={data.email}
          onChange={e => handle('email', e.target.value)}
        />
      </Field>
    </div>
  )
}
