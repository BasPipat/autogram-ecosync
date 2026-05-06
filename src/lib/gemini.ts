import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function analyzeDriverDocuments(images: { buffer: Buffer; mimeType: string }[]) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
    Analyze the attached documents (Driver's License, ID Card, Vehicle Registration, etc.) and extract the following information for a logistics system.
    Return ONLY a JSON object with the following structure:
    {
      "driverFirstName": "string",
      "driverLastName": "string",
      "driverPhone": "string",
      "driverLicenseType": "string",
      "headPlateNumber": "string",
      "tailPlateNumber": "string",
      "compulsoryInsuranceExpiresAt": "YYYY-MM-DD",
      "vehicleInsuranceType": "string",
      "cargoInsuranceAmount": number,
      "bankName": "string",
      "bankAccountNumber": "string",
      "bankAccountName": "string"
    }
    
    Rules:
    - For vehicleInsuranceType, use one of: "ชั้น 1", "ชั้น 2+", "ชั้น 2", "ชั้น 3+", "ชั้น 3", "ไม่มีประกัน"
    - For driverLicenseType, use one of: "ท.1", "ท.2", "ท.3", "ท.4", "บ.1", "บ.2", "บ.3", "บ.4"
    - For bankName, use the bank name in Thai (e.g., กสิกรไทย, ไทยพาณิชย์, กรุงเทพ, กรุงไทย)
    - If any field is not found, use an empty string or 0 for numbers.
    - driverFirstName and driverLastName should be extracted from the ID card or license.
    - headPlateNumber is the main truck plate.
    - tailPlateNumber is the trailer plate (if available).
  `;

  const imageParts = images.map(img => ({
    inlineData: {
      data: img.buffer.toString('base64'),
      mimeType: img.mimeType,
    },
  }));

  const result = await model.generateContent([prompt, ...imageParts]);
  const response = await result.response;
  const text = response.text();
  
  // Extract JSON from the response text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  throw new Error('Could not parse AI response as JSON');
}
