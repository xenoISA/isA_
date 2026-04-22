/**
 * useProjects — Fetch and manage projects (#191)
 * Connects to isA_user project CRUD API (#258)
 */
import { useState, useEffect, useCallback } from 'react';
import { GATEWAY_ENDPOINTS, getAuthHeaders } from '../config/gatewayConfig';

export interface Project {
  id: string;
  name: string;
  description?: string;
  custom_instructions?: string;
  created_at?: string;
  updated_at?: string;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('isa_active_project') || null;
  });
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${GATEWAY_ENDPOINTS.MODELS.BASE}`.replace('/models', '/projects'), {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const selectProject = useCallback((id: string | null) => {
    setActiveProjectId(id);
    try {
      if (id) localStorage.setItem('isa_active_project', id);
      else localStorage.removeItem('isa_active_project');
    } catch {}
  }, []);

  const createProject = useCallback(async (name: string, description?: string) => {
    try {
      const res = await fetch(`${GATEWAY_ENDPOINTS.MODELS.BASE}`.replace('/models', '/projects'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) {
        const project = await res.json();
        setProjects(prev => [project, ...prev]);
        return project;
      }
    } catch {}
    return null;
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    try {
      await fetch(`${GATEWAY_ENDPOINTS.MODELS.BASE}`.replace('/models', `/projects/${id}`), {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      setProjects(prev => prev.filter(p => p.id !== id));
      if (activeProjectId === id) setActiveProjectId(null);
    } catch {}
  }, [activeProjectId]);

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  return { projects, activeProject, activeProjectId, selectProject, createProject, deleteProject, loading, refresh: fetchProjects };
}
