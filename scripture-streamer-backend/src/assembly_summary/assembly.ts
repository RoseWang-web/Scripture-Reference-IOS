import axios from 'axios';
// import dotenv from 'dotenv';

// dotenv.config();

const API_KEY = "41cedf58d2ae47e2b2466d854f41472a";
const BASE_URL = "https://llm-gateway.assemblyai.com/v1/chat/completions"; // Base URL

export default async function summarizeText() {
  try{
    const prompt = "Provide a brief summary of the transcript.";
    const text="This is the placeholder for the paragraph.";
    const headers = {
            authorization: API_KEY,
            "content-type": "application/json",
          }
    const llm_gateway_data = {
      model: "claude-sonnet-4-5-20250929",
      messages: [
        { role: "user", content: `${prompt}\n\nTranscript: ${text}` },
      ],
      max_tokens: 1000,
  };
    const result = await axios.post(
      BASE_URL,
      llm_gateway_data,
      { headers }
    );
    // console.log(result.data.choices[0].message.content);
    // console.log(typeof result.data.choices[0].message.content);
    return(result.data.choices[0].message.content);

  } catch (error) {
    console.error("Error summarizing text:", error);
  }
}

// summarizeText();