import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Point {
  x: number; // Grain size (mm) - logarithmic scale
  y: number; // Percent passing (%) - 0-100
}

export interface CurveData {
  id: string;
  name: string;
  points: Point[];
  d10?: number;
  d60?: number;
  extrapolatedD10: boolean;
}

export async function analyzeSieveGraph(imageData: string): Promise<CurveData[]> {
  const prompt = `
    Analyze this image of a sieve analysis graph (siktanalys).
    The image contains one or more curves showing soil particle size distribution.
    
    X-axis: Grain size (kornstorlek) in mm, Logarithmic scale.
    Y-axis: Cumulative percentage passing (passerande), 0-100%.
    
    Your task:
    1. Identify all distinct curves in the graph area.
    2. Look for a table or legend on the same page that identifies the names, levels (depths/elevations), and visual styles (colors/symbols) for each curve.
    3. Extract a set of (x, y) coordinates for each curve to accurately represent its shape.
    4. Link each curve to its correct metadata (name/level) found in the page table.
    5. Ensure x-values are on the logarithmic scale (mm) and y-values are linear percentages (0-100).
    6. Specifically find or interpolate/extrapolate the grain size at 10% passing (D10) and 60% passing (D60).
    7. Return the data in the specified JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "image/png",
            data: imageData.split(',')[1],
          },
        },
        { text: prompt },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              points: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER, description: "Grain size in mm" },
                    y: { type: Type.NUMBER, description: "Percent passing (0-100)" },
                  },
                  required: ["x", "y"],
                },
              },
              d10: { type: Type.NUMBER, description: "Grain size at 10% passing (mm)" },
              d60: { type: Type.NUMBER, description: "Grain size at 60% passing (mm)" },
              extrapolatedD10: { type: Type.BOOLEAN, description: "True if D10 was extrapolated" },
            },
            required: ["id", "name", "points", "d10", "d60", "extrapolatedD10"],
          },
        },
      },
    });

    if (!response.text) {
      throw new Error("No response from Gemini");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}
