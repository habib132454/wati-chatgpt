import axios from "axios";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const WATI_API_KEY = process.env.WATI_API_KEY!;
const WATI_API_URL = process.env.WATI_API_URL!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const body = req.body;
    const userMessage = body?.text?.trim();
    const userPhone = body?.waId;

    console.log("받은 메시지:", userMessage);
    console.log("전화번호:", userPhone);

    if (!userMessage || !userPhone) {
      return res.status(200).json({ message: "빈 메시지 또는 전화번호 없음" });
    }

    const gptRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
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

    const gptReply = gptRes.data.choices[0]?.message?.content?.trim() || "죄송합니다. 잠시 후 다시 시도해주세요.";
    console.log("GPT 응답:", gptReply);

    const watiRes = await axios.post(
      WATI_API_URL,
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

    console.log("WATI 응답:", watiRes.data);

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error("에러 발생:", error?.response?.data || error.message);

    if (req.body?.waId) {
      try {
        await axios.post(
          WATI_API_URL,
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
      } catch (watiErr: any) {
        console.error("WATI 전송 실패:", watiErr?.response?.data || watiErr.message);
      }
    }

    return res.status(500).json({ error: "서버 처리 중 에러" });
  }
}
