// lib/utils/environmental.ts
// ============================================================
// ENVIRONMENTAL ACQUISITION & COMPENSATION MODULE
// ============================================================
// Obtains real-time device ambient conditions (temp, humidity, location)
// and calculates prototype environmental correction factors for
// passive H2S dosimeter colorimetric sensing strips.
// ============================================================

export interface EnvironmentalData {
  temperature: number; // in °C
  humidity: number; // in %
  location: string;
  weather: string;
  environmentalCorrection: number; // Multiplicative compensation factor
  capturedAt: Date;
}

const DEFAULT_ENVIRONMENTAL: EnvironmentalData = {
  temperature: 25.0,
  humidity: 50.0,
  location: 'Factory Work Bay',
  weather: 'Controlled Ambient',
  environmentalCorrection: 1.0,
  capturedAt: new Date(),
};

/**
 * Calculate prototype environmental correction factor.
 * Reference baseline: 25°C, 50% Relative Humidity.
 * NOTE: This is a structured prototype model to be replaced by
 * validated laboratory chemical calibration curves.
 */
export function calculateEnvironmentalCorrection(temp: number, humidity: number): number {
  const refTemp = 25.0;
  const refHumidity = 50.0;

  // Temperature effect on gas diffusion rate (~0.2% per °C)
  const tempCorrection = 1 + (temp - refTemp) * 0.002;

  // Humidity effect on colorimetric substrate tape moisture (~0.1% per % RH)
  const humidityCorrection = 1 + (humidity - refHumidity) * 0.001;

  const combined = tempCorrection * humidityCorrection;
  // Bound correction factor between 0.85 and 1.25 for safety
  return Math.min(1.25, Math.max(0.85, parseFloat(combined.toFixed(4))));
}

/**
 * Acquire live environmental parameters from browser geolocation and Open-Meteo API.
 * Falls back gracefully to default ambient conditions without blocking the user.
 */
export async function acquireLiveEnvironmentalData(): Promise<EnvironmentalData> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return { ...DEFAULT_ENVIRONMENTAL, capturedAt: new Date() };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;
          const res = await fetch(url);
          if (!res.ok) throw new Error('Weather API unavailable');
          const data = await res.json();

          const temp = data.current ? parseFloat(data.current.temperature_2m.toFixed(1)) : 25.0;
          const hum = data.current ? Math.round(data.current.relative_humidity_2m) : 50;
          const loc = data.timezone ? data.timezone.replace('_', ' ').split('/').pop() || 'Factory Location' : 'Factory Location';
          
          let weatherDesc = 'Normal Ambient';
          const code = data.current?.weather_code ?? 0;
          if (code === 0) weatherDesc = 'Clear Sky';
          else if (code <= 3) weatherDesc = 'Partly Cloudy';
          else if (code <= 48) weatherDesc = 'Foggy / Hazy';
          else if (code <= 67) weatherDesc = 'Rain / Damp';
          else if (code >= 90) weatherDesc = 'Storm Conditions';

          const correction = calculateEnvironmentalCorrection(temp, hum);

          resolve({
            temperature: temp,
            humidity: hum,
            location: `${loc} Industrial Area`,
            weather: weatherDesc,
            environmentalCorrection: correction,
            capturedAt: new Date(),
          });
        } catch {
          resolve({ ...DEFAULT_ENVIRONMENTAL, capturedAt: new Date() });
        }
      },
      () => {
        // Geolocation denied or timed out — return default ambient
        resolve({ ...DEFAULT_ENVIRONMENTAL, capturedAt: new Date() });
      },
      { timeout: 6000, enableHighAccuracy: false }
    );
  });
}
