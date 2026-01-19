'use client'

import { useState } from 'react'
import { X, Calendar, Clock } from 'lucide-react'
import { format, addDays } from 'date-fns'

interface ScheduleModalProps {
  onClose: () => void
  onSchedule: (date: string, time: string | null) => void
}

export function ScheduleModal({ onClose, onSchedule }: ScheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [selectedTime, setSelectedTime] = useState('')
  const [useTime, setUseTime] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSchedule(selectedDate, useTime ? selectedTime : null)
  }

  // Generate next 30 days for quick selection
  const quickDates = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(new Date(), i + 1)
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEE, MMM d'),
    }
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="font-semibold">Schedule Post</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[var(--card)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Quick Date Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Quick Select</label>
            <div className="flex flex-wrap gap-2">
              {quickDates.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setSelectedDate(d.value)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    selectedDate === d.value
                      ? 'bg-accent text-white'
                      : 'bg-[var(--card)] hover:bg-[var(--border)]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Time Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useTime}
              onChange={e => setUseTime(e.target.checked)}
              className="rounded border-[var(--border)]"
            />
            <span className="text-sm">Set specific time</span>
          </label>

          {/* Time Picker */}
          {useTime && (
            <div>
              <label className="block text-sm font-medium mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Time
              </label>
              <input
                type="time"
                value={selectedTime}
                onChange={e => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[var(--card)] hover:bg-[var(--border)] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
            >
              Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
