import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? null
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${error}`)
  }

  if (code) {
    const cookieStore = cookies() as any
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value: '', ...options })
          }
        }
      }
    )

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      let { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .single()

      // If no role exists, it's a new OAuth user. Default to 'citizen'.
      if (!roleData) {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ id: user.id, role: 'citizen' })

        if (!insertError) {
          roleData = { role: 'citizen' }
          // Also create the citizen profile
          await supabase.from('citizen_profiles').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata.full_name || user.user_metadata.name || null
          })
        }
      }

      if (roleData?.role === 'lawyer') {
        return NextResponse.redirect(`${origin}/portal/dashboard`)
      }

      return NextResponse.redirect(`${origin}/citizen/home`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`)
}
