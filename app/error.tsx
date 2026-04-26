'use client'

export default function Error({
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <div className="min-h-dvh bg-[#FAF8F5] flex items-center justify-center px-5">
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)] p-10 max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-400 text-xl font-semibold">!</span>
        </div>
        <h2 className="font-serif text-xl font-semibold text-stone-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-stone-500 mb-6 leading-relaxed">
          An unexpected error occurred. Your booking has not been placed.
        </p>
        <button
          onClick={unstable_retry}
          className="bg-[#006241] hover:bg-[#004d32] text-white font-semibold text-sm rounded-xl px-6 py-3 transition-colors duration-200 cursor-pointer"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
