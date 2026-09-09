'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import {
  getPendingScanApprovals,
  getReviewedScanApprovals,
  approveScanRequest,
  rejectScanRequest,
} from '@/services/exposureService';
import { ScanApprovalRequest } from '@/types/exposure';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ClipboardCheck, Check, X, Clock, User, Calendar,
  ShieldCheck, AlertTriangle, RefreshCw, Eye, History, CloudSun
} from 'lucide-react';
import { formatDose, formatDuration, formatAvgExposure } from '@/lib/utils/formatting';
import { formatDateTime, timeAgo } from '@/lib/utils/date';
import { DoseLevelBadge, DosimeterBadge } from '@/components/ui/Badge';

export default function ApprovalsPage() {
  const { user, displayName } = useAuthContext();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const [pendingRequests, setPendingRequests] = useState<ScanApprovalRequest[]>([]);
  const [historyRequests, setHistoryRequests] = useState<ScanApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setFeedbackMessage(null);
    try {
      const [pending, history] = await Promise.all([
        getPendingScanApprovals(),
        getReviewedScanApprovals(50),
      ]);
      setPendingRequests(pending);
      setHistoryRequests(history);
    } catch (error) {
      console.error('Failed to load scan approval requests', error);
      setFeedbackMessage({ type: 'error', text: 'Failed to load scan approval requests. Please refresh.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApprove = async (request: ScanApprovalRequest) => {
    if (!user) return;
    setProcessingId(request.id);
    setFeedbackMessage(null);
    try {
      const managerName = displayName || 'Manager';
      const remark = remarks[request.id] || '';
      await approveScanRequest(request.id, user.uid, managerName, remark);

      // Remove from pending, add to history
      const approvedRequest: ScanApprovalRequest = {
        ...request,
        status: 'approved',
        remarks: remark,
        reviewedByUid: user.uid,
        reviewedByName: managerName,
        reviewedAt: new Date(),
      };

      setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
      setHistoryRequests((prev) => [approvedRequest, ...prev]);
      setRemarks((prev) => {
        const next = { ...prev };
        delete next[request.id];
        return next;
      });

      setFeedbackMessage({
        type: 'success',
        text: `Scan for ${request.targetWorkerName} (${request.targetWorkerPublicId}) approved successfully! Record has been committed to their dashboard.`,
      });
    } catch (error) {
      console.error('Failed to approve scan', error);
      setFeedbackMessage({ type: 'error', text: 'Failed to approve scan request. Please try again.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: ScanApprovalRequest) => {
    if (!user) return;
    const remark = (remarks[request.id] || '').trim();
    if (!remark) {
      alert('Please enter a rejection reason or remark before rejecting.');
      return;
    }

    setProcessingId(request.id);
    setFeedbackMessage(null);
    try {
      const managerName = displayName || 'Manager';
      await rejectScanRequest(request.id, user.uid, managerName, remark);

      const rejectedRequest: ScanApprovalRequest = {
        ...request,
        status: 'rejected',
        rejectionReason: remark,
        remarks: remark,
        reviewedByUid: user.uid,
        reviewedByName: managerName,
        reviewedAt: new Date(),
      };

      setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
      setHistoryRequests((prev) => [rejectedRequest, ...prev]);
      setRemarks((prev) => {
        const next = { ...prev };
        delete next[request.id];
        return next;
      });

      setFeedbackMessage({
        type: 'success',
        text: `Scan request for ${request.targetWorkerName} has been rejected.`,
      });
    } catch (error) {
      console.error('Failed to reject scan', error);
      setFeedbackMessage({ type: 'error', text: 'Failed to reject scan request. Please try again.' });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 0.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Worker Scan Approvals
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Review dosimeter scans submitted by peer workers. All submission, approval, and rejection timestamps are permanently audited.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={handleRefresh}
          disabled={loading || refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: '1.5rem',
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'pending' ? '2.5px solid var(--color-accent)' : '2.5px solid transparent',
            color: activeTab === 'pending' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Clock size={16} />
          <span>Pending Approvals</span>
          {pendingRequests.length > 0 && (
            <span style={{
              background: 'var(--color-amber)',
              color: '#000',
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '1px 7px',
              borderRadius: 999,
            }}>
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'history' ? '2.5px solid var(--color-accent)' : '2.5px solid transparent',
            color: activeTab === 'history' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <History size={16} />
          <span>Reviewed History</span>
          {historyRequests.length > 0 && (
            <span style={{
              background: 'var(--color-surface-2)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '1px 7px',
              borderRadius: 999,
            }}>
              {historyRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div
          className={feedbackMessage.type === 'success' ? 'alert alert-success' : 'alert alert-danger'}
          style={{ marginBottom: '1.25rem' }}
        >
          {feedbackMessage.type === 'success' ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem 0' }}>
          <LoadingSpinner size={32} />
        </div>
      ) : activeTab === 'pending' ? (
        /* PENDING REQUESTS TAB */
        pendingRequests.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No Pending Approvals"
            description="All worker-to-worker dosimeter scans have been reviewed. When workers scan watches for their peers, requests will appear here."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="card"
                style={{
                  padding: '1.5rem',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                {/* Header: Scanner & Target Worker Identification */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  paddingBottom: '1rem',
                  borderBottom: '1px solid var(--color-border)',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--color-amber)',
                        background: 'rgba(245, 158, 11, 0.12)',
                        padding: '2px 8px',
                        borderRadius: 4,
                      }}>
                        Awaiting Manager Review
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Submitted {timeAgo(req.scanTimestamp || req.createdAt)}
                      </span>
                    </div>

                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                      {req.targetWorkerName} <span style={{ color: 'var(--color-accent)', fontFamily: 'monospace' }}>({req.targetWorkerPublicId})</span>
                    </h2>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-secondary)',
                      marginTop: '0.25rem',
                    }}>
                      <User size={14} style={{ color: 'var(--color-accent)' }} />
                      <span>
                        Scanned & Submitted by peer: <strong>{req.scannerName}</strong> ({req.scannerWorkerId || 'Worker'})
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      marginTop: '0.2rem',
                    }}>
                      <Calendar size={13} />
                      <span>
                        Submission Time: <strong>{formatDateTime(req.scanTimestamp || req.createdAt)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Dose Metric Highlights */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.125rem' }}>
                      Estimated H₂S Dose
                    </div>
                    <div style={{
                      fontSize: '1.75rem',
                      fontWeight: 800,
                      color: 'var(--color-amber)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                    }}>
                      {formatDose(req.estimatedDosePpmH)} <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>ppm·h</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <DoseLevelBadge ppmH={req.estimatedDosePpmH} />
                      {req.expiryStatus && <DosimeterBadge status={req.expiryStatus === 'EXPIRED' ? 'expired' : 'valid'} />}
                    </div>
                  </div>
                </div>

                {/* Body: Photo & Chemical Measurements */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: req.imageUrl ? '180px 1fr' : '1fr',
                  gap: '1.25rem',
                  alignItems: 'center',
                }}>
                  {req.imageUrl && (
                    <div style={{ position: 'relative' }}>
                      <div
                        style={{
                          width: '100%',
                          height: 140,
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          background: '#000',
                          border: '1px solid var(--color-border)',
                          cursor: 'pointer',
                        }}
                        onClick={() => setModalImage(req.imageUrl)}
                        title="Click to view full photo"
                      >
                        <img
                          src={req.imageUrl}
                          alt="Watch Dosimeter Photo"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setModalImage(req.imageUrl)}
                        style={{
                          position: 'absolute',
                          bottom: 6,
                          right: 6,
                          background: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          padding: '2px 6px',
                          fontSize: '0.6875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          cursor: 'pointer',
                        }}
                      >
                        <Eye size={12} /> View
                      </button>
                    </div>
                  )}

                  {/* Scan Parameters Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '0.75rem',
                    background: 'var(--color-surface-2)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>
                        Chemical Darkening
                      </span>
                      <strong style={{
                        fontSize: '0.9375rem',
                        color: req.colorChangePercent > 30 ? 'var(--color-amber)' : 'var(--color-text-primary)'
                      }}>
                        {req.colorChangePercent}% darkened
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>
                        Monitoring Duration
                      </span>
                      <strong style={{ fontSize: '0.9375rem' }}>
                        {formatDuration(req.monitoringDuration)}
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>
                        Shift
                      </span>
                      <strong style={{ fontSize: '0.9375rem', textTransform: 'capitalize' }}>
                        {req.shift} shift
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>
                        Estimated Avg
                      </span>
                      <strong style={{ fontSize: '0.9375rem' }}>
                        {formatAvgExposure(req.estimatedAverageExposure)}
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>
                        Ambient Conditions
                      </span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CloudSun size={13} style={{ color: 'var(--color-accent)' }} />
                        {req.temperature !== undefined ? `${req.temperature}°C · ${req.humidity}% RH` : 'Recorded normal'}
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>
                        Printed Strip Expiry
                      </span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                        {req.detectedExpiryDate || '08/09/2026'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer: Manager Remarks & Action Buttons */}
                <div style={{
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}>
                  <div>
                    <label style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      display: 'block',
                      marginBottom: '0.35rem',
                    }}>
                      Manager Review Remarks (Mandatory for rejection):
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Verified chemical colorimetric indicator darkening. Exposure approved."
                      value={remarks[req.id] || ''}
                      onChange={(e) => setRemarks({ ...remarks, [req.id]: e.target.value })}
                      disabled={processingId === req.id}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => handleReject(req)}
                      disabled={processingId === req.id}
                      style={{
                        color: 'var(--color-red)',
                        borderColor: 'rgba(239, 68, 68, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <X size={16} />
                      <span>{processingId === req.id ? 'Processing...' : 'Reject Scan'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleApprove(req)}
                      disabled={processingId === req.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <Check size={16} />
                      <span>{processingId === req.id ? 'Approving...' : 'Approve & Save to Dashboard'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* REVIEWED HISTORY TAB */
        historyRequests.length === 0 ? (
          <EmptyState
            icon={History}
            title="No Approval History"
            description="Reviewed scan requests will appear here, documenting exact submission and approval/rejection timestamps."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {historyRequests.map((req) => {
              const isApproved = req.status === 'approved';
              return (
                <div
                  key={req.id}
                  className="card"
                  style={{
                    padding: '1.25rem',
                    borderLeft: `4px solid ${isApproved ? 'var(--color-green)' : 'var(--color-red)'}`,
                    background: 'var(--color-surface)',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    marginBottom: '0.75rem',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: isApproved ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: isApproved ? 'var(--color-green)' : 'var(--color-red)',
                        }}>
                          {req.status.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          ID: {req.id.slice(0, 8)}...
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                        Target Worker: {req.targetWorkerName} <span style={{ color: 'var(--color-accent)', fontFamily: 'monospace' }}>({req.targetWorkerPublicId})</span>
                      </h3>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0.2rem 0 0 0' }}>
                        Scanned & Submitted by peer: <strong>{req.scannerName}</strong>
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        {formatDose(req.estimatedDosePpmH)} ppm·h
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        display: 'block',
                      }}>
                        {req.colorChangePercent}% chemical darkening
                      </span>
                    </div>
                  </div>

                  {/* Timestamps Auditing Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '0.75rem',
                    background: 'var(--color-surface-2)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8125rem',
                    border: '1px solid var(--color-border)',
                  }}>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>
                        Submitted When
                      </span>
                      <strong>{formatDateTime(req.scanTimestamp || req.createdAt)}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>
                        {isApproved ? 'Approved When' : 'Rejected When'}
                      </span>
                      <strong style={{ color: isApproved ? 'var(--color-green)' : 'var(--color-red)' }}>
                        {req.reviewedAt ? formatDateTime(req.reviewedAt) : 'Recorded'}
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>
                        Reviewed By
                      </span>
                      <strong>{req.reviewedByName || 'Manager'}</strong>
                    </div>

                    {req.remarks && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', display: 'block' }}>
                          Manager Remarks
                        </span>
                        <span style={{ fontStyle: 'italic', color: 'var(--color-text-primary)' }}>
                          &ldquo;{req.remarks}&rdquo;
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Image Zoom Modal */}
      {modalImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setModalImage(null)}
        >
          <div
            style={{
              maxWidth: 700,
              width: '100%',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--color-border)'
            }}>
              <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Dosimeter Watch Photo</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setModalImage(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '1rem', textAlign: 'center', background: '#000' }}>
              <img
                src={modalImage}
                alt="Enlarged Dosimeter Watch"
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
