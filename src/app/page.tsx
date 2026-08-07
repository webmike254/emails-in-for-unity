
'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Mail, PenSquare, Inbox, Star, Send, Archive, Search,
  Loader2, CheckCircle2, AlertCircle, User, ChevronRight, X, RefreshCw, Briefcase
} from 'lucide-react'

type Member = { id: string; name: string; email: string; role: string; color: string }
type Message = {
  id: string; direction: string; from_email: string; from_name: string | null
  to_email: string; subject: string; body_html: string | null; body_text: string | null
  is_read: boolean; status: string; created_at: string
}
type Thread = {
  id: string; subject: string; snippet: string | null; is_starred: boolean
  assigned_to: string | null; last_message_at: string
  messages: Message[]; assigned: Member | null
}

const SENDERS = [
  { email: 'hr@unity-software.online', name: 'Amara Njoroge', title: 'HR Manager' },
  { email: 'hiring@unity-software.online', name: 'Daniel Ochieng', title: 'Hiring Manager' },
  { email: 'director@unity-software.online', name: 'Grace Wambui', title: 'Director' },
  { email: 'hello@unity-software.online', name: 'Unity Software', title: 'General' },
]

function buildHtml(body: string, sender: typeof SENDERS[0]) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:600px;">
<tr><td style="padding:0;line-height:0;"><img src="https://emails-in-for-unitys.vercel.app/header.jpg" alt="Unity Software" width="600" style="display:block;width:100%;max-width:600px;height:auto;" /></td></tr>
<tr><td style="padding:40px 40px 24px;">${body}<div style="height:3px;width:48px;background:#f59e0b;border-radius:2px;margin:28px 0;"></div>
<p style="margin:0 0 4px;font-size:16px;color:#374151;">Kind regards,</p></td></tr>
<tr><td style="padding:0 40px 36px;">
<p style="margin:0 0 2px;font-size:16px;font-weight:600;color:#111827;">${sender.name}</p>
<p style="margin:0 0 6px;font-size:13px;color:#6b7280;font-weight:500;">${sender.title} · Unity Software</p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">+254 778 903 044<br>
<a href="mailto:${sender.email}" style="color:#6b7280;text-decoration:none;">${sender.email}</a></p>
</td></tr>
<tr><td style="background:#111827;padding:28px 40px;">
<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#f9fafb;">UNITY SOFTWARE</p>
<p style="margin:0;font-size:12px;color:#9ca3af;"><a href="https://www.unity-software.online" style="color:#f59e0b;text-decoration:none;">www.unity-software.online</a></p>
</td></tr></table></td></tr></table></body></html>`
}

export default function InboxPage() {
  const [folder, setFolder] = useState<'inbox' | 'sent' | 'starred' | 'applications'>('inbox')
  const [threads, setThreads] = useState<Thread[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [selected, setSelected] = useState<Thread | null>(null)
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<any[]>([])
  const [composeOpen, setComposeOpen] = useState(false)
  const [me, setMe] = useState<Member | null>(null)

  // compose state
  const [sender, setSender] = useState(SENDERS[0])
  const [toEmail, setToEmail] = useState('')
  const [toName, setToName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#374151;">Hello,</p>')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ok?:boolean;error?:string}|null>(null)
  const [replyMode, setReplyMode] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, mRes, aRes] = await Promise.all([
        fetch(`/api/threads?folder=${folder === 'applications' ? 'inbox' : folder}`),
        fetch('/api/team'),
        fetch('/api/applications'),
      ])
      const tData = await tRes.json()
      const mData = await mRes.json()
      const aData = await aRes.json()
      if (tData.threads) setThreads(tData.threads)
      if (mData.members) {
        setMembers(mData.members)
        if (!me && mData.members.length) setMe(mData.members[0])
      }
      if (aData.applications) setApplications(aData.applications)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [folder, me])

  useEffect(() => { load() }, [load])

  async function assign(threadId: string, memberId: string | null) {
    await fetch('/api/threads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: threadId, assigned_to: memberId }),
    })
    load()
  }

  async function toggleStar(threadId: string, current: boolean) {
    await fetch('/api/threads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: threadId, is_starred: !current }),
    })
    load()
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setSendResult(null)
    try {
      const html = buildHtml(body, sender)
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromEmail: sender.email,
          fromName: sender.name,
          toEmail,
          toName: toName || undefined,
          subject: replyMode && selected ? `Re: ${selected.subject.replace(/^re:\s*/i,'')}` : subject,
          html,
          threadId: replyMode && selected ? selected.id : undefined,
          sentBy: me?.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setSendResult({ ok: true })
      setToEmail(''); setToName(''); setSubject('')
      setComposeOpen(false); setReplyMode(false)
      load()
    } catch (err: any) {
      setSendResult({ error: err.message })
    } finally {
      setSending(false)
    }
  }

  function openReply(thread: Thread) {
    const lastInbound = [...(thread.messages||[])].reverse().find(m => m.direction === 'inbound')
    setToEmail(lastInbound?.from_email || '')
    setToName(lastInbound?.from_name || '')
    setSubject(`Re: ${thread.subject.replace(/^re:\s*/i, '')}`)
    setBody('<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#374151;"></p>')
    setReplyMode(true)
    setSelected(thread)
    setComposeOpen(true)
  }

  const nav = [
    { id: 'inbox' as const, label: 'Inbox', icon: Inbox },
    { id: 'starred' as const, label: 'Starred', icon: Star },
    { id: 'sent' as const, label: 'Sent', icon: Send },
    { id: 'applications' as const, label: 'Applications', icon: Briefcase },
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="h-14 flex items-center gap-4 px-3 border-b border-black/5 bg-white shrink-0">
        <div className="flex items-center gap-2.5 w-52">
          <img src="/logo.png" alt="Unity Email" className="w-9 h-9 object-contain" />
          <span className="font-medium text-[22px] text-[#5f6368] tracking-tight">Unity</span>
        </div>
        <div className="flex-1 max-w-2xl">
          <div className="flex items-center gap-2 h-11 px-4 rounded-full bg-[#eaf1fb]">
            <Search className="w-5 h-5 text-[#5f6368]" />
            <input placeholder="Search in mail" className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-[#5f6368]" />
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={load} className="p-2 rounded-full hover:bg-black/5" title="Refresh">
            <RefreshCw className={`w-5 h-5 text-[#5f6368] ${loading ? 'animate-spin' : ''}`} />
          </button>
          {me && (
            <div className="flex items-center gap-2 pl-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ background: me.color }}>
                {me.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
              </div>
              <select
                value={me.id}
                onChange={e => setMe(members.find(m => m.id === e.target.value) || null)}
                className="text-[13px] bg-transparent outline-none max-w-[140px]"
              >
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[220px] shrink-0 pt-3 px-2 flex flex-col gap-1">
          <button
            onClick={() => { setComposeOpen(true); setReplyMode(false); setSubject(''); setToEmail(''); setToName('') }}
            className="flex items-center gap-3 h-14 px-4 mb-2 rounded-2xl bg-[#c2e7ff] hover:shadow-md transition text-[#001d35] font-medium text-[14px]"
          >
            <PenSquare className="w-5 h-5" />
            Compose
          </button>
          {nav.map(item => (
            <button
              key={item.id}
              onClick={() => { setFolder(item.id); setSelected(null) }}
              className={`flex items-center gap-4 h-8 px-4 rounded-r-full text-[14px] transition ${
                folder === item.id ? 'bg-[#d3e3fd] font-bold text-[#001d35]' : 'hover:bg-black/5 text-[#202124]'
              }`}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </button>
          ))}

          <div className="mt-6 px-4">
            <p className="text-[11px] font-medium text-[#5f6368] uppercase tracking-wide mb-2">Assigned</p>
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2 py-1.5 text-[13px] text-[#202124]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
                {m.name.split(' ')[0]}
              </div>
            ))}
          </div>
        </aside>

        {/* List */}
        <section className={`flex flex-col bg-white border-l border-black/5 ${selected ? 'w-[380px]' : 'flex-1'} shrink-0 overflow-hidden`}>
          <div className="h-12 flex items-center px-4 border-b border-black/5 text-[13px] text-[#5f6368]">
            {folder.charAt(0).toUpperCase() + folder.slice(1)}
            <span className="ml-2 text-[#1a73e8]">{folder === 'applications' ? applications.length : threads.length}</span>
            {folder === 'applications' && (
              <a href="/apply" target="_blank" className="ml-auto text-[#1a73e8] text-[12px] font-medium hover:underline">Open form →</a>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#5f6368]" /></div>
            ) : folder === 'applications' ? (
              applications.length === 0 ? (
                <div className="p-10 text-center text-[#5f6368] text-[14px]">
                  No applications yet.<br/>
                  <a href="/apply" className="text-[#1a73e8] underline mt-2 inline-block">Open application form</a>
                </div>
              ) : (
                applications.map((app: any) => (
                  <div key={app.id} className="w-full text-left px-4 py-3 border-b border-black/5 hover:bg-[#f8f9fa]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-[14px] truncate ${!app.is_read ? 'font-bold' : ''}`}>{app.name}</p>
                        <p className="text-[13px] text-[#5f6368] truncate">{app.position || app.kind} · {app.email}</p>
                        <p className="text-[12px] text-[#5f6368] truncate mt-0.5">{app.message}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-50 text-amber-800">{app.status}</span>
                        <p className="text-[11px] text-[#5f6368] mt-1">{new Date(app.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className="text-[12px] text-[#1a73e8] font-medium"
                        onClick={async () => {
                          setToEmail(app.email); setToName(app.name);
                          setSubject(`Re: Your application${app.position ? ' — ' + app.position : ''}`);
                          setComposeOpen(true); setReplyMode(false);
                          await fetch('/api/applications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: app.id, is_read: true, status: 'reviewing' }) });
                          load();
                        }}
                      >Reply</button>
                    </div>
                  </div>
                ))
              )
            ) : threads.length === 0 ? (
              <div className="p-10 text-center text-[#5f6368] text-[14px]">No messages in {folder}</div>
            ) : (
              threads.map(t => {
                const unread = t.messages?.some(m => m.direction === 'inbound' && !m.is_read)
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className={`w-full text-left px-4 py-3 border-b border-black/5 hover:shadow-sm transition flex gap-3 ${
                      selected?.id === t.id ? 'bg-[#c2e7ff]/40' : unread ? 'bg-white' : 'bg-[#f2f6fc]/50'
                    }`}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); toggleStar(t.id, t.is_starred) }}
                      className="mt-1 shrink-0"
                    >
                      <Star className={`w-4 h-4 ${t.is_starred ? 'fill-amber-400 text-amber-400' : 'text-[#dadce0]'}`} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[14px] truncate ${unread ? 'font-bold' : ''}`}>
                          {t.messages?.[0]?.direction === 'outbound'
                            ? `To: ${t.messages[0].to_email}`
                            : (t.messages?.find(m=>m.direction==='inbound')?.from_name || t.messages?.find(m=>m.direction==='inbound')?.from_email || 'Unknown')}
                        </span>
                        <span className="text-[12px] text-[#5f6368] shrink-0">
                          {new Date(t.last_message_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className={`text-[13px] truncate ${unread ? 'font-semibold' : 'text-[#5f6368]'}`}>{t.subject}</p>
                      <p className="text-[12px] text-[#5f6368] truncate">{t.snippet}</p>
                      {t.assigned && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[11px] px-1.5 py-0.5 rounded" style={{ background: t.assigned.color + '22', color: t.assigned.color }}>
                          <User className="w-3 h-3" /> {t.assigned.name.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </section>

        {/* Reading pane */}
        {selected && (
          <section className="flex-1 flex flex-col bg-white border-l border-black/5 overflow-hidden">
            <div className="h-12 flex items-center gap-2 px-4 border-b border-black/5">
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-full hover:bg-black/5 lg:hidden"><X className="w-5 h-5" /></button>
              <h2 className="font-normal text-[18px] truncate flex-1">{selected.subject}</h2>
              <select
                value={selected.assigned_to || ''}
                onChange={e => assign(selected.id, e.target.value || null)}
                className="text-[12px] border border-black/10 rounded-lg px-2 py-1.5 bg-[#f8f9fa]"
              >
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button
                onClick={() => openReply(selected)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#c2e7ff] text-[#001d35] text-[13px] font-medium"
              >
                Reply
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {(selected.messages || []).slice().sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(m => (
                <div key={m.id} className="border border-black/5 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="font-medium text-[14px]">
                        {m.from_name || m.from_email}
                        <span className="font-normal text-[#5f6368] text-[13px]"> &lt;{m.from_email}&gt;</span>
                      </p>
                      <p className="text-[12px] text-[#5f6368]">to {m.to_email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] text-[#5f6368]">{new Date(m.created_at).toLocaleString()}</p>
                      <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${m.direction === 'outbound' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {m.direction}
                      </span>
                    </div>
                  </div>
                  {m.body_html ? (
                    <div className="prose prose-sm max-w-none text-[14px]" dangerouslySetInnerHTML={{ __html: m.body_html }} />
                  ) : (
                    <p className="text-[14px] whitespace-pre-wrap">{m.body_text}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Compose modal */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-4">
          <form onSubmit={handleSend} className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 h-12 bg-[#f2f6fc]">
              <span className="font-medium text-[14px]">{replyMode ? 'Reply' : 'New message'}</span>
              <button type="button" onClick={() => { setComposeOpen(false); setReplyMode(false) }} className="p-1 rounded hover:bg-black/5"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <div className="flex items-center gap-2 border-b border-black/5 pb-2">
                <span className="text-[13px] text-[#5f6368] w-12">From</span>
                <select value={sender.email} onChange={e => setSender(SENDERS.find(s => s.email === e.target.value)!)} className="flex-1 text-[14px] outline-none bg-transparent">
                  {SENDERS.map(s => <option key={s.email} value={s.email}>{s.name} ({s.email})</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 border-b border-black/5 pb-2">
                <span className="text-[13px] text-[#5f6368] w-12">To</span>
                <input required type="email" value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="recipient@email.com" className="flex-1 text-[14px] outline-none" />
              </div>
              <div className="flex items-center gap-2 border-b border-black/5 pb-2">
                <span className="text-[13px] text-[#5f6368] w-12">Name</span>
                <input type="text" value={toName} onChange={e => setToName(e.target.value)} placeholder="Optional" className="flex-1 text-[14px] outline-none" />
              </div>
              {!replyMode && (
                <div className="flex items-center gap-2 border-b border-black/5 pb-2">
                  <span className="text-[13px] text-[#5f6368] w-12">Subject</span>
                  <input required type="text" value={subject} onChange={e => setSubject(e.target.value)} className="flex-1 text-[14px] outline-none" />
                </div>
              )}
              <textarea
                required
                rows={10}
                value={body}
                onChange={e => setBody(e.target.value)}
                className="w-full text-[14px] outline-none resize-none font-mono leading-relaxed"
                placeholder="Write your message (HTML ok)…"
              />
              {sendResult && (
                <div className={`flex items-center gap-2 text-[13px] ${sendResult.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                  {sendResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {sendResult.ok ? 'Sent' : sendResult.error}
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-black/5 flex items-center gap-2">
              <button type="submit" disabled={sending} className="h-9 px-6 rounded-full bg-[#0b57d0] text-white text-[14px] font-medium hover:bg-[#0842a0] disabled:opacity-60 flex items-center gap-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Send
              </button>
              <p className="text-[11px] text-[#5f6368]">Letterhead + signature added automatically</p>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
