'use client'

import { useState } from 'react'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function ApplyPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'job', name, email, phone, position, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResult({ ok: true })
      setName(''); setEmail(''); setPhone(''); setPosition(''); setMessage('')
    } catch (err: any) {
      setResult({ error: err.message })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc] flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        <div className="px-6 py-5 border-b border-black/5 flex items-center gap-3">
          <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="font-semibold text-[18px] tracking-tight">Job application</h1>
            <p className="text-[13px] text-[#5f6368]">Unity Software · Stored securely</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#5f6368] mb-1">Full name</label>
            <input required value={name} onChange={e => setName(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-black/10 bg-[#fafafa] text-[15px] outline-none focus:ring-2 focus:ring-[#1a73e8]/30" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#5f6368] mb-1">Email</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-black/10 bg-[#fafafa] text-[15px] outline-none focus:ring-2 focus:ring-[#1a73e8]/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[#5f6368] mb-1">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-black/10 bg-[#fafafa] text-[15px] outline-none focus:ring-2 focus:ring-[#1a73e8]/30" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#5f6368] mb-1">Position</label>
              <input value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. Driver" className="w-full h-11 px-3 rounded-xl border border-black/10 bg-[#fafafa] text-[15px] outline-none focus:ring-2 focus:ring-[#1a73e8]/30" />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#5f6368] mb-1">Message / cover note</label>
            <textarea rows={5} value={message} onChange={e => setMessage(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-black/10 bg-[#fafafa] text-[15px] outline-none focus:ring-2 focus:ring-[#1a73e8]/30 resize-y" />
          </div>
          {result && (
            <div className={`flex items-center gap-2 text-[14px] ${result.ok ? 'text-emerald-700' : 'text-red-700'}`}>
              {result.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {result.ok ? 'Application submitted. We will get back to you.' : result.error}
            </div>
          )}
          <button type="submit" disabled={sending} className="h-11 px-6 rounded-full bg-[#0b57d0] text-white text-[14px] font-medium hover:bg-[#0842a0] disabled:opacity-60 inline-flex items-center gap-2">
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit application
          </button>
        </div>
      </form>
    </div>
  )
}
