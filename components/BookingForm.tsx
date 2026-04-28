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
  htmlFor: string
  optional?: boolean
  error?: string
  hint?: string
  icon?: React.ReactNode
  children: React.ReactNode
}

function Field({ label, htmlFor, optional, error, hint, icon, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="flex items-baseline gap-1.5 text-xs font-semibold tracking-widest uppercase text-stone-500 mb-2">
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
      {hint && !error && <p className="text-[0.7rem] text-stone-400 mt-1.5">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  )
}

function inputClass(hasIcon: boolean, hasError: boolean) {
  return [
    'w-full border rounded-xl',
    hasIcon ? 'pl-10 pr-4' : 'px-4',
    'py-3.5 text-stone-900 text-sm bg-white placeholder:text-stone-300 outline-none',
    'transition-[border-color,box-shadow] duration-200 ease-out',
    'focus:ring-2 focus:ring-[#006241]/20 focus:border-[#006241]',
    hasError ? 'border-red-400 ring-2 ring-red-100' : 'border-stone-200',
  ].join(' ')
}

export default function BookingForm({ data, errors, onChange, onClearError }: Props) {
  function handle(field: keyof BookingFormData, value: string) {
    onChange({ ...data, [field]: value })
    onClearError(field as keyof BookingFormErrors)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Field label="First Name" htmlFor="firstName" error={errors.firstName}>
          <input
            id="firstName"
            autoComplete="given-name"
            className={inputClass(false, !!errors.firstName)}
            placeholder="Maria"
            value={data.firstName}
            onChange={e => handle('firstName', e.target.value)}
          />
        </Field>
        <Field label="Last Name" htmlFor="lastName" error={errors.lastName}>
          <input
            id="lastName"
            autoComplete="family-name"
            className={inputClass(false, !!errors.lastName)}
            placeholder="Santos"
            value={data.lastName}
            onChange={e => handle('lastName', e.target.value)}
          />
        </Field>
      </div>

      <Field
        label="Phone Number"
        htmlFor="phone"
        icon={<Phone className="w-4 h-4" />}
        hint="Use format: 09171234567 or +639171234567"
        error={errors.phone}
      >
        <input
          id="phone"
          autoComplete="tel"
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
        htmlFor="email"
        optional
        icon={<Mail className="w-4 h-4" />}
        error={errors.email}
      >
        <input
          id="email"
          autoComplete="email"
          className={inputClass(true, !!errors.email)}
          type="email"
          placeholder="maria@example.com"
          value={data.email}
          onChange={e => handle('email', e.target.value)}
        />
      </Field>

      <div className="pt-1">
        <div className="flex items-start gap-3">
          <input
            id="consent"
            type="checkbox"
            checked={data.consent}
            onChange={e => { onChange({ ...data, consent: e.target.checked }); onClearError('consent') }}
            className="mt-0.5 w-4 h-4 flex-shrink-0 cursor-pointer accent-[#006241]"
          />
          <label htmlFor="consent" className="text-xs text-stone-500 leading-relaxed cursor-pointer">
            I agree to my personal data (name, phone, email) being stored and used solely to process this court booking.
          </label>
        </div>
        {errors.consent && <p className="text-xs text-red-500 mt-1.5">{errors.consent}</p>}
      </div>
    </div>
  )
}
