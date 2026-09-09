'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Cloud,
  Sun,
  CloudRain,
  CloudLightning,
  Wind,
  Droplets,
  Thermometer,
  RefreshCw,
  MapPin,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface WeatherDay {
  date: string;
  tempMax: number;
  tempMin: number;
  humidity: number;
  windSpeed: number;
  code: number;
  isToday?: boolean;
}

interface CurrentWeather {
  temp: number;
  humidity: number;
  windSpeed: number;
  code: number;
}

function getWeatherMeta(code: number): { label: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> } {
  if (code === 0) return { label: 'Clear Sky', icon: Sun };
  if (code <= 3) return { label: 'Partly Cloudy', icon: Cloud };
  if (code <= 48) return { label: 'Foggy / Haze', icon: Cloud };
  if (code <= 57) return { label: 'Light Drizzle', icon: CloudRain };
  if (code <= 67) return { label: 'Rain', icon: CloudRain };
  if (code <= 82) return { label: 'Rain Showers', icon: CloudRain };
  if (code >= 90) return { label: 'Thunderstorm', icon: CloudLightning };
  return { label: 'Overcast', icon: Cloud };
}

function formatDateLabel(isoDate: string, isToday?: boolean): string {
  if (isToday) return 'Today';
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return isoDate;
  }
}

export function WeatherAnalyticsCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [days, setDays] = useState<WeatherDay[]>([]);
  const [locationName, setLocationName] = useState<string>('Factory Vicinity');

  const fetchWeather = useCallback(async (latitude: number, longitude: number) => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,wind_speed_10m_max,weather_code&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&past_days=3&forecast_days=1&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Weather service returned ${res.status}`);
      const data = await res.json();

      if (data.current) {
        setCurrent({
          temp: Math.round(data.current.temperature_2m * 10) / 10,
          humidity: Math.round(data.current.relative_humidity_2m),
          windSpeed: Math.round(data.current.wind_speed_10m * 10) / 10,
          code: data.current.weather_code,
        });
      }

      if (data.daily && data.daily.time) {
        const parsedDays: WeatherDay[] = data.daily.time.map((timeStr: string, idx: number) => {
          const isToday = idx === data.daily.time.length - 1;
          return {
            date: timeStr,
            tempMax: Math.round(data.daily.temperature_2m_max[idx] * 10) / 10,
            tempMin: Math.round(data.daily.temperature_2m_min[idx] * 10) / 10,
            humidity: Math.round(data.daily.relative_humidity_2m_mean[idx]),
            windSpeed: Math.round(data.daily.wind_speed_10m_max[idx] * 10) / 10,
            code: data.daily.weather_code[idx],
            isToday,
          };
        });
        setDays(parsedDays);
      }

      if (data.timezone) {
        const cleanZone = data.timezone.replace('_', ' ').split('/').pop() || data.timezone;
        setLocationName(`${cleanZone} Area`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load weather data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser or device.');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetchWeather(latitude, longitude);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError('Location permission was denied. Click "Detect Device Location" to grant permission for atmospheric analysis.');
        } else {
          // Fallback coordinates (industrial sector)
          const defaultLat = 13.0827;
          const defaultLon = 80.2707;
          setLocationName('Industrial Sector (Default)');
          fetchWeather(defaultLat, defaultLon);
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }, [fetchWeather]);

  useEffect(() => {
    // Automatically request location and weather on mount
    requestLocation();
  }, [requestLocation]);

  // H2S Analytical Insight calculation
  const latestHumidity = current?.humidity ?? (days.length > 0 ? days[days.length - 1].humidity : 60);
  const latestWind = current?.windSpeed ?? (days.length > 0 ? days[days.length - 1].windSpeed : 10);

  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.12)', color: 'var(--color-accent)'
            }}>
              <Cloud size={16} />
            </span>
            <h3 style={{ fontSize: '1.0625rem', margin: 0, fontWeight: 700 }}>
              Factory Ambient Weather & H₂S Dispersion
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Past 3-Day Atmospheric Data from Device Location ({locationName})
          </p>
        </div>

        <button
          onClick={requestLocation}
          disabled={loading}
          className="btn btn-outline btn-sm"
          style={{ gap: '0.375rem', fontSize: '0.8125rem', height: '32px' }}
          title="Detect or refresh device weather"
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh Device Weather'}
        </button>
      </div>

      {/* Permission or error prompt */}
      {error && (
        <div className="alert alert-warning" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
          <button
            onClick={requestLocation}
            className="btn btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', height: 'auto', background: 'var(--color-accent)', color: '#fff' }}
          >
            <MapPin size={12} style={{ marginRight: 3 }} /> Allow Location
          </button>
        </div>
      )}

      {/* Current conditions highlight */}
      {current && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1rem',
          padding: '0.875rem',
          background: 'var(--color-surface-2)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Thermometer size={13} /> Current Temp
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {current.temp}°C
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Droplets size={13} /> Humidity
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {current.humidity}%
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Wind size={13} /> Wind Velocity
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {current.windSpeed} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>km/h</span>
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={13} color="var(--color-green)" /> Conditions
            </span>
            <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-accent)' }}>
              {getWeatherMeta(current.code).label}
            </span>
          </div>
        </div>
      )}

      {/* Past 3 Days History Cards */}
      {days.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
            Past 3 Days Environmental Record
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '0.625rem',
          }}>
            {days.map((d) => {
              const meta = getWeatherMeta(d.code);
              const IconComponent = meta.icon;
              return (
                <div
                  key={d.date}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: d.isToday ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                    background: d.isToday ? 'rgba(56, 189, 248, 0.05)' : 'var(--color-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.375rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: d.isToday ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                      {formatDateLabel(d.date, d.isToday)}
                    </span>
                    <IconComponent size={16} style={{ color: d.isToday ? 'var(--color-accent)' : 'var(--color-text-muted)' }} />
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Temp Range</span>
                    <span style={{ fontWeight: 600 }}>{d.tempMin}° - {d.tempMax}°C</span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Avg Humidity</span>
                    <span style={{ fontWeight: 600 }}>{d.humidity}%</span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Max Wind</span>
                    <span style={{ fontWeight: 600 }}>{d.windSpeed} km/h</span>
                  </div>

                  <div style={{
                    fontSize: '0.6875rem',
                    color: 'var(--color-text-muted)',
                    marginTop: '0.25rem',
                    paddingTop: '0.25rem',
                    borderTop: '1px dashed var(--color-border)',
                    textAlign: 'center'
                  }}>
                    {meta.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Industrial H2S Environmental Dispersion Insight */}
      <div style={{
        padding: '0.75rem 0.875rem',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(56, 189, 248, 0.06)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.625rem',
      }}>
        <Info size={16} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: '0.75rem', lineHeight: '1.4', color: 'var(--color-text-secondary)' }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Factory Air Dispersion Analysis: </strong>
          {latestHumidity > 70 ? (
            <span>High ambient humidity ({latestHumidity}%) accelerates chemical reaction rates on passive sensing strips. Ensure dosimeter strips are kept sealed until deployment.</span>
          ) : (
            <span>Moderate atmospheric moisture ({latestHumidity}%) provides optimal chemical tape sensitivity without condensation artifacts.</span>
          )}{' '}
          {latestWind < 6 ? (
            <span>Light airflow ({latestWind} km/h) indicates potential stagnant zones; maintain forced exhaust ventilation in confined low-lying work bays.</span>
          ) : (
            <span>Active cross-ventilation ({latestWind} km/h) aids atmospheric H₂S dispersion outdoors.</span>
          )}
        </div>
      </div>
    </div>
  );
}
