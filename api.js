// js/api.js
// Small helper API that talks to your Supabase DB.
// Exposes functions on window.api so existing scripts can call them.

import { sb } from './supabaseClient.js'

async function listConsultants() {
  const { data, error } = await sb.from('consultants').select('*').order('name')
  if (error) throw error
  return data
}

async function createConsultant(name) {
  const { data, error } = await sb.from('consultants').insert({ name }).select().single()
  if (error) throw error
  return data
}

async function deleteConsultant(id) {
  const { error } = await sb.from('consultants').delete().eq('id', id)
  if (error) throw error
}

async function listProjects() {
  const { data, error } = await sb.from('projects').select('*').order('name')
  if (error) throw error
  return data
}

async function upsertAllocation({ consultantId, projectId, periodStart, periodType, percent }) {
  const { data, error } = await sb.from('allocations').upsert({
    consultant_id: consultantId,
    project_id: projectId,
    period_start: periodStart,
    period_type: periodType,
    percent
  }).select().single()
  if (error) throw error
  return data
}

async function queryAllocations({ consultantId, periodType, start, end }) {
  const { data, error } = await sb
    .from('allocations')
    .select('*, consultants(*), projects(*)')
    .eq('consultant_id', consultantId)
    .eq('period_type', periodType)
    .gte('period_start', start)
    .lte('period_start', end)
  if (error) throw error
  return data
}

// make available to non-module scripts like script.js
window.api = {
  listConsultants,
  createConsultant,
  deleteConsultant,
  listProjects,
  upsertAllocation,
  queryAllocations
}

export {
  listConsultants,
  createConsultant,
  deleteConsultant,
  listProjects,
  upsertAllocation,
  queryAllocations
}
