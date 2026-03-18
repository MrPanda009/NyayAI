import { supabase } from '@/lib/supabase/client'
import type { Enums } from '@/types/supabase'
import { createNotification } from '@/lib/db/notifications'

export async function createOffer(lawyerId: string, payload: {
  case_id: string
  offer_amount: number
  offer_note?: string
}) {
  const { data, error } = await supabase
    .from('case_pipeline')
    .insert({
      lawyer_id: lawyerId,
      ...payload,
      stage: 'offered',
      offer_sent_at: new Date().toISOString()
    })
    .select()
    .single()
  return { data, error }
}

export async function getLawyerPipeline(lawyerId: string, stage?: Enums<'pipeline_stage'>) {
  let query = supabase
    .from('case_pipeline')
    .select(`
      *,
      cases (
        id,
        title,
        domain,
        status,
        state,
        district,
        incident_description,
        budget_min,
        budget_max,
        created_at
      )
    `)
    .eq('lawyer_id', lawyerId)
    .order('created_at', { ascending: false })

  if (stage) {
    query = query.eq('stage', stage)
  }

  const { data, error } = await query
  return { data, error }
}

export async function updatePipelineStage(pipelineId: string, stage: Enums<'pipeline_stage'>, extras?: {
  outcome?: Enums<'case_outcome'>
  next_milestone?: string
  lawyer_notes?: string
  show_on_profile?: boolean
}) {
  const updates: Record<string, unknown> = { stage, ...extras }

  if (stage === 'accepted') updates.accepted_at = new Date().toISOString()
  if (stage === 'completed') updates.completed_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('case_pipeline')
    .update(updates)
    .eq('id', pipelineId)
    .select()
    .single()
  return { data, error }
}

export async function withdrawOffer(pipelineId: string) {
  const { data, error } = await supabase
    .from('case_pipeline')
    .update({ stage: 'withdrawn' })
    .eq('id', pipelineId)
    .select()
    .single()
  return { data, error }
}

export async function acceptOffer(pipelineId: string, caseId: string) {
  const { data: existingPipeline, error: existingErr } = await supabase
    .from('case_pipeline')
    .select('id, case_id, lawyer_id, offer_amount')
    .eq('id', pipelineId)
    .maybeSingle()

  if (existingErr) return { data: null, error: existingErr }
  if (!existingPipeline) return { data: null, error: new Error('Offer not found.') }

  const { data: caseRow, error: caseReadErr } = await supabase
    .from('cases')
    .select('id, title, citizen_id')
    .eq('id', caseId)
    .maybeSingle()

  if (caseReadErr) return { data: null, error: caseReadErr }

  // Accept the offer
  const { data, error } = await supabase
    .from('case_pipeline')
    .update({
      stage: 'accepted',
      accepted_at: new Date().toISOString()
    })
    .eq('id', pipelineId)
    .select()
    .single()

  if (error) return { data, error }

  // Any other pending offers for this case are auto-withdrawn once one offer is accepted.
  await supabase
    .from('case_pipeline')
    .update({ stage: 'withdrawn' })
    .eq('case_id', caseId)
    .eq('stage', 'offered')
    .neq('id', pipelineId)

  // Update case status
  await supabase
    .from('cases')
    .update({
      status: 'lawyer_matched',
      lawyer_matched_at: new Date().toISOString(),
      is_seeking_lawyer: false,
    })
    .eq('id', caseId)

  if (existingPipeline.lawyer_id && caseRow) {
    const amount = existingPipeline.offer_amount
      ? ` (Offer: INR ${existingPipeline.offer_amount.toLocaleString('en-IN')})`
      : ''

    await createNotification({
      user_id: existingPipeline.lawyer_id,
      type: 'offer_accepted',
      title: 'Your offer was accepted',
      body: `${caseRow.title ?? 'A case'} has accepted your offer${amount}.`,
      data: {
        case_id: caseRow.id,
        pipeline_id: pipelineId,
      },
    })
  }

  return { data, error }
}

export async function acceptAvailableCase(caseId: string, lawyerId: string, note?: string) {
  // Prevent duplicate assignment (best-effort; DB should enforce if desired)
  const { data: existing, error: existingErr } = await supabase
    .from('case_pipeline')
    .select('id')
    .eq('case_id', caseId)
    .limit(1)

  if (existingErr) return { data: null, error: existingErr }
  if (existing && existing.length > 0) {
    return { data: null, error: new Error('This case has already been picked up.') }
  }

  const { data: caseRow, error: caseReadErr } = await supabase
    .from('cases')
    .select('id, title, citizen_id')
    .eq('id', caseId)
    .maybeSingle()

  if (caseReadErr || !caseRow) {
    return { data: null, error: caseReadErr || new Error('Case not found.') }
  }

  const { data, error } = await supabase
    .from('case_pipeline')
    .insert({
      case_id: caseId,
      lawyer_id: lawyerId,
      stage: 'accepted',
      accepted_at: new Date().toISOString(),
      offer_note: note ?? 'Lawyer picked up this available case.',
    })
    .select()
    .single()

  if (error) return { data, error }

  await supabase
    .from('cases')
    .update({
      status: 'lawyer_matched',
      lawyer_matched_at: new Date().toISOString(),
      is_seeking_lawyer: false,
    })
    .eq('id', caseId)

  if (caseRow.citizen_id) {
    await createNotification({
      user_id: caseRow.citizen_id,
      type: 'offer_accepted',
      title: 'Lawyer matched for your case',
      body: `A lawyer has accepted your case: ${caseRow.title ?? 'Untitled'}.`,
      data: {
        case_id: caseId,
        pipeline_id: data?.id,
        lawyer_id: lawyerId
      }
    })
  }

  return { data, error }
}

export async function getCasePipelineForCitizen(caseId: string) {
  const { data, error } = await supabase
    .from('case_pipeline')
    .select(`
      *,
      lawyer_profiles (
        id,
        full_name,
        profile_photo_url,
        avg_rating,
        experience_years,
        specialisations,
        practice_state,
        fee_min,
        fee_max
      )
    `)
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function getPendingOffersCount(caseIds: string[]) {
  if (caseIds.length === 0) return { data: {}, error: null }

  const { data, error } = await supabase
    .from('case_pipeline')
    .select('case_id')
    .in('case_id', caseIds)
    .eq('stage', 'offered')

  if (error) return { data: null, error }

  const counts: Record<string, number> = {}
  data.forEach(row => {
    counts[row.case_id] = (counts[row.case_id] || 0) + 1
  })

  return { data: counts, error: null }
}
