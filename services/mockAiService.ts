// services/mockAiService.ts

export interface MockAiAnalysisResult {
  estimatedDosePpmH: number;
  colourFeatures: {
    meanRgb: [number, number, number];
    meanHsv: [number, number, number];
  };
}

/**
 * Simulates analyzing an image of a dosimeter and returning exposure data.
 */
export async function analyzeDosimeterImage(_base64Image: string): Promise<MockAiAnalysisResult> {
  // Simulate network delay for AI processing
  await new Promise((resolve) => setTimeout(resolve, 2000));
  
  // Random dose between 0 and 100 for demonstration purposes
  const dose = Math.floor(Math.random() * 100);

  return {
    estimatedDosePpmH: dose,
    colourFeatures: {
      meanRgb: [Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)],
      meanHsv: [Math.floor(Math.random() * 360), Math.floor(Math.random() * 100), Math.floor(Math.random() * 100)],
    }
  };
}
