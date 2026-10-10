'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DeveloperNav } from '@/components/developer/DeveloperNav';
import { CreateKeyModal } from '@/components/developer/CreateKeyModal';
import { useAuth } from '@/lib/supabase/auth-context';
import { ApiKeyRecord } from '@/lib/developer/types';
import {
  KeyRound,
  ShieldAlert,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  Loader2,
  Calendar,
  Lock,
} from 'lucide-react';

export default function ApiKeysPage() {
  const { workspace, loading: authLoading } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevokeKey, setConfirmRevokeKey] = useState<ApiKeyRecord | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const workspaceId = workspace?.id || 'ws-demo-01';

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/developer/keys?workspace_id=${workspaceId}`);
      if (res.ok) {
        const json = await res.json();
        setKeys(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch keys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchKeys();
    }
  }, [authLoading, workspaceId]);

  const handleRevoke = async (keyId: string) => {
    setRevokingId(keyId);
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/v1/developer/keys/${keyId}?workspace_id=${workspaceId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        throw new Error('Failed to revoke API key');
      }
      setFeedback({ type: 'success', message: 'API key revoked immediately.' });
      setConfirmRevokeKey(null);
      await fetchKeys();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'An error occurred while revoking the key.',
      });
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 text-left max-w-5xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              API Keys Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Create and manage authentication keys to integrate your AI assistants into custom applications.
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Create New Secret Key</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <DeveloperNav onCreateKey={() => setModalOpen(true)} />

        {/* Security Best Practice Notice */}
        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong className="font-bold">Protect your live keys:</strong> Never expose your
            <code className="font-mono text-amber-950 font-bold mx-1">bs_live_</code> keys in
            browser bundles or client-side JavaScript. For public website chat, use our
            <a href="/chatbots" className="underline font-semibold ml-1 hover:text-amber-950">
              embeddable widget
            </a>
            .
          </div>
        </div>

        {feedback && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-medium border flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Keys Table Card */}
        <div className="bg-white border border-[#E6EBF2] rounded-3xl shadow-subtle overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Active & Revoked Keys</h2>
            <span className="text-xs text-slate-400 font-semibold">
              {keys.length} {keys.length === 1 ? 'key' : 'keys'}
            </span>
          </div>

          {loading ? (
            <div className="min-h-[220px] flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          ) : keys.length === 0 ? (
            <div className="py-16 text-center">
              <KeyRound className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No API keys yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Generate an API key to authenticate requests from your backend server.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                + Create Key
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/60 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Key Prefix</th>
                    <th className="px-6 py-3.5">Environment</th>
                    <th className="px-6 py-3.5">Created</th>
                    <th className="px-6 py-3.5">Last Used</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {keys.map((k) => (
                    <tr
                      key={k.id}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        k.revoked_at ? 'opacity-60 bg-slate-50/30' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{k.name}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-slate-600 whitespace-nowrap">
                        {k.key_prefix}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            k.environment === 'live'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {k.environment}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(k.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {k.last_used_at ? (
                          <span className="flex items-center gap-1 text-slate-700 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(k.last_used_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Never used</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {k.revoked_at ? (
                          <span className="text-[11px] font-bold text-rose-600">
                            Revoked
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmRevokeKey(k)}
                            className="px-2.5 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Revocation Confirmation Dialog */}
      {confirmRevokeKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-left">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Revoke API Key?
                </h3>
                <p className="text-xs text-slate-500">{confirmRevokeKey.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to revoke this API key? Any applications or integrations using
              this key will <strong>immediately receive 401 Unauthorized errors</strong>. This action
              cannot be undone.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmRevokeKey(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={revokingId === confirmRevokeKey.id}
                onClick={() => handleRevoke(confirmRevokeKey.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {revokingId === confirmRevokeKey.id ? 'Revoking...' : 'Yes, Revoke Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateKeyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => fetchKeys()}
        workspaceId={workspaceId}
      />
    </DashboardLayout>
  );
}
