import axios from "axios";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const WATI_API_KEY = process.env.WATI_API_KEY!;

const openaiEndpoint = "https://api.openai.com/v1/chat/completions";
const watiEndpoint = "https://live-mt-server.wati.io/api/v1/sendSessionMessage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const body = req.body;
    const userMessage = body?.text?.trim();
    const userPhone = body?.waId;

    if (!userMessage || !userPhone) {
      return res.status(200).json({ message: "빈 메시지 또는 전화번호 없음" });
    }

    const gptRes = await axios.post(
      openaiEndpoint,
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: userMessage }]
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    const gptReply = gptRes.data.choices[0]?.message?.content?.trim();

    if (!gptReply) {
      throw new Error("GPT 응답 없음");
    }

    await axios.post(
      watiEndpoint,
      {
        messageText: gptReply,
        phone: userPhone
      },
      {
        headers: {
          Authorization: `Bearer ${WATI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error("에러 발생:", error?.response?.data || error.message);

    if (req.body?.waId) {
      await axios.post(
        watiEndpoint,
        {
          messageText: "⚠️ GPT 서버가 잠시 과부하 상태입니다. 잠시 후 다시 시도해주세요.",
          phone: req.body.waId
        },
        {
          headers: {
            Authorization: `Bearer ${WATI_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );
    }

    return res.status(500).json({ error: "서버 처리 중 에러" });
  }
}
