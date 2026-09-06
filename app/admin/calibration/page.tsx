'use client';
// app/(admin)/calibration/page.tsx
import { useState, useEffect } from 'react';
import { DEMO_CALIBRATION_MODEL } from '@/config/calibrationModel';
import { CalibrationModel } from '@/types/calibration';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/firestore';
import { useAuthContext } from '@/context/AuthContext';
import { writeAuditLog } from '@/services/auditLogService';
import { formatDateTime } from '@/lib/utils/date';
import { LoadingSpinner } from '@/components/ui/LoadingScreen';
import { AlertCircle, CheckCircle, Info, Sliders } from 'lucide-react';

export default function CalibrationPage() {
  const { user, displayName } = useAuthContext();
  const [model, setModel] = useState<CalibrationModel>(DEMO_CALIBRATION_MODEL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getDoc(doc(db, COLLECTIONS.CALIBRATION_MODELS, 'active')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setModel({ ...DEMO_CALIBRATION_MODEL, ...data });
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await setDoc(doc(db, COLLECTIONS.CALIBRATION_MODELS, 'active'), {
        ...model,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      await writeAuditLog({
        actorId: user.uid,
        actorName: displayName ?? 'Admin',
        role: 'admin',
        action: 'calibration_updated',
        details: { modelVersion: model.modelVersion },
      });
      setSaved(true);
    } catch {
      setError('Failed to save calibration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateCoef = (key: string, val: number) => {
    setModel((m) => ({ ...m, coefficients: { ...m.coefficients, [key]: val } }));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <LoadingSpinner size={24} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dosimeter Calibration</h1>
        <p>Configure the colour-to-dose estimation model parameters</p>
      </div>

      {/* Important disclaimer */}
      <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
        <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Calibration Model Status: {model.validationStatus}</strong>
          <br />
          {model.description}
          <br />
          Changes to calibration parameters affect all future dose estimations. Ensure values are derived from validated sensing chemistry data before use in occupational health decisions.
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {saved && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          <CheckCircle size={16} style={{ flexShrink: 0 }} />
          <span>Calibration configuration saved successfully.</span>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {/* Model Identity */}
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Model Identity</h3>
          <div className="two-col" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="input-label">Model Version</label>
              <input type="text" className="input"
                value={model.modelVersion}
                onChange={(e) => setModel((m) => ({ ...m, modelVersion: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="input-label">Validation Status</label>
              <select className="input"
                value={model.validationStatus}
                onChange={(e) => setModel((m) => ({ ...m, validationStatus: e.target.value as CalibrationModel['validationStatus'] }))}>
                <option value="UNVALIDATED_DEMO">UNVALIDATED_DEMO</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="VALIDATED">VALIDATED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Linear Model Coefficients */}
        <div className="card">
          <h3 style={{ marginBottom: '0.375rem', fontSize: '1rem' }}>Linear Model Coefficients</h3>
          <p style={{ fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
            Dose (ppm·h) = intercept + (meanRed × R) + (meanGreen × G) + (meanBlue × B) + (colourDifference × ΔE)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {Object.entries(model.coefficients).map(([key, val]) => (
              <div className="form-group" key={key}>
                <label className="input-label">{key}</label>
                <input type="number" step="0.001" className="input"
                  value={val}
                  onChange={(e) => updateCoef(key, parseFloat(e.target.value) || 0)} />
              </div>
            ))}
          </div>
        </div>

        {/* Warning Thresholds */}
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Exposure Warning Thresholds</h3>
          <div className="two-col" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="input-label">TWA OEL (ppm)</label>
              <input type="number" step="0.1" className="input"
                value={model.warningThresholds.twaOelPpm}
                onChange={(e) => setModel((m) => ({
                  ...m, warningThresholds: { ...m.warningThresholds, twaOelPpm: parseFloat(e.target.value) || 0 }
                }))} />
            </div>
            <div className="form-group">
              <label className="input-label">STEL (ppm)</label>
              <input type="number" step="0.1" className="input"
                value={model.warningThresholds.stelPpm}
                onChange={(e) => setModel((m) => ({
                  ...m, warningThresholds: { ...m.warningThresholds, stelPpm: parseFloat(e.target.value) || 0 }
                }))} />
            </div>
            <div className="form-group">
              <label className="input-label">IDLH Threshold (ppm·h)</label>
              <input type="number" step="1" className="input"
                value={model.warningThresholds.immediatelyDangerousPpmH}
                onChange={(e) => setModel((m) => ({
                  ...m, warningThresholds: { ...m.warningThresholds, immediatelyDangerousPpmH: parseFloat(e.target.value) || 0 }
                }))} />
            </div>
            <div className="form-group">
              <label className="input-label">Dosimeter Validity Period (days)</label>
              <input type="number" step="1" className="input"
                value={model.validityPeriodDays}
                onChange={(e) => setModel((m) => ({ ...m, validityPeriodDays: parseInt(e.target.value) || 30 }))} />
            </div>
          </div>
        </div>

        {/* Temperature Compensation */}
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Environmental Compensation</h3>
          <div className="two-col" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="input-label">Temperature Compensation</label>
              <select className="input"
                value={model.temperatureCompensation.enabled ? 'true' : 'false'}
                onChange={(e) => setModel((m) => ({
                  ...m, temperatureCompensation: { ...m.temperatureCompensation, enabled: e.target.value === 'true' }
                }))}>
                <option value="false">Disabled (prototype)</option>
                <option value="true">Enabled</option>
              </select>
            </div>
            <div className="form-group">
              <label className="input-label">Reference Temperature (°C)</label>
              <input type="number" step="0.5" className="input"
                value={model.temperatureCompensation.referenceTemp}
                onChange={(e) => setModel((m) => ({
                  ...m, temperatureCompensation: { ...m.temperatureCompensation, referenceTemp: parseFloat(e.target.value) || 25 }
                }))} />
            </div>
          </div>
          <div className="alert alert-info" style={{ marginTop: '1rem' }}>
            <Info size={14} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.8125rem' }}>
              Temperature and humidity compensation coefficients require validated kinetics data before enabling.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><LoadingSpinner size={15} /> Saving...</> : <><Sliders size={15} /> Save Calibration</>}
          </button>
          <button className="btn btn-outline" onClick={() => setModel(DEMO_CALIBRATION_MODEL)}>
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
